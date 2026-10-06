import { expect, test, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { createAutoNavigation } from "../src/core/navigation/createAutoNavigation";
import {
  createMemoryHistory,
  syncHistory,
  createBrowserHistory,
  createHashHistory,
} from "../src/core/navigation/history";
import type {
  AutoHistoryAdapter,
  AutoLocation,
} from "../src/core/navigation/types";

function tree() {
  const nav = createAutoNavigation({ initialPath: "home" });
  nav.registerNode({
    id: "root",
    ticketId: 1,
    parentPath: [],
    routePath: [],
    children: [{ id: "home" }, { id: "slow" }, { id: "fast" }],
  });
  return nav;
}
function readySlow(nav: ReturnType<typeof tree>) {
  nav.registerNode({
    id: "slow",
    ticketId: 2,
    parentPath: [],
    routePath: ["slow"],
    children: [{ id: "details" }],
  });
}

// A router may return a completion promise, or void and later publish the URL.
function delayedHistory(returnsPromise = true) {
  const memory = createMemoryHistory({ path: ["home"] });
  const pending: Array<{ commit: () => void; reject: (error: Error) => void }> =
    [];
  const write = (location: AutoLocation, replace: boolean) => {
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const promise = returnsPromise
      ? new Promise<void>((ok, fail) => {
          resolve = ok;
          reject = fail;
        })
      : undefined;
    pending.push({
      commit() {
        if (replace) memory.replace(location);
        else memory.push(location);
        resolve?.();
      },
      reject,
    });
    return promise;
  };
  return {
    memory,
    pending,
    adapter: {
      read: memory.read,
      subscribe: memory.subscribe,
      push: (location: AutoLocation) => write(location, false),
      replace: (location: AutoLocation) => write(location, true),
    } satisfies AutoHistoryAdapter,
    async settleNext() {
      expect(pending.length).toBe(1);
      pending.shift()!.commit();
      await Promise.resolve();
    },
  };
}

for (const returnsPromise of [true, false]) {
  test(`a completed ${returnsPromise ? "promise" : "void"} write's late notification does not cancel a later lazy navigation`, async () => {
    const nav = tree();
    let current: AutoLocation = { path: ["home"] };
    let listener: (location: AutoLocation) => void = () => {};
    const notifications: Array<() => void> = [];
    const write = (location: AutoLocation) => {
      current = location;
      notifications.push(() => listener(location));
      return returnsPromise ? Promise.resolve() : undefined;
    };
    const detach = syncHistory(nav, {
      read: () => current,
      push: write,
      replace: write,
      subscribe(fn) {
        listener = fn;
        return () => {
          listener = () => {};
        };
      },
    });
    try {
      await nav.goto("fast");
      await Promise.resolve();
      const pending = nav.goto("slow:details");
      notifications.shift()!();
      readySlow(nav);
      expect((await pending).status).toBe("success");
      expect(nav.pathString).toBe("slow:details");
      // A subsequent real location change must still drive navigation.
      current = { path: ["fast"] };
      listener(current);
      expect(nav.pathString).toBe("fast");
    } finally {
      detach();
      nav.destroy();
    }
  });
}

for (const returnsPromise of [true, false]) {
  test(`delayed ${returnsPromise ? "promise" : "void"} writes preserve order without echoing old routes`, async () => {
    const nav = tree();
    const history = delayedHistory(returnsPromise);
    const detach = syncHistory(nav, history.adapter);
    try {
      await nav.goto("fast");
      await nav.goto("slow");
      await history.settleNext();
      expect(nav.pathString).toBe("slow");
      await history.settleNext();
      expect(history.memory.getEntries().map((loc) => loc.path)).toEqual([
        ["home"],
        ["fast"],
        ["slow"],
      ]);
      expect(nav.pathString).toBe("slow");
    } finally {
      detach();
      nav.destroy();
    }
  });
}

test("external navigation supersedes queued writes while the issued write finishes", async () => {
  const nav = tree();
  const history = delayedHistory();
  const detach = syncHistory(nav, history.adapter);
  try {
    await nav.goto("fast");
    await nav.goto("slow");
    history.memory.push({ path: ["home"] });
    expect(nav.pathString).toBe("home");
    await history.settleNext();
    expect(nav.pathString).toBe("home");
    await history.settleNext();
    expect(history.memory.read().path).toEqual(["home"]);
    expect(history.pending).toHaveLength(0);
    expect(
      history.memory.getEntries().some((loc) => loc.path[0] === "slow"),
    ).toBe(false);
  } finally {
    detach();
    nav.destroy();
  }
});

test("a rejected adapter write releases the next navigation without an unhandled rejection", async () => {
  const nav = tree();
  const history = delayedHistory();
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  const detach = syncHistory(nav, history.adapter);
  try {
    await nav.goto("fast");
    await nav.goto("slow");
    history.pending.shift()!.reject(new Error("router rejected navigation"));
    await Promise.resolve();
    await history.settleNext();
    expect(nav.pathString).toBe("slow");
    expect(history.memory.read().path).toEqual(["slow"]);
    expect(error).toHaveBeenCalledTimes(1);
  } finally {
    detach();
    nav.destroy();
    error.mockRestore();
  }
});

test("detaching history stops queued writes and ignores late completion", async () => {
  const nav = tree();
  const history = delayedHistory();
  const detach = syncHistory(nav, history.adapter);
  try {
    await nav.goto("fast");
    await nav.goto("slow");
    detach();
    await history.settleNext();
    expect(history.pending).toHaveLength(0);
    expect(nav.pathString).toBe("slow");
  } finally {
    detach();
    nav.destroy();
  }
});

test("returning home while the previous asynchronous URL push is pending keeps the latest navigation", async () => {
  const nav = tree();
  let current: AutoLocation = { path: ["home"], params: {} };
  const listeners = new Set<(location: AutoLocation) => void>();
  const pending: Array<() => void> = [];
  const write = (location: AutoLocation) =>
    new Promise<void>((resolve) =>
      pending.push(() => {
        current = location;
        for (const listener of listeners) listener(location);
        resolve();
      }),
    );
  const adapter: AutoHistoryAdapter = {
    read: () => current,
    push: write,
    replace: write,
    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
  };
  const detach = syncHistory(nav, adapter);
  try {
    await nav.goto("fast");
    await nav.goto("home");
    for (let n = 0; pending.length && n < 10; n++) {
      pending.shift()!();
      await Promise.resolve();
    }
    expect(adapter.read().path).toEqual(["home"]);
    expect(nav.getPath()).toEqual(["home"]);
  } finally {
    detach();
    nav.destroy();
  }
});

test("back to committed home cancels the still-loading history destination", async () => {
  const nav = tree();
  const history = createMemoryHistory({ path: ["home"] });
  const detach = syncHistory(nav, history);
  try {
    history.push({ path: ["slow", "details"] });
    history.back();
    readySlow(nav);
    await Promise.resolve();
    expect(history.read().path).toEqual(["home"]);
    expect(nav.getCommittedLocation!().path).toEqual(["home"]);
  } finally {
    detach();
    nav.destroy();
  }
});

test("goto replace:true replaces rather than appending a history entry", async () => {
  const nav = tree();
  const history = createMemoryHistory({ path: ["home"] });
  const detach = syncHistory(nav, history);
  try {
    await nav.goto("fast", { replace: true });
    expect(history.read().path).toEqual(["fast"]);
    expect(history.getEntries()).toHaveLength(1);
  } finally {
    detach();
    nav.destroy();
  }
});

for (const kind of ["browser", "hash"] as const) {
  test(`${kind} history resumes notification from the current URL after re-subscription`, async () => {
    const url = (s: string) => (kind === "hash" ? "/#/" + s : "/" + s);
    window.history.replaceState(null, "", url("home"));
    const history =
      kind === "hash" ? createHashHistory() : createBrowserHistory();
    const stop = history.subscribe(() => {});
    stop();
    // Another router changes location while this adapter has no consumers.
    window.history.pushState(null, "", url("fast"));
    const onChange = vi.fn();
    const stop2 = history.subscribe(onChange);
    try {
      expect(history.read().path).toEqual(["fast"]);
      window.history.back();
      await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
      expect(onChange.mock.calls[0][0].path).toEqual(["home"]);
    } finally {
      stop2();
    }
  });
}

// A router adapter whose push returns void; `route` decides what URL the
// router ends up publishing (undefined = navigation blocked, nothing happens).
function voidRouter(
  route: (location: AutoLocation) => AutoLocation | undefined,
) {
  let current: AutoLocation = { path: ["home"] };
  const listeners = new Set<(location: AutoLocation) => void>();
  const pushes: string[] = [];
  const publish = (location: AutoLocation) => {
    current = location;
    for (const listener of listeners) listener(location);
  };
  const adapter: AutoHistoryAdapter = {
    read: () => current,
    push(location) {
      pushes.push(location.path.join(":"));
      const next = route(location);
      if (next) publish(next);
    },
    replace(location) {
      pushes.push(`replace ${location.path.join(":")}`);
      publish(location);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
  };
  return { adapter, pushes, publish };
}

test("a void write redirected by the router does not stall later writes", async () => {
  const nav = tree();
  const router = voidRouter((location) =>
    location.path[0] === "slow" ? { path: ["home"] } : location,
  );
  const detach = syncHistory(nav, router.adapter);
  try {
    await nav.goto("slow");
    await Promise.resolve();
    expect(nav.pathString).toBe("home");
    await nav.goto("fast");
    await Promise.resolve();
    expect(router.pushes).toEqual(["slow", "fast"]);
    expect(router.adapter.read().path).toEqual(["fast"]);
  } finally {
    detach();
    nav.destroy();
  }
});

test("a blocked void write is released after a timeout without echoing back", async () => {
  vi.useFakeTimers();
  const nav = tree();
  let blocked = true;
  const router = voidRouter((location) => (blocked ? undefined : location));
  const detach = syncHistory(nav, router.adapter);
  try {
    await nav.goto("fast");
    blocked = false;
    await nav.goto("slow");
    expect(router.pushes).toEqual(["fast"]);
    vi.advanceTimersByTime(2000);
    expect(router.pushes).toEqual(["fast", "slow"]);
    expect(nav.pathString).toBe("slow");
  } finally {
    detach();
    nav.destroy();
    vi.useRealTimers();
  }
});

test("a deferred void acknowledgment arriving after the timeout is still an echo", async () => {
  vi.useFakeTimers();
  const nav = tree();
  const router = voidRouter(() => undefined);
  const detach = syncHistory(nav, router.adapter);
  try {
    await nav.goto("fast");
    vi.advanceTimersByTime(2000);
    const signal = nav.getSignal();
    router.publish({ path: ["fast"] });
    expect(signal.aborted).toBe(false);
    expect(nav.pathString).toBe("fast");
  } finally {
    detach();
    nav.destroy();
    vi.useRealTimers();
  }
});

test("a promise that resolves before read() updates treats the late notification as its echo", async () => {
  const nav = tree();
  let current: AutoLocation = { path: ["home"] };
  let listener: (location: AutoLocation) => void = () => {};
  const late: Array<() => void> = [];
  const write = (location: AutoLocation) => {
    late.push(() => {
      current = location;
      listener(location);
    });
    return Promise.resolve();
  };
  const detach = syncHistory(nav, {
    read: () => current,
    push: write,
    replace: write,
    subscribe(fn) {
      listener = fn;
      return () => {
        listener = () => {};
      };
    },
  });
  try {
    await nav.goto("fast");
    await Promise.resolve();
    await Promise.resolve();
    const signal = nav.getSignal();
    late.shift()!();
    expect(signal.aborted).toBe(false);
    expect(nav.pathString).toBe("fast");
  } finally {
    detach();
    nav.destroy();
  }
});
