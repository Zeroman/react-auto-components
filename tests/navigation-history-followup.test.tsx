import { StrictMode, useEffect, useMemo, useRef } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import {
  AutoNavigationProvider,
  createAutoNavigation,
  createHashHistory,
  createMemoryHistory,
  decodeLocation,
  encodeLocation,
  syncHistory,
  type AutoHistoryAdapter,
  type AutoLocation,
  type AutoNavigationResult,
} from "../src/index";

afterEach(cleanup);

test("empty path query survives a codec roundtrip", () => {
  expect(
    decodeLocation(encodeLocation({ path: [], params: { tab: "a" } })),
  ).toEqual({ path: [], params: { tab: "a" } });
});

test("hash history reads query parameters without inventing an empty-path segment", () => {
  window.history.replaceState(null, "", "/");
  const history = createHashHistory();
  history.push({ path: [], params: { tab: "a" } });
  expect(window.location.hash).toBe("#/?tab=a");
  expect(history.read()).toEqual({ path: [], params: { tab: "a" } });
});

function tree() {
  const navigation = createAutoNavigation({ initialPath: "home" });
  navigation.registerNode({
    id: "root",
    ticketId: 1,
    parentPath: [],
    routePath: [],
    children: [{ id: "home" }, { id: "slow" }, { id: "fast" }],
  });
  return navigation;
}

function readySlow(navigation: ReturnType<typeof tree>) {
  navigation.registerNode({
    id: "slow",
    ticketId: 2,
    parentPath: [],
    routePath: ["slow"],
    children: [{ id: "details" }],
  });
}

type Listener = Parameters<AutoHistoryAdapter["subscribe"]>[0];

function deferredVoidHistory() {
  const memory = createMemoryHistory({ path: ["home"] });
  const pending: Array<() => void> = [];
  let explicitNavigation = false;
  const adapter: AutoHistoryAdapter = {
    read: memory.read,
    subscribe: (listener) =>
      memory.subscribe((location) =>
        listener(
          location,
          explicitNavigation ? { type: "navigation" } : undefined,
        ),
      ),
    push(location) {
      pending.push(() => memory.push(location));
    },
    replace(location) {
      pending.push(() => memory.replace(location));
    },
  };
  return {
    memory,
    pending,
    adapter,
    navigate(location: AutoLocation) {
      explicitNavigation = true;
      try {
        memory.push(location);
      } finally {
        explicitNavigation = false;
      }
    },
  };
}

test("explicit navigation to a released void write target remains authoritative before its late echo", async () => {
  const navigation = tree();
  const history = deferredVoidHistory();
  const detach = syncHistory(navigation, history.adapter);
  try {
    await navigation.goto("fast");
    history.memory.push({ path: ["home"] });
    const first = navigation.goto("slow:details");
    history.navigate({ path: ["fast"] });
    expect((await first).status).toBe("cancelled");
    expect(navigation.pathString).toBe("fast");
    const second = navigation.goto("slow:details");
    history.pending.shift()!();
    readySlow(navigation);
    expect((await second).status).toBe("success");
  } finally {
    detach();
    navigation.destroy();
  }
});

test("an issued deferred void write cannot overwrite a superseding external navigation", async () => {
  const navigation = tree();
  const history = deferredVoidHistory();
  const detach = syncHistory(navigation, history.adapter);
  try {
    await navigation.goto("fast");
    await navigation.goto("slow");
    history.memory.push({ path: ["home"] });
    expect(navigation.pathString).toBe("home");
    history.pending.shift()!();
    expect(navigation.pathString).toBe("home");
    history.pending.shift()!();
    expect(history.memory.read().path).toEqual(["home"]);
    expect(history.pending).toHaveLength(0);
    expect(
      history.memory.getEntries().some((entry) => entry.path[0] === "slow"),
    ).toBe(false);

    // Once the delayed acknowledgment was consumed, a real back to that
    // same path must still drive navigation and cancel a lazy destination.
    history.memory.push({ path: ["fast"] });
    history.memory.push({ path: ["home"] });
    const lazy = navigation.goto("slow:details");
    history.memory.back();
    expect((await lazy).status).toBe("cancelled");
    expect(navigation.pathString).toBe("fast");
  } finally {
    detach();
    navigation.destroy();
  }
});

test("a superseded void acknowledgment preserves a newer pending history destination", async () => {
  const navigation = tree();
  const history = deferredVoidHistory();
  const detach = syncHistory(navigation, history.adapter);
  try {
    await navigation.goto("fast");
    history.memory.push({ path: ["home"] });
    history.memory.push({ path: ["slow", "details"] });
    history.pending.shift()!();
    expect(navigation.pathString).toBe("slow:details");
    history.pending.shift()!();
    expect(history.memory.read().path).toEqual(["slow", "details"]);
    readySlow(navigation);
    await Promise.resolve();
    expect(navigation.getCommittedLocation!().path).toEqual([
      "slow",
      "details",
    ]);
  } finally {
    detach();
    navigation.destroy();
  }
});

