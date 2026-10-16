import { randomUUID } from "node:crypto";
import { RacError } from "./errors.js";
import type { PageInfo, PageCommand, CommandResult } from "./protocol.js";

type Entry = PageInfo & {
  lastSeen: number;
  queue: PageCommand[];
  poll?: {
    resolve: (command: PageCommand | null) => void;
    timer: ReturnType<typeof setTimeout>;
  };
};
type Pending = {
  pageId: string;
  connectionId: string;
  resolve: (data: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};
const disconnected = () =>
  new RacError(
    "RAC-PAGE-DISCONNECTED",
    "The selected page is disconnected or reloading.",
    "Run rac inspect and explicitly select a ready page. Do not automatically retry a mutation.",
  );

export class PageRegistry {
  private pages = new Map<string, Entry>();
  private pending = new Map<string, Pending>();
  private timeoutMs: number;
  private staleMs: number;
  private closed = false;
  constructor(options: { timeoutMs?: number; staleMs?: number } = {}) {
    this.timeoutMs = options.timeoutMs ?? 10000;
    this.staleMs = options.staleMs ?? 30000;
  }
  connect(input: {
    pageId?: string;
    reload?: boolean;
    title: string;
    url: string;
  }) {
    if (this.closed) throw disconnected();
    const previous = input.pageId ? this.pages.get(input.pageId) : undefined;
    const pageId =
      previous && input.reload
        ? previous.pageId
        : !previous && input.pageId
          ? input.pageId
          : `p_${randomUUID()}`;
    if (previous && input.reload)
      this.disconnect(previous.pageId, previous.connectionId);
    const entry: Entry = {
      pageId,
      connectionId: randomUUID(),
      title: input.title.slice(0, 300),
      url: input.url.slice(0, 4000),
      status: "ready",
      lastSeen: Date.now(),
      queue: [],
    };
    this.pages.set(pageId, entry);
    // Keep a bounded number of tombstones without forgetting live pages.
    if (this.pages.size > 200) {
      for (const [id, page] of this.pages) {
        if (this.pages.size <= 200) break;
        if (page.status === "offline") this.pages.delete(id);
      }
    }
    return { pageId, connectionId: entry.connectionId };
  }
  list(): PageInfo[] {
    for (const entry of this.pages.values()) {
      if (
        entry.status === "ready" &&
        Date.now() - entry.lastSeen > this.staleMs
      )
        this.disconnect(entry.pageId, entry.connectionId);
    }
    return [...this.pages.values()].map(
      ({ pageId, connectionId, title, url, status }) => ({
        pageId,
        connectionId,
        title,
        url,
        status,
      }),
    );
  }
  select(pageId?: string): PageInfo {
    const pages = this.list();
    if (pageId) {
      const selected = pages.find(
        (p) => p.pageId === pageId && p.status === "ready",
      );
      if (!selected) throw disconnected();
      return selected;
    }
    const ready = pages.filter((p) => p.status === "ready");
    if (!ready.length)
      throw new RacError(
        "RAC-PAGE-NONE",
        "No development page is connected.",
        "Open the development app in your browser or run rac open.",
      );
    if (ready.length > 1)
      throw new RacError(
        "RAC-PAGE-SELECTION",
        "Several pages are connected.",
        "Run rac inspect and pass --page <pageId> on every command.",
      );
    return ready[0];
  }
  private current(pageId: string, connectionId: string) {
    const page = this.pages.get(pageId);
    if (!page || page.connectionId !== connectionId || page.status !== "ready")
      throw disconnected();
    page.lastSeen = Date.now();
    return page;
  }
  update(
    pageId: string,
    connectionId: string,
    info: { title?: string; url?: string },
  ) {
    const page = this.current(pageId, connectionId);
    if (typeof info.title === "string") page.title = info.title.slice(0, 300);
    if (typeof info.url === "string") page.url = info.url.slice(0, 4000);
  }
  command(
    pageId: string,
    cmd: string,
    payload: Record<string, unknown> = {},
    timeoutMs = this.timeoutMs,
  ): Promise<unknown> {
    const selected = this.select(pageId);
    const page = this.pages.get(selected.pageId)!;
    const id = randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        page.queue = page.queue.filter((command) => command.id !== id);
        reject(
          new RacError(
            "RAC-DEVTOOLS-TIMEOUT",
            `Command "${cmd}" timed out; an already delivered action may have executed.`,
            "Inspect the selected page before retrying. Use an explicit wait for asynchronous UI changes.",
          ),
        );
      }, timeoutMs);
      this.pending.set(id, {
        pageId: page.pageId,
        connectionId: page.connectionId,
        resolve,
        reject,
        timer,
      });
      const command = { id, cmd, payload };
      if (page.poll) {
        clearTimeout(page.poll.timer);
        const poll = page.poll;
        page.poll = undefined;
        poll.resolve(command);
      } else page.queue.push(command);
    });
  }
  poll(pageId: string, connectionId: string): Promise<PageCommand | null> {
    return this.beginPoll(pageId, connectionId).promise;
  }
  /**
   * Park a long poll for this connection. The returned `cancel` is bound to
   * THIS waiter alone: when the HTTP response is torn down, only the identical
   * waiter is freed — an older response closing after a newer poll parked (or
   * after the waiter already resolved) must not disturb the current waiter.
   * Cancellation never touches the page lease: commands stay queued for the
   * client's retry poll, so a transient abort neither drops nor replays work
   * and never marks the page offline.
   */
  beginPoll(
    pageId: string,
    connectionId: string,
  ): {
    promise: Promise<PageCommand | null>;
    cancel: () => void;
  } {
    const page = this.current(pageId, connectionId);
    if (page.poll) {
      clearTimeout(page.poll.timer);
      page.poll.resolve(null);
      page.poll = undefined;
    }
    const queued = page.queue.shift();
    if (queued) return { promise: Promise.resolve(queued), cancel: () => {} };
    const waiter: NonNullable<Entry["poll"]> = {} as never;
    waiter.resolve = () => {};
    waiter.timer = setTimeout(
      () => {
        if (page.poll === waiter) page.poll = undefined;
        waiter.resolve(null);
      },
      Math.min(20000, this.staleMs / 2),
    );
    const promise = new Promise<PageCommand | null>((resolve) => {
      waiter.resolve = (value) => {
        clearTimeout(waiter.timer);
        resolve(value);
      };
      page.poll = waiter;
    });
    return {
      promise,
      cancel: () => {
        if (page.poll !== waiter || page.connectionId !== connectionId) return;
        page.poll = undefined;
        waiter.resolve(null);
      },
    };
  }
  result(pageId: string, connectionId: string, result: CommandResult) {
    const entry = this.pending.get(result.id);
    if (
      !entry ||
      entry.pageId !== pageId ||
      entry.connectionId !== connectionId
    )
      return;
    this.current(pageId, connectionId);
    clearTimeout(entry.timer);
    this.pending.delete(result.id);
    if (result.ok) entry.resolve(result.data);
    else
      entry.reject(
        new RacError(
          result.error?.code ?? "RAC-DEVTOOLS-COMMAND",
          // The page reports the raw problem detail; constructing the RacError
          // here adds the header/Fix/Code/Docs framing exactly once.
          result.error?.problem ??
            result.error?.message ??
            "The page rejected the command.",
          result.error?.fix ?? "Run rac inspect and use a supported action.",
        ),
      );
  }
  disconnect(pageId: string, connectionId: string) {
    const page = this.pages.get(pageId);
    if (!page || page.connectionId !== connectionId) return;
    page.status = "offline";
    page.queue = [];
    if (page.poll) {
      clearTimeout(page.poll.timer);
      page.poll.resolve(null);
      page.poll = undefined;
    }
    for (const [id, entry] of this.pending)
      if (entry.pageId === pageId && entry.connectionId === connectionId) {
        clearTimeout(entry.timer);
        this.pending.delete(id);
        entry.reject(disconnected());
      }
  }
  dispose() {
    this.closed = true;
    for (const page of this.pages.values())
      this.disconnect(page.pageId, page.connectionId);
  }
}
