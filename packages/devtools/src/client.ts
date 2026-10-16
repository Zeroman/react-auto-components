import { attachDemoClient } from "./demo-client.js";
import { createPageDriver } from "./page.js";
import { failure } from "./errors.js";
import { PREFIX, type PageCommand, type CommandResult } from "./protocol.js";

declare global {
  var __racPageId: string | undefined;
}

/** Largest result envelope the client will POST, in UTF-8 bytes; the server accepts up to 2 MiB. */
const RESULT_LIMIT = 512 * 1024;
const RESULT_PROBLEM_LIMIT = 2000;

/**
 * One bounded, cycle-safe console value. A SINGLE traversal with shared
 * state covers root values, Error causes and everything nested: depth ≤4,
 * a TOTAL budget of 50 nodes/property reads, ≤500 chars per string, ≤4000
 * chars of output. Cycles are tracked across the whole traversal (including
 * Error.cause). Property values are read lazily through for-in with the
 * budget checked per key — Object.entries is never called eagerly — and
 * hostile getters are caught. Can never throw.
 */
export function formatConsoleValue(value: unknown): string {
  const MAX_CHARS = 4000;
  const MAX_DEPTH = 4;
  const MAX_NODES = 50;
  const MAX_STRING = 500;
  const seen = new WeakSet<object>();
  let budget = MAX_NODES;
  const short = (text: string) =>
    text.length > MAX_STRING ? `${text.slice(0, MAX_STRING)}…` : text;
  const read = (object: object, key: PropertyKey): unknown => {
    try {
      return (object as Record<PropertyKey, unknown>)[key];
    } catch {
      return "[Getter threw]";
    }
  };
  const render = (item: unknown, depth: number): unknown => {
    if (budget <= 0) return "[Truncated]";
    budget--;
    if (typeof item === "string") return short(item);
    if (typeof item === "bigint") return short(`${item}n`);
    if (typeof item === "function") return "[Function]";
    if (item === null || typeof item !== "object") return item;
    if (seen.has(item)) return "[Circular]";
    if (depth >= MAX_DEPTH) return "[Truncated]";
    seen.add(item);
    if (Array.isArray(item)) {
      const list: unknown[] = [];
      for (let index = 0; index < item.length && budget > 0; index++)
        list.push(render(read(item, index), depth + 1));
      return list;
    }
    const node: Record<string, unknown> = Object.create(null);
    if (item instanceof Error) {
      for (const key of ["name", "message", "stack", "cause"]) {
        if (budget <= 0) break;
        const entry = read(item, key);
        node[key] = render(entry, depth + 1);
      }
    } else {
      // Do not eagerly read all values before slicing: getters may be costly.
      for (const key in item) {
        if (budget <= 0) break;
        if (!Object.hasOwn(item, key)) continue;
        node[short(key)] = render(read(item, key), depth + 1);
      }
    }
    return node;
  };
  try {
    const rendered = render(value, 0);
    if (value instanceof Error) {
      const error = rendered as Record<string, unknown>;
      const base = error.stack ?? `${error.name}: ${error.message}`;
      const cause =
        error.cause === undefined
          ? ""
          : ` [cause: ${JSON.stringify(error.cause)}]`;
      return `${base}${cause}`.slice(0, MAX_CHARS);
    }
    if (typeof rendered === "string") return rendered;
    return (JSON.stringify(rendered) ?? safeText(value)).slice(0, MAX_CHARS);
  } catch {
    return safeText(value).slice(0, MAX_CHARS);
  }
}

/** String() that cannot throw. */
function safeText(value: unknown): string {
  try {
    return String(value);
  } catch {
    return "[unprintable value]";
  }
}

/**
 * Guard before delivering a command result: an envelope over the UTF-8 byte
 * bound — success OR failure — is replaced by a small structured one instead
 * of tearing the page's connection down. The action already executed exactly
 * once and is never retried.
 */
export function limitResult(result: CommandResult): CommandResult {
  let bytes = 0;
  let serialized: string;
  try {
    // TextEncoder encodes UTF-8 in every runtime this client ships to.
    serialized = JSON.stringify(result);
    bytes = new TextEncoder().encode(serialized).length;
  } catch {
    return {
      id: result.id,
      ok: false,
      error: {
        code: "RAC-DEVTOOLS-RESULT",
        problem:
          "The command result could not be serialized as JSON; the action itself already ran.",
        fix: "Return JSON-compatible data without cycles or BigInt values, and inspect again before retrying a mutation.",
      },
    };
  }
  // Freeze the wire value so getters/toJSON are not executed again during
  // delivery or a transport retry. Only the bounded JSON is parsed.
  if (bytes <= RESULT_LIMIT) return JSON.parse(serialized) as CommandResult;
  if (result.ok)
    return {
      ...result,
      ok: false,
      data: undefined,
      error: {
        code: "RAC-DEVTOOLS-RESULT",
        problem: `The command result exceeded ${RESULT_LIMIT} UTF-8 bytes and was not delivered; the action itself already ran.`,
        fix: "Narrow the command output (fewer elements, a smaller eval return) and inspect again.",
      },
    };
  // Failing results keep their code and truncated raw problem/fix detail.
  const error = result.error;
  return {
    ...result,
    error: {
      code: (error?.code ?? "RAC-DEVTOOLS-RESULT").slice(
        0,
        RESULT_PROBLEM_LIMIT,
      ),
      problem: (error?.problem ?? "").slice(0, RESULT_PROBLEM_LIMIT),
      fix: (error?.fix ?? "Run rac inspect and use a supported action.").slice(
        0,
        RESULT_PROBLEM_LIMIT,
      ),
    },
  };
}
export async function start(config: {
  token: string;
  allowEval: boolean;
  demos?: boolean;
}) {
  const key = "rac:page-id";
  let stopped = false;
  let identity: { pageId: string; connectionId: string } | undefined;
  let detachDemo: (() => void) | undefined;
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
        .slice(0, 10)
        .map(formatConsoleValue)
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
    detachDemo?.();
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
    if (config.demos)
      detachDemo = attachDemoClient((body) =>
        request("demo", { ...body, ...identity }),
      );
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
      let result: CommandResult;
      try {
        const data =
          command.cmd === "console"
            ? logs.slice(-Math.min(Number(command.payload.limit ?? 30), 200))
            : await driver.execute(command.cmd, command.payload);
        result = { id: command.id, ok: true, data };
      } catch (error) {
        // The wire carries the raw problem detail; the server formats the
        // RacError message exactly once.
        const report = failure(error);
        result = {
          id: command.id,
          ok: false,
          error: {
            code: report.code,
            problem: report.problem,
            fix: report.fix,
          },
        };
      }
      // Verify serializability and bound the envelope — success or failure —
      // before delivery; the action itself is never repeated.
      result = limitResult(result);
      JSON.stringify(result);
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
