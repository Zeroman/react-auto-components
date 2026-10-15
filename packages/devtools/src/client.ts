import { createPageDriver } from "./page.js";
import { failure } from "./errors.js";
import { PREFIX, type PageCommand } from "./protocol.js";

declare global {
  var __racPageId: string | undefined;
}
export async function start(config: { token: string; allowEval: boolean }) {
  const key = "rac:page-id";
  let stopped = false;
  let identity: { pageId: string; connectionId: string } | undefined;
  const driver = createPageDriver(config.allowEval);
  const abort = new AbortController();
  const request = async (path: string, body: Record<string, unknown>) => {
    // Polling and result acknowledgments are safe to retry; actions themselves
    // are executed exactly once below. Authentication/disconnect errors stop.
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await fetch(`${PREFIX}/${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, token: config.token }),
          signal: abort.signal,
        });
        if (response.ok) return await response.json();
        if (
          response.status < 500 ||
          attempt >= 2 ||
          !["poll", "result"].includes(path)
        )
          throw Object.assign(new Error(`Bridge ${response.status}`), {
            terminal: true,
          });
      } catch (error) {
        if (
          stopped ||
          attempt >= 2 ||
          !["poll", "result"].includes(path) ||
          (error as { terminal?: boolean }).terminal
        )
          throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** attempt));
    }
  };
  let metadataTimer: ReturnType<typeof setInterval> | undefined;
  let lastMetadata = "";
  let metadataPending = false;
  const reportMetadata = () => {
    if (!identity || stopped || metadataPending) return;
    const title = document.title,
      url = location.href;
    const signature = JSON.stringify([title, url]);
    if (signature === lastMetadata) return;
    metadataPending = true;
    void request("metadata", { ...identity, title, url })
      .then(() => {
        lastMetadata = signature;
      })
      .catch(() => {
        /* the main poll controls connection recovery */
      })
      .finally(() => {
        metadataPending = false;
      });
  };
  window.addEventListener("hashchange", reportMetadata);
  window.addEventListener("popstate", reportMetadata);
  let previous: string | undefined;
  try {
    previous = sessionStorage.getItem(key) ?? undefined;
  } catch {
    /* storage may be disabled */
  }
  const reload =
    (
      performance.getEntriesByType("navigation")[0] as
        PerformanceNavigationTiming | undefined
    )?.type === "reload";
  const logs: { level: string; text: string; time: string }[] = [];
  function record(level: string, values: unknown[]) {
    logs.push({
      level,
      text: values
        .map((value) => {
          try {
            return typeof value === "string" ? value : JSON.stringify(value);
          } catch {
            return String(value);
          }
        })
        .join(" ")
        .slice(0, 4000),
      time: new Date().toISOString(),
    });
    if (logs.length > 200) logs.shift();
  }
  const warn = console.warn,
    error = console.error;
  const wrappedWarn = (...args: unknown[]) => {
    record("warn", args);
    warn.apply(console, args);
  };
  const wrappedError = (...args: unknown[]) => {
    record("error", args);
    error.apply(console, args);
  };
  console.warn = wrappedWarn;
  console.error = wrappedError;
  const onError = (event: ErrorEvent) => record("error", [event.message]);
  const onRejection = (event: PromiseRejectionEvent) =>
    record("error", [event.reason]);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  function stop() {
    if (stopped) return;
    stopped = true;
    if (identity)
      navigator.sendBeacon(
        `${PREFIX}/disconnect`,
        JSON.stringify({ ...identity, token: config.token }),
      );
    abort.abort();
    clearInterval(metadataTimer);
    window.removeEventListener("hashchange", reportMetadata);
    window.removeEventListener("popstate", reportMetadata);
    if (console.warn === wrappedWarn) console.warn = warn;
    if (console.error === wrappedError) console.error = error;
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  }
  window.addEventListener("pagehide", stop, { once: true });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) location.reload();
  });
  try {
    identity = await request("connect", {
      pageId: previous,
      reload,
      title: document.title,
      url: location.href,
    });
    globalThis.__racPageId = identity!.pageId;
    try {
      sessionStorage.setItem(key, identity!.pageId);
    } catch {
      /* best effort */
    }
    reportMetadata();
    // Also catches history.pushState and title changes without patching app APIs.
    // No request is sent unless metadata actually changed.
    metadataTimer = setInterval(reportMetadata, 1000);
    while (!stopped) {
      const command: PageCommand | null = await request("poll", {
        ...identity,
        title: document.title,
        url: location.href,
      });
      if (!command) continue;
      let result: Record<string, unknown>;
      try {
        const data =
          command.cmd === "console"
            ? logs.slice(-Math.min(Number(command.payload.limit ?? 30), 200))
            : await driver.execute(command.cmd, command.payload);
        result = { id: command.id, ok: true, data };
        // Verify serializability before delivery; do not repeat the action on failure.
        JSON.stringify(result);
      } catch (error) {
        result = { id: command.id, ok: false, error: failure(error) };
      }
      await request("result", { ...identity, result });
    }
  } catch (error) {
    if (!stopped)
      warn.call(
        console,
        "React Auto Components DevTools disconnected. Reload the page to reconnect.",
        String(error),
      );
  } finally {
    stop();
  }
}
