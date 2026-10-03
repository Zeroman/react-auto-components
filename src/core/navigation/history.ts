import { pathsEqual } from "./path";
import type { AutoHistoryAdapter, AutoLocation, AutoNavigation } from "./types";

/** Compare two AutoLocations for path and parameter equality. */
export function locationsEqual(a: AutoLocation, b: AutoLocation): boolean {
  if (!pathsEqual(a.path, b.path)) return false;
  const aParams = a.params ?? {};
  const bParams = b.params ?? {};
  const aKeys = Object.keys(aParams).filter((k) => aParams[k] !== undefined);
  const bKeys = Object.keys(bParams).filter((k) => bParams[k] !== undefined);
  if (aKeys.length !== bKeys.length) return false;
  aKeys.sort();
  bKeys.sort();
  for (let i = 0; i < aKeys.length; i++) {
    const k = aKeys[i];
    if (k !== bKeys[i] || aParams[k] !== bParams[k]) return false;
  }
  return true;
}

/** URL segment separator. Hash URLs default to `":"`; browser URLs use `"/"`. */
export type AutoPathSeparator = ":" | "/";

/** Encode path segments so individual segment characters like ':' or '/' or '?' are escaped safely. */
export function encodePathSegments(
  segments: readonly string[],
  separator: AutoPathSeparator = ":",
): string {
  return segments.map((s) => encodeURIComponent(s)).join(separator);
}

/**
 * Decode path segments. Both ':' and '/' separate segments; a literal one
 * inside a segment arrives percent-encoded.
 */
export function decodePathSegments(raw: string): string[] {
  return raw
    .split(/[:/]/)
    .filter((part) => part.length > 0)
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    });
}

/** Encode an AutoLocation to a URL string with deterministic query parameter ordering. */
export function encodeLocation(
  location: AutoLocation,
  prefix = "",
  separator: AutoPathSeparator = ":",
): string {
  const pathPart = encodePathSegments(location.path, separator);
  const search = new URLSearchParams();
  if (location.params) {
    const keys = Object.keys(location.params).sort();
    for (const key of keys) {
      const val = location.params[key];
      if (val !== undefined) {
        search.set(key, val);
      }
    }
  }
  const query = search.toString();
  const base = prefix
    ? prefix.endsWith("/")
      ? prefix.slice(0, -1)
      : prefix
    : "";
  const sep = base ? "/" : "";
  return `${base}${sep}${pathPart}${query ? `?${query}` : ""}`;
}

/**
 * Decode an AutoLocation from a URL string or hash string.
 * With a `prefix`, only `prefix` itself or `prefix/...` matches; any other URL
 * (`/admin` vs `/administrator`) is outside this navigation and decodes as empty.
 */