for (const strict of [false, true]) {
  test(`router effect snapshots preserve a child lazy goto (${strict ? "StrictMode" : "normal"})`, async () => {
    const navigation = tree();
    let pending!: Promise<AutoNavigationResult>;
    let history!: AutoHistoryAdapter;
    function LazyNavigation() {
      useEffect(() => {
        pending = navigation.goto("slow:details");
      }, []);
      return null;
    }
    function Router() {
      const current = useRef<AutoLocation>({ path: ["home"] });
      const listeners = useRef(new Set<Listener>());
      const adapter = useMemo<AutoHistoryAdapter>(
        () => ({
          read: () => current.current,
          push: (location) => {
            current.current = location;
          },
          replace: (location) => {
            current.current = location;
          },
          subscribe(fn) {
            listeners.current.add(fn);
            return () => {
              listeners.current.delete(fn);
            };
          },
        }),
        [],
      );
      history = adapter;
      useEffect(() => {
        for (const listener of listeners.current) {
          listener(adapter.read(), { type: "snapshot" });
        }
      }, [adapter]);
      return (
        <AutoNavigationProvider navigation={navigation} history={adapter}>
          <LazyNavigation />
        </AutoNavigationProvider>
      );
    }
    try {
      render(
        strict ? (
          <StrictMode>
            <Router />
          </StrictMode>
        ) : (
          <Router />
        ),
      );
      act(() => readySlow(navigation));
      expect((await pending).status).toBe("success");
      expect(history.read().path).toEqual(["slow", "details"]);
    } finally {
      navigation.destroy();
    }
  });
}

function snapshotHistory() {
  let current: AutoLocation = { path: ["home"] };
  let listener: Listener = () => {};
  const adapter: AutoHistoryAdapter = {
    read: () => current,
    push: (location) => {
      current = location;
    },
    replace: (location) => {
      current = location;
    },
    subscribe(fn) {
      listener = fn;
      return () => {
        listener = () => {};
      };
    },
  };
  return {
    adapter,
    publish(location: AutoLocation, type?: "snapshot" | "navigation") {
      current = location;
      listener(location, type ? { type } : undefined);
    },
  };
}

test("a changed router snapshot returning to committed home cancels a lazy history destination", async () => {
  const navigation = tree();
  const history = snapshotHistory();
  const detach = syncHistory(navigation, history.adapter);
  try {
    history.publish({ path: ["slow", "details"] }, "snapshot");
    history.publish({ path: ["home"] }, "snapshot");
    readySlow(navigation);
    await Promise.resolve();
    expect(navigation.getCommittedLocation!().path).toEqual(["home"]);
    expect(history.adapter.read().path).toEqual(["home"]);
  } finally {
    detach();
    navigation.destroy();
  }
});

for (const type of [undefined, "navigation"] as const) {
  test(`${type ?? "legacy unmarked"} same-location intent cancels a pending lazy goto`, async () => {
    const navigation = tree();
    const history = snapshotHistory();
    const detach = syncHistory(navigation, history.adapter);
    try {
      const pending = navigation.goto("slow:details");
      history.publish({ path: ["home"] }, type);
      readySlow(navigation);
      expect((await pending).status).toBe("cancelled");
      expect(navigation.getCommittedLocation!().path).toEqual(["home"]);
    } finally {
      detach();
      navigation.destroy();
    }
  });
}

test("explicit same-location intent after an internal write is not mistaken for its late echo", async () => {
  const navigation = tree();
  const history = snapshotHistory();
  const detach = syncHistory(navigation, history.adapter);
  try {
    await navigation.goto("fast");
    const pending = navigation.goto("slow:details");
    history.publish({ path: ["fast"] }, "navigation");
    readySlow(navigation);
    expect((await pending).status).toBe("cancelled");
    expect(navigation.getCommittedLocation!().path).toEqual(["fast"]);
  } finally {
    detach();
    navigation.destroy();
  }
});

test("a history destination resolving its default child replaces the incomplete URL", async () => {
  const navigation = tree();
  navigation.registerNode({
    id: "slow",
    ticketId: 2,
    parentPath: [],
    routePath: ["slow"],
    children: [{ id: "details" }],
    defaultChild: "details",
  });
  const history = createMemoryHistory({ path: ["home"] });
  const detach = syncHistory(navigation, history);
  try {
    history.push({ path: ["slow"], params: { tab: "a" } });
    await Promise.resolve();
    expect(navigation.getCommittedLocation!()).toEqual({
      path: ["slow", "details"],
      params: { tab: "a" },
    });
    expect(history.read()).toEqual({
      path: ["slow", "details"],
      params: { tab: "a" },
    });
    expect(history.getEntries()).toHaveLength(2);
  } finally {
    detach();
    navigation.destroy();
  }
});

for (const attach of ["before", "after"] as const) {
  test(`initial parent URL is normalized when history attaches ${attach} default resolution`, async () => {
    const navigation = createAutoNavigation({ initialPath: "slow" });
    navigation.registerNode({
      id: "root",
      ticketId: 1,
      parentPath: [],
      routePath: [],
      children: [{ id: "slow" }],
    });
    navigation.registerNode({
      id: "slow",
      ticketId: 2,
      parentPath: [],
      routePath: ["slow"],
      children: [{ id: "details" }],
      defaultChild: "details",
    });
    const history = createMemoryHistory({ path: ["slow"] });
    if (attach === "after") await Promise.resolve();
    const detach = syncHistory(navigation, history);
    try {
      await Promise.resolve();
      expect(navigation.getCommittedLocation!().path).toEqual([
        "slow",
        "details",
      ]);
      expect(history.read().path).toEqual(["slow", "details"]);
      expect(history.getEntries()).toHaveLength(1);
    } finally {
      detach();
      navigation.destroy();
    }
  });
}
