import { describe, expect, test, vi } from "vitest";
// Phase 1+2: PageRegistry contract tests. The devtools package ships its own
// RacError (packages/devtools/src/errors.ts) — assert that class, not the
// component library's, and keep structural code/name/Fix assertions alongside.
import { PageRegistry } from "../packages/devtools/src/registry";
import { RacError } from "../packages/devtools/src/errors";

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Asserts a sync throw is the DevTools RacError with a stable code and Fix line. */
function expectRacError(run: () => unknown, code: string) {
  let caught: unknown;
  try {
    run();
  } catch (err) {
    caught = err;
  }
  expect(caught).toBeInstanceOf(RacError);
  expect((caught as Error).name).toBe("RacError");
  expect((caught as RacError).code).toBe(code);
  expect((caught as Error).message).toContain("Fix:");
}

/** Expects an async rejection with the given stable code (attach immediately). */
function expectRacRejection(pending: Promise<unknown>, code: string) {
  return expect(pending).rejects.toMatchObject({
    name: "RacError",
    code,
    message: expect.stringContaining("Fix:"),
  });
}

describe("PageRegistry", () => {
  test("connect registers a ready page and list reports it", () => {
    const registry = new PageRegistry();
    const page = registry.connect({
      pageId: "p1",
      title: "Home",
      url: "http://localhost/",
    });
    expect(page.pageId).toBe("p1");
    expect(typeof page.connectionId).toBe("string");
    expect(registry.list()).toEqual([
      {
        pageId: "p1",
        connectionId: page.connectionId,
        title: "Home",
        url: "http://localhost/",
        status: "ready",
      },
    ]);
  });

  test("constructor options are optional", () => {
    expect(() => new PageRegistry()).not.toThrow();
    expect(
      () => new PageRegistry({ timeoutMs: 200, staleMs: 5000 }),
    ).not.toThrow();
  });

  test("duplicate connect without reload opens a new page", () => {
    const registry = new PageRegistry();
    const first = registry.connect({ title: "A", url: "http://a" });
    const second = registry.connect({ title: "A", url: "http://a" });
    expect(second.pageId).not.toBe(first.pageId);
    expect(second.connectionId).not.toBe(first.connectionId);
    expect(registry.list()).toHaveLength(2);
    expect(registry.list().every((page) => page.status === "ready")).toBe(true);
  });

  test("reload reuses the pageId under a new connection", () => {
    const registry = new PageRegistry();
    const first = registry.connect({
      pageId: "p1",
      title: "A",
      url: "http://a",
    });
    const second = registry.connect({
      pageId: "p1",
      reload: true,
      title: "A",
      url: "http://a",
    });
    expect(second.pageId).toBe("p1");
    expect(second.connectionId).not.toBe(first.connectionId);
    expect(registry.list()).toHaveLength(1);
    expect(registry.list()[0].status).toBe("ready");
  });

  test("reload drops pending commands from the old connection", async () => {
    // Small staleMs keeps idle long polls short so null checks resolve fast.
    const registry = new PageRegistry({ timeoutMs: 500, staleMs: 200 });
    const first = registry.connect({
      pageId: "p1",
      title: "A",
      url: "http://a",
    });
    const stale = registry.command("p1", "fill", { ref: "r1", value: "x" });
    // Attach the rejection expectation before the reload so the dropped
    // command never becomes an unhandled rejection.
    const staleSettled = expect(stale).rejects.toThrow();

    const second = registry.connect({
      pageId: "p1",
      reload: true,
      title: "A",
      url: "http://a",
    });

    // A poll on the replaced connection throws by design; the new connection
    // must not see the dropped command either.
    expectRacError(
      () => registry.poll("p1", first.connectionId),
      "RAC-PAGE-DISCONNECTED",
    );
    expect(await registry.poll("p1", second.connectionId)).toBeNull();
    await staleSettled;

    // The registry stays healthy: new commands flow to the new connection.
    const fresh = registry.command("p1", "click", { ref: "r2" });
    const delivered = await registry.poll("p1", second.connectionId);
    expect(delivered?.cmd).toBe("click");
    await registry.result("p1", second.connectionId, {
      id: delivered!.id,
      ok: true,
      data: "done",
    });
    await expect(fresh).resolves.toBe("done");
  });

  test("a parked long poll wakes when a command arrives", async () => {
    const registry = new PageRegistry();
    const page = registry.connect({ pageId: "p1", title: "A", url: "http://a" });
    const parked = registry.poll("p1", page.connectionId);
    const pending = registry.command("p1", "click", { ref: "r1" });
    const delivered = await parked;
    expect(delivered?.cmd).toBe("click");
    await registry.result("p1", page.connectionId, {
      id: delivered!.id,
      ok: true,
    });
    await expect(pending).resolves.toBeUndefined();
  });

  test("an idle long poll resolves null after its deadline", async () => {
    vi.useFakeTimers();
    try {
      const registry = new PageRegistry();
      const page = registry.connect({
        pageId: "p1",
        title: "A",
        url: "http://a",
      });
      let settled: PageCommandError | null | undefined;
      const parked = registry
        .poll("p1", page.connectionId)
        .then((value) => {
          settled = value;
        });
      await vi.advanceTimersByTimeAsync(20000);
      await parked;
      expect(settled).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  test("stale pages go offline once staleMs has passed without activity", () => {
    vi.useFakeTimers();
    try {
      const registry = new PageRegistry({ staleMs: 5000 });
      registry.connect({ pageId: "p1", title: "A", url: "http://a" });
      expect(registry.list()[0].status).toBe("ready");
      vi.advanceTimersByTime(6000);
      expect(registry.list()[0].status).toBe("offline");
      expectRacError(() => registry.select(), "RAC-PAGE-NONE");
    } finally {
      vi.useRealTimers();
    }
  });

  test("disconnect takes the page offline only for the current connection", () => {
    const registry = new PageRegistry();
    const page = registry.connect({ pageId: "p1", title: "A", url: "http://a" });

    // A stale connectionId (already replaced or never issued) changes nothing.
    registry.disconnect("p1", "not-the-current-connection");
    expect(registry.list().find((p) => p.pageId === "p1")?.status).toBe(
      "ready",
    );

    registry.disconnect("p1", page.connectionId);
    expect(registry.list().find((p) => p.pageId === "p1")?.status).toBe(
      "offline",
    );
  });

  test("select returns the single ready page", () => {
    const registry = new PageRegistry();
    registry.connect({ pageId: "p1", title: "A", url: "http://a" });
    expect(registry.select().pageId).toBe("p1");
    expect(registry.select("p1").pageId).toBe("p1");
  });

  test("select throws RAC-PAGE-NONE when nothing is ready", () => {
    const registry = new PageRegistry();
    expectRacError(() => registry.select(), "RAC-PAGE-NONE");

    registry.connect({ pageId: "p1", title: "A", url: "http://a" });
    registry.disconnect("p1", registry.list()[0].connectionId);
    expectRacError(() => registry.select(), "RAC-PAGE-NONE");
  });

  test("select throws RAC-PAGE-SELECTION with several ready pages", () => {
    const registry = new PageRegistry();
    registry.connect({ pageId: "p1", title: "A", url: "http://a" });
    registry.connect({ pageId: "p2", title: "B", url: "http://b" });
    // No most-recent fallback: the caller must name a page.
    expectRacError(() => registry.select(), "RAC-PAGE-SELECTION");
    expect(registry.select("p2").pageId).toBe("p2");
  });

  test("select throws RAC-PAGE-DISCONNECTED for unknown or offline pages", () => {
    const registry = new PageRegistry();
    registry.connect({ pageId: "p1", title: "A", url: "http://a" });
    expectRacError(() => registry.select("missing"), "RAC-PAGE-DISCONNECTED");

    registry.disconnect("p1", registry.list()[0].connectionId);
    expectRacError(() => registry.select("p1"), "RAC-PAGE-DISCONNECTED");
  });

  test("select skips offline pages when exactly one stays ready", () => {
    const registry = new PageRegistry();
    registry.connect({ pageId: "p1", title: "A", url: "http://a" });
    registry.connect({ pageId: "p2", title: "B", url: "http://b" });
    registry.disconnect("p1", registry.list()[0].connectionId);
    expect(registry.select().pageId).toBe("p2");
  });

  test("command round trips through poll and result", async () => {
    const registry = new PageRegistry();
    const page = registry.connect({ pageId: "p1", title: "A", url: "http://a" });
    const pending = registry.command("p1", "click", { ref: "r1" });

    const delivered = await registry.poll("p1", page.connectionId);
    expect(delivered?.cmd).toBe("click");
    expect(delivered?.payload).toEqual({ ref: "r1" });
    expect(typeof delivered?.id).toBe("string");

    await registry.result("p1", page.connectionId, {
      id: delivered!.id,
      ok: true,
      data: { clicked: true },
    });
    await expect(pending).resolves.toEqual({ clicked: true });
  });

  test("live pages are isolated: commands and results stay on their target", async () => {
    const registry = new PageRegistry();
    const a = registry.connect({ pageId: "a", title: "A", url: "http://a" });
    const b = registry.connect({ pageId: "b", title: "B", url: "http://b" });
    const parkedB = registry.poll("b", b.connectionId);

    // A's command wakes only A's poll; B's parked poll stays parked.
    const pending = registry.command("a", "click", { ref: "r1" });
    const deliveredA = (await registry.poll("a", a.connectionId))!;
    let bState: "parked" | "woken" = "parked";
    parkedB.then(() => {
      bState = "woken";
    });
    await sleep(20);
    expect(deliveredA.cmd).toBe("click");
    expect(bState).toBe("parked");

    // A result aimed at B (wrong page) or at A's command but B's connection
    // must not settle A's caller.
    await registry.result("b", b.connectionId, {
      id: deliveredA.id,
      ok: true,
      data: "wrong-page",
    });
    await registry.result("a", b.connectionId, {
      id: deliveredA.id,
      ok: true,
      data: "wrong-connection",
    });
    let value: unknown = "pending";
    pending.then((v) => {
      value = v;
    });
    await sleep(20);
    expect(value).toBe("pending");

    await registry.result("a", a.connectionId, {
      id: deliveredA.id,
      ok: true,
      data: 42,
    });
    await expect(pending).resolves.toBe(42);
    parkedB.then(() => {}, () => {});
  });

  test("a failed result rejects the command promise", async () => {
    const registry = new PageRegistry();
    const page = registry.connect({ pageId: "p1", title: "A", url: "http://a" });
    const pending = registry.command("p1", "validate", {});
    const delivered = await registry.poll("p1", page.connectionId);
    await registry.result("p1", page.connectionId, {
      id: delivered!.id,
      ok: false,
      error: { code: "E_TEST", message: "boom" },
    });
    await expect(pending).rejects.toThrow();
  });

  test("a late result after a timeout is ignored and never executes", async () => {
    const registry = new PageRegistry({ timeoutMs: 30, staleMs: 200 });
    const page = registry.connect({ pageId: "p1", title: "A", url: "http://a" });

    // "click" is queued and delivered to this poll; "fill" stays queued
    // undelivered. Attach both rejection expectations before the timeouts fire
    // so neither caller can become an unhandled rejection.
    const delivered = registry.command("p1", "click", { ref: "r1" });
    const note = registry.poll("p1", page.connectionId);
    const undelivered = registry.command("p1", "fill", { ref: "r2" });
    const deliveredSettled = expect(delivered).rejects.toThrow();
    const undeliveredSettled = expect(undelivered).rejects.toThrow();

    await Promise.all([deliveredSettled, undeliveredSettled]);
    // Both timeouts removed their commands: the queue is empty.
    expect(await registry.poll("p1", page.connectionId)).toBeNull();

    // Late results for both forgotten commands are no-ops: no resolution, no
    // unhandled rejection, and the registry keeps serving new commands.
    await registry.result("p1", page.connectionId, {
      id: (await note)!.id,
      ok: true,
      data: "late",
    });
    await registry.result("p1", page.connectionId, {
      id: "never-issued",
      ok: true,
      data: "unknown",
    });
    const next = registry.command("p1", "dom", { ref: "r3" });
    const fresh = await registry.poll("p1", page.connectionId);
    expect(fresh?.cmd).toBe("dom");
    await registry.result("p1", page.connectionId, {
      id: fresh!.id,
      ok: true,
      data: "ok",
    });
    await expect(next).resolves.toBe("ok");
  });

  test("timeout rejects an undelivered command and clears it from the queue", async () => {
    // Small staleMs keeps idle long polls short so null checks resolve fast.
    const registry = new PageRegistry({ timeoutMs: 30, staleMs: 200 });
    const page = registry.connect({ pageId: "p1", title: "A", url: "http://a" });
    await expect(
      registry.command("p1", "click", { ref: "r1" }),
    ).rejects.toThrow();
    expect(await registry.poll("p1", page.connectionId)).toBeNull();

    // The registry stays healthy afterwards.
    const next = registry.command("p1", "click", { ref: "r2" }, 500);
    const delivered = await registry.poll("p1", page.connectionId);
    expect(delivered?.payload).toEqual({ ref: "r2" });
    await registry.result("p1", page.connectionId, {
      id: delivered!.id,
      ok: true,
    });
    await expect(next).resolves.toBeUndefined();
  });

  test("dispose rejects pending commands and finishes polls", async () => {
    const registry = new PageRegistry();
    // A poll drains the queue, so the two states live on different pages:
    // "a" holds an undelivered command, "b" holds a parked long poll.
    const b = registry.connect({ pageId: "b", title: "B", url: "http://b" });
    registry.connect({ pageId: "a", title: "A", url: "http://a" });
    const pending = registry.command("a", "click", { ref: "r1" });
    const waiting = registry.poll("b", b.connectionId);
    // Attach expectations before dispose so rejections are never unhandled.
    const pendingSettled = expect(pending).rejects.toThrow();
    registry.dispose();
    await pendingSettled;
    await expect(waiting).resolves.toBeNull();
    // A disposed registry refuses new pages with the disconnected contract.
    expectRacError(
      () => registry.connect({ title: "C", url: "http://c" }),
      "RAC-PAGE-DISCONNECTED",
    );
  });
});

/** Local shape so the fake-timer test can type the settled poll value. */
type PageCommandError = { cmd: string } | null;