export function decodeLocation(urlOrHash: string, prefix = ""): AutoLocation {
  let raw = urlOrHash.replace(/^#/, "");
  if (raw.startsWith("/")) raw = raw.slice(1);
  const cleanPrefix = prefix.replace(/^\/+|\/+$/g, "");
  if (cleanPrefix) {
    const queryAt = raw.indexOf("?");
    const pathOnly = queryAt < 0 ? raw : raw.slice(0, queryAt);
    if (pathOnly === cleanPrefix) raw = raw.slice(cleanPrefix.length);
    else if (pathOnly.startsWith(`${cleanPrefix}/`))
      raw = raw.slice(cleanPrefix.length + 1);
    else return { path: [], params: {} };
  }
  if (!raw) return { path: [], params: {} };
  const queryAt = raw.indexOf("?");
  const pathPart = queryAt < 0 ? raw : raw.slice(0, queryAt);
  const queryPart = queryAt < 0 ? "" : raw.slice(queryAt + 1);
  const path = decodePathSegments(pathPart);
  const params: Record<string, string> = {};
  if (queryPart) {
    const search = new URLSearchParams(queryPart);
    search.forEach((value, key) => {
      params[key] = value;
    });
  }
  return { path, params };
}

/** Interface for memory history with navigation testing helpers. */
export interface MemoryHistoryAdapter extends AutoHistoryAdapter {
  back(): void;
  forward(): void;
  go(delta: number): void;
  getEntries(): readonly AutoLocation[];
  getIndex(): number;
}

/** Create an in-memory history adapter suitable for Node, tests and non-browser environments. */
export function createMemoryHistory(
  initialLocation?: AutoLocation,
): MemoryHistoryAdapter {
  const entries: AutoLocation[] = [
    initialLocation
      ? {
          path: [...initialLocation.path],
          params: { ...(initialLocation.params ?? {}) },
        }
      : { path: [], params: {} },
  ];
  let index = 0;
  const listeners = new Set<(location: AutoLocation) => void>();

  function notify() {
    const current = entries[index];
    const clone: AutoLocation = {
      path: [...current.path],
      params: { ...(current.params ?? {}) },
    };
    for (const listener of Array.from(listeners)) {
      try {
        listener(clone);
      } catch (err) {
        console.error(err);
      }
    }
  }

  return {
    read(): AutoLocation {
      const current = entries[index];
      return { path: [...current.path], params: { ...(current.params ?? {}) } };
    },
    push(location: AutoLocation): void {
      const next: AutoLocation = {
        path: [...location.path],
        params: { ...(location.params ?? {}) },
      };
      entries.splice(index + 1);
      entries.push(next);
      index = entries.length - 1;
      notify();
    },
    replace(location: AutoLocation): void {
      const next: AutoLocation = {
        path: [...location.path],
        params: { ...(location.params ?? {}) },
      };
      entries[index] = next;
      notify();
    },
    subscribe(onChange: (location: AutoLocation) => void): () => void {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    back(): void {
      if (index > 0) {
        index--;
        notify();
      }
    },
    forward(): void {
      if (index < entries.length - 1) {
        index++;
        notify();
      }
    },
    go(delta: number): void {
      const next = index + delta;
      if (next >= 0 && next < entries.length) {
        index = next;
        notify();
      }
    },
    getEntries(): readonly AutoLocation[] {
      return [...entries];
    },
    getIndex(): number {
      return index;
    },
  };
}

/** Create a browser Hash history adapter. */
export function createHashHistory(options?: {
  basePath?: string;
}): AutoHistoryAdapter {
  const basePath = options?.basePath ?? "";

  function parseCurrentHash(): AutoLocation {
    if (typeof window === "undefined" || !window.location) {
      return { path: [], params: {} };
    }
    const raw = window.location.hash.replace(/^#\/?/, "");
    return decodeLocation(raw, basePath);
  }

  function serializeHash(location: AutoLocation): string {
    const encoded = encodeLocation(location, basePath);
    return encoded ? `#/${encoded}` : "";
  }

  let currentBaseline = parseCurrentHash();
  const listeners = new Set<(location: AutoLocation) => void>();
  let listeningWindow = false;

  function handleWindowChange() {
    const nextLoc = parseCurrentHash();
    if (locationsEqual(nextLoc, currentBaseline)) return;
    currentBaseline = nextLoc;
    for (const listener of Array.from(listeners)) {
      listener(nextLoc);
    }
  }

  function ensureWindowListener() {
    if (listeningWindow || typeof window === "undefined") return;
    currentBaseline = parseCurrentHash();
    window.addEventListener("hashchange", handleWindowChange);
    window.addEventListener("popstate", handleWindowChange);
    listeningWindow = true;
  }

  function cleanupWindowListener() {
    if (!listeningWindow || listeners.size > 0 || typeof window === "undefined")
      return;
    window.removeEventListener("hashchange", handleWindowChange);
    window.removeEventListener("popstate", handleWindowChange);
    listeningWindow = false;
  }

  return {
    read(): AutoLocation {
      return parseCurrentHash();
    },
    push(location: AutoLocation): void {
      if (typeof window === "undefined") return;
      const targetHash = serializeHash(location);
      if (window.history && typeof window.history.pushState === "function") {
        window.history.pushState(
          null,
          "",
          targetHash || window.location.pathname + window.location.search,
        );
      } else {
        window.location.hash = targetHash;
      }
      currentBaseline = parseCurrentHash();
    },
    replace(location: AutoLocation): void {
      if (typeof window === "undefined") return;
      const targetHash = serializeHash(location);
      if (window.history && typeof window.history.replaceState === "function") {
        window.history.replaceState(
          null,
          "",
          targetHash || window.location.pathname + window.location.search,
        );
      } else {
        window.location.replace(targetHash || "#");
      }
      currentBaseline = parseCurrentHash();
    },
    subscribe(onChange: (location: AutoLocation) => void): () => void {
      listeners.add(onChange);
      ensureWindowListener();
      return () => {
        listeners.delete(onChange);
        cleanupWindowListener();
      };
    },
  };
}

/** Create a browser HTML5 History API adapter. */
export function createBrowserHistory(options?: {
  basePath?: string;
}): AutoHistoryAdapter {
  const basePath = options?.basePath ?? "";

  function parseCurrentUrl(): AutoLocation {
    if (typeof window === "undefined" || !window.location) {
      return { path: [], params: {} };
    }
    const raw = window.location.pathname + window.location.search;
    return decodeLocation(raw, basePath);
  }

  function serializeUrl(location: AutoLocation): string {
    const encoded = encodeLocation(location, basePath, "/");
    return encoded ? `/${encoded.replace(/^\/+/, "")}` : "/";
  }

  let currentBaseline = parseCurrentUrl();
  const listeners = new Set<(location: AutoLocation) => void>();
  let listeningWindow = false;

  function handleWindowChange() {
    const nextLoc = parseCurrentUrl();
    if (locationsEqual(nextLoc, currentBaseline)) return;
    currentBaseline = nextLoc;
    for (const listener of Array.from(listeners)) {
      listener(nextLoc);
    }
  }

  function ensureWindowListener() {
    if (listeningWindow || typeof window === "undefined") return;
    currentBaseline = parseCurrentUrl();
    window.addEventListener("popstate", handleWindowChange);
    listeningWindow = true;
  }

  function cleanupWindowListener() {
    if (!listeningWindow || listeners.size > 0 || typeof window === "undefined")
      return;
    window.removeEventListener("popstate", handleWindowChange);
    listeningWindow = false;
  }

  return {
    read(): AutoLocation {
      return parseCurrentUrl();
    },
    push(location: AutoLocation): void {
      if (typeof window === "undefined") return;
      const targetUrl = serializeUrl(location);
      if (window.history && typeof window.history.pushState === "function") {
        window.history.pushState(null, "", targetUrl);
      }
      currentBaseline = parseCurrentUrl();
    },
    replace(location: AutoLocation): void {
      if (typeof window === "undefined") return;
      const targetUrl = serializeUrl(location);
      if (window.history && typeof window.history.replaceState === "function") {
        window.history.replaceState(null, "", targetUrl);
      }
      currentBaseline = parseCurrentUrl();
    },
    subscribe(onChange: (location: AutoLocation) => void): () => void {
      listeners.add(onChange);
      ensureWindowListener();
      return () => {
        listeners.delete(onChange);
        cleanupWindowListener();
      };
    },
  };
}

const VOID_WRITE_TIMEOUT_MS = 2000;

/**
 * Universal history synchronization bridge.
 * Connects an AutoNavigation instance to any AutoHistoryAdapter (Hash, Browser, Memory, or Router adapter).
 *
 * Guarantees:
 * - Only committed transitions and final reconcile corrections trigger history writes (no intermediate lazy snapshots).
 * - Navigations originating from history use `source: 'history'` and are never reflected back into the adapter.
 * - History input failures (forbidden/not-found) trigger replace-correction to valid current navigation path.
 * - Compares with `adapter.read()` before writing, skipping redundant writes.
 * - Unsubscribing cleanly detaches all listeners and ignores any pending asynchronous resolutions.
 */
export function syncHistory(
  navigation: AutoNavigation,
  adapter: AutoHistoryAdapter,
): () => void {
  let detached = false;
  type Write = {
    location: AutoLocation;
    replace: boolean;
    waiting: boolean;
    observed: boolean;
    superseded: boolean;
    timer?: ReturnType<typeof setTimeout>;
  };
  const writes: Write[] = [];
  const releasedWrites: AutoLocation[] = [];
  let inFlight: Write | undefined;
  let observedLocation = adapter.read();
  let intendedLocation = observedLocation;
  let observedWrite = false;

  const committed = (): AutoLocation =>
    navigation.getCommittedLocation
      ? navigation.getCommittedLocation()
      : {
          path: navigation.getState().path,
          params: navigation.getState().params,
        };

  // `expectEcho`: the adapter reported completion (or the wait timed out)
  // before read() caught up, so a later notification of this location is
  // still this write rather than a new navigation.
  function finishWrite(write: Write, expectEcho = false) {
    if (inFlight !== write) return;
    clearTimeout(write.timer);
    if (
      (expectEcho && !write.superseded) ||
      locationsEqual(adapter.read(), write.location)
    ) {
      observedLocation = write.location;
      observedWrite = true;
    }
    inFlight = undefined;
    flushWrites();
  }

  function flushWrites() {
    if (detached || inFlight) return;
    const write = writes.shift();
    if (!write) return;
    // Read only when earlier writes have completed. Otherwise returning to the
    // old URL could be dropped while an earlier push is still on its way.
    if (locationsEqual(adapter.read(), write.location)) {
      flushWrites();
      return;
    }
    inFlight = write;
    try {
      const result = write.replace
        ? adapter.replace(write.location)
        : adapter.push(write.location);
      if (result && typeof result.then === "function") {
        void result.then(
          () => finishWrite(write, true),
          (error) => {
            if (!detached) console.error(error);
            finishWrite(write);
          },
        );
      } else {
        write.waiting = false;
        // Void adapters may update the URL immediately, or acknowledge later
        // through subscribe (e.g. a router whose push API returns void). A
        // blocked navigation never acknowledges, so stop waiting eventually.
        if (
          write.observed ||
          write.superseded ||
          locationsEqual(adapter.read(), write.location)
        ) {
          finishWrite(write);
        } else {
          write.timer = setTimeout(
            () => finishWrite(write, true),
            VOID_WRITE_TIMEOUT_MS,
          );
        }
      }
    } catch (error) {
      if (!detached) console.error(error);
      finishWrite(write);
    }
  }

  function writeLocation(location: AutoLocation, replace: boolean) {
    intendedLocation = location;
    writes.push({
      location: { path: [...location.path], params: { ...location.params } },
      replace,
      waiting: true,
      observed: false,
      superseded: false,
    });
    flushWrites();
  }

  function applyFromHistory(location: AutoLocation) {
    intendedLocation = location;
    const promise = navigation.goto(location.path, {
      params: location.params ?? {},
      replace: true,
      source: "history",
    });
    const transitionId = navigation.getTransitionId?.() ?? 0;
    void promise.then((result) => {
      if (detached) return;
      if (
        navigation.getTransitionId &&
        navigation.getTransitionId() !== transitionId
      )
        return;
      if (
        result.status === "forbidden" ||
        result.status === "not-found" ||
        (result.status === "success" && !locationsEqual(location, committed()))
      ) {
        writeLocation(committed(), true);
      }
    });
  }

  const unsubscribeAdapter = adapter.subscribe((location, change) => {
    if (detached) return;
    // Framework effects may publish an old render after another write has
    // already changed the URL. Such a notification is not a new navigation.
    if (!locationsEqual(location, adapter.read())) return;
    const explicitNavigation = change?.type === "navigation";
    const releasedIndex = releasedWrites.findIndex((write) =>
      locationsEqual(location, write),
    );
    if (releasedIndex >= 0 && !explicitNavigation) {
      releasedWrites.splice(releasedIndex, 1);
      // Releasing a superseded void write lets redirects make progress, but
      // cannot cancel a URL update already issued to the router. Consume its
      // eventual acknowledgment without replacing newer navigation intent.
      writeLocation(intendedLocation, true);
      return;
    }
    // Effects replay their current snapshot on mount (and in StrictMode).
    // Compare adapter observations, never the committed route: a changed
    // snapshot returning to that route must still cancel a lazy destination.
    if (
      change?.type === "snapshot" &&
      locationsEqual(location, observedLocation)
    )
      return;
    const writeEcho =
      !explicitNavigation &&
      observedWrite &&
      locationsEqual(location, observedLocation);
    observedLocation = location;
    // Match only this bridge's outstanding write, not the committed route:
    // a real back to the committed route must still cancel a lazy transition.
    if (
      !explicitNavigation &&
      inFlight &&
      locationsEqual(location, inFlight.location)
    ) {
      const write = inFlight;
      observedWrite = true;
      write.observed = true;
      if (!write.waiting) finishWrite(write);
      return;
    }
    // Completed synchronous/Promise writes can echo on a later React effect.
    // Compare history observations, not the committed navigation: history may
    // have moved away from that route while it was still waiting for children.
    if (writeEcho) return;
    observedWrite = false;
    // An external navigation supersedes queued internal writes. An already
    // issued async write cannot be cancelled, so correct it once it finishes.
    // An issued void write that the router redirected or abandoned will
    // never acknowledge, so release it instead.
    writes.length = 0;
    if (inFlight) {
      inFlight.superseded = true;
      if (inFlight.waiting) writeLocation(location, true);
      else {
        releasedWrites.push(inFlight.location);
        finishWrite(inFlight);
      }
    }
    applyFromHistory(location);
  });

  const unsubscribeCommit = navigation.subscribeCommit((event) => {
    if (detached || event.source === "history") return;
    writeLocation({ path: event.path, params: event.params }, event.replace);
  });

  // Rebinding an adapter already at the committed URL must not cancel lazy
  // work. Unlike a subscribe event, this read is not a new navigation intent.
  const initial = adapter.read();
  const start = committed();
  if (!locationsEqual(initial, start)) {
    const empty =
      initial.path.length === 0 &&
      Object.keys(initial.params ?? {}).length === 0;
    if (empty) writeLocation(start, true);
    else applyFromHistory(initial);
  }

  return () => {
    detached = true;
    writes.length = 0;
    releasedWrites.length = 0;
    clearTimeout(inFlight?.timer);
    unsubscribeAdapter();
    unsubscribeCommit();
  };
}
