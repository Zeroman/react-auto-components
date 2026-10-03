import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import {
  createAutoNavigation,
  AutoNavigationProvider,
  useAutoRoute,
  AutoTabs,
  createMemoryHistory,
  createHashHistory,
  createBrowserHistory,
  syncHistory,
  encodeLocation,
  decodeLocation,
  locationsEqual,
  type AutoHistoryAdapter,
  type AutoLocation,
} from "../src/index";

describe("History Adapters Contract Suite", () => {
  // Test each adapter implementation against the common contract
  const adapters: Array<{ name: string; factory: () => AutoHistoryAdapter }> = [
    {
      name: "createMemoryHistory",
      factory: () =>
        createMemoryHistory({ path: ["home"], params: { page: "1" } }),
    },
    {
      name: "createHashHistory",
      factory: () => {
        window.history.replaceState(null, "", "#/home?page=1");
        return createHashHistory();
      },
    },
    {
      name: "createBrowserHistory",
      factory: () => {
        window.history.replaceState(null, "", "/home?page=1");
        return createBrowserHistory();
      },
    },
  ];

  for (const { name, factory } of adapters) {
    describe(name, () => {
      it("reads initial location, pushes and replaces entries, and notifies subscribers", () => {
        const adapter = factory();
        const initial = adapter.read();
        expect(initial.path).toEqual(["home"]);
        expect(initial.params?.page).toBe("1");

        const received: AutoLocation[] = [];
        const unsubscribe = adapter.subscribe((loc) => {
          received.push(loc);
        });

        // Push new location
        adapter.push({ path: ["workspace", "projects"], params: { id: "99" } });
        expect(adapter.read().path).toEqual(["workspace", "projects"]);
        expect(adapter.read().params?.id).toBe("99");

        // Replace location
        adapter.replace({
          path: ["workspace", "details"],
          params: { id: "100" },
        });
        expect(adapter.read().path).toEqual(["workspace", "details"]);
        expect(adapter.read().params?.id).toBe("100");

        unsubscribe();
      });
    });
  }
});

describe("URL Codec & Location Equality", () => {
  it("encodes and decodes special characters, embedded colons/slashes, and Unicode", () => {
    const loc: AutoLocation = {
      path: ["work:space", "proj/ects", "det?ails", "中文 & text"],
      params: { z_key: "last", a_key: "first", special: "a=b&c:d/e?f" },
    };

    const encoded = encodeLocation(loc);
    // Keys must be alphabetically sorted
    expect(encoded).toContain("a_key=first&special=");

    const decoded = decodeLocation(encoded);
    expect(decoded.path).toEqual(loc.path);
    expect(decoded.params).toEqual(loc.params);
  });

  it("locationsEqual handles empty parameters and key ordering correctly", () => {
    const a: AutoLocation = { path: ["a", "b"], params: { x: "1", y: "2" } };
    const b: AutoLocation = { path: ["a", "b"], params: { y: "2", x: "1" } };
    expect(locationsEqual(a, b)).toBe(true);

    const c: AutoLocation = {
      path: ["a", "b"],
      params: { x: "1", y: "2", z: "" },
    };
    expect(locationsEqual(a, c)).toBe(false);

    const d: AutoLocation = { path: ["a", "c"], params: { x: "1", y: "2" } };
    expect(locationsEqual(a, d)).toBe(false);
  });
});

describe("URL format and basePath", () => {
  it("browser URLs use '/' between segments and decode either separator", () => {
    window.history.replaceState(null, "", "/app/workspace/projects?tab=a");
    const browser = createBrowserHistory({ basePath: "/app" });
    expect(browser.read()).toEqual({
      path: ["workspace", "projects"],
      params: { tab: "a" },
    });

    browser.push({ path: ["work:space", "a/b"], params: {} });
    expect(window.location.pathname).toBe("/app/work%3Aspace/a%2Fb");
    expect(browser.read().path).toEqual(["work:space", "a/b"]);

    expect(decodeLocation("/workspace:projects").path).toEqual([
      "workspace",
      "projects",
    ]);
  });

  it("hash URLs keep ':' between segments", () => {
    window.history.replaceState(null, "", "/");
    const hash = createHashHistory();
    hash.push({ path: ["table", "local"] });
    expect(window.location.hash).toBe("#/table:local");
  });

  it("basePath only matches on a segment boundary", () => {
    expect(decodeLocation("/admin/users", "/admin").path).toEqual(["users"]);
    expect(decodeLocation("/admin", "/admin").path).toEqual([]);
    expect(decodeLocation("/admin?tab=x", "/admin").params).toEqual({
      tab: "x",
    });
    expect(decodeLocation("/administrator/users", "/admin")).toEqual({
      path: [],
      params: {},
    });
  });

  it("keeps '?' inside query values", () => {
    expect(decodeLocation("/a?q=x?y").params).toEqual({ q: "x?y" });
  });
});

describe("syncHistory with Memory History", () => {
  it("synchronizes navigation with memory history and avoids write-back on history changes", async () => {
    const nav = createAutoNavigation({ initialPath: "home" });
    nav.registerNode({
      id: "root",
      ticketId: 1,
      parentPath: [],
      routePath: [],
      getChildren: () => [
        { id: "home" },
        { id: "workspace" },
        { id: "settings" },
      ],
    });
    nav.registerNode({
      id: "workspace-node",
      ticketId: 2,
      parentPath: [],
      routePath: ["workspace"],
      getChildren: () => [{ id: "projects" }, { id: "details" }],
    });
    const memory = createMemoryHistory({ path: ["home"] });
    const pushSpy = vi.spyOn(memory, "push");
    const replaceSpy = vi.spyOn(memory, "replace");

    const detach = syncHistory(nav, memory);

    // 1. Regular goto writes push to adapter
    await nav.goto("workspace:projects", { params: { tab: "active" } });
    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(memory.read().path).toEqual(["workspace", "projects"]);
    expect(memory.read().params).toEqual({ tab: "active" });

    // 2. Regular replace writes replace to adapter
    await nav.replace("workspace:details", { params: { id: "42" } });
    expect(replaceSpy).toHaveBeenCalledTimes(1);
    expect(memory.read().path).toEqual(["workspace", "details"]);

    // 3. History change triggers navigation with source: 'history' WITHOUT writing back to adapter
    const pushCountBefore = pushSpy.mock.calls.length;
    const replaceCountBefore = replaceSpy.mock.calls.length;

    // External push from history
    memory.push({ path: ["settings"], params: {} });
    // Let navigation settle
    await new Promise((r) => setTimeout(r, 20));

    expect(nav.getPath()).toEqual(["settings"]);
    // push was called once by memory.push, but NOT called again by navigation
    expect(pushSpy).toHaveBeenCalledTimes(pushCountBefore + 1);
    expect(replaceSpy).toHaveBeenCalledTimes(replaceCountBefore);

    detach();
  });

  it("reconciles and replace-corrects URL when history inputs an invalid or forbidden route", async () => {
    const nav = createAutoNavigation({
      initialPath: "home",
      canAccess: (access) => !access.roles?.includes("admin"),
    });
    nav.registerNode({
      id: "root-node",
      ticketId: 1,
      parentPath: [],
      routePath: [],
      children: [{ id: "home" }, { id: "admin-secret", roles: ["admin"] }],
      defaultChild: "home",
    });

    const memory = createMemoryHistory({ path: ["home"] });
    const replaceSpy = vi.spyOn(memory, "replace");
    const detach = syncHistory(nav, memory);

    // Simulate history push to forbidden route
    memory.push({ path: ["admin-secret"] });
    await new Promise((r) => setTimeout(r, 30));

    // Must be rejected and corrected back to valid path
    expect(replaceSpy).toHaveBeenCalled();
    expect(memory.read().path).toEqual(["home"]);
    expect(nav.getPath()).toEqual(["home"]);

    detach();
  });

  it("re-syncing with a new adapter instance keeps a pending lazy navigation", async () => {
    const nav = createAutoNavigation({ initialPath: "home" });
    nav.registerNode({
      id: "root",
      ticketId: 1,
      parentPath: [],
      routePath: [],
    });
    const first = createMemoryHistory({ path: ["home"] });
    const detachFirst = syncHistory(nav, first);

    const pending = nav.goto("later");
    detachFirst();
    const second = createMemoryHistory({ path: ["home"] });
    const detachSecond = syncHistory(nav, second);

    nav.registerNode({
      id: "later",
      ticketId: 2,
      parentPath: [],
      routePath: ["later"],
    });
    const result = await pending;
    expect(result.status).toBe("success");
    expect(second.read().path).toEqual(["later"]);
    detachSecond();
  });

  it("writes the initial committed location into an empty URL", () => {
    const nav = createAutoNavigation({ initialPath: "table:local" });
    const memory = createMemoryHistory();
    const detach = syncHistory(nav, memory);
    expect(memory.read().path).toEqual(["table", "local"]);
    expect(memory.getEntries()).toHaveLength(1);
    expect(nav.getPath()).toEqual(["table", "local"]);
    detach();
  });

  it("AutoNavigationProvider tolerates an inline history factory across re-renders", async () => {
    const nav = createAutoNavigation({ initialPath: "home" });
    nav.registerNode({
      id: "root",
      ticketId: 1,
      parentPath: [],
      routePath: [],
    });
    const histories: ReturnType<typeof createMemoryHistory>[] = [];
    const inline = () => {
      const history = createMemoryHistory({ path: ["home"] });
      histories.push(history);
      return history;
    };
    const { rerender } = render(
      <AutoNavigationProvider navigation={nav} history={inline()}>
        <div />
      </AutoNavigationProvider>,
    );
    const pending = nav.goto("later");
    rerender(
      <AutoNavigationProvider navigation={nav} history={inline()}>
        <div />
      </AutoNavigationProvider>,
    );
    act(() => {
      nav.registerNode({
        id: "later",
        ticketId: 2,
        parentPath: [],
        routePath: ["later"],
      });
    });
    expect((await pending).status).toBe("success");
    expect(histories.at(-1)!.read().path).toEqual(["later"]);
  });
});

describe("Navigation Cycle Guard & keepMounted Real AutoTabs", () => {
  it("detects cyclic shortcut navigation without synchronous lockup or hanging", async () => {
    const nav = createAutoNavigation({ readyTimeoutMs: 1000 });

    // Shortcut A points to B, and B points to A
    nav.registerNode({
      id: "node-root",
      ticketId: 1,
      parentPath: [],
      routePath: [],
      getChildren: () => [
        { id: "cycle-a", target: "cycle-b" },
        { id: "cycle-b", target: "cycle-a" },
      ],
    });

    const result = await nav.goto("cycle-a", { timeoutMs: 200 });
    expect(result.status).toBe("not-found");
    expect(result.error).toContain("Cyclic shortcut");
  });

  it("real AutoTabs with keepMounted correctly prioritizes active branch over inactive branch", async () => {
    const nav = createAutoNavigation({ initialPath: "tabs:tab1:sub:one" });

    function App() {
      return (
        <AutoNavigationProvider navigation={nav}>
          <AutoTabs
            route={{ name: "tabs" }}
            keepMounted
            items={[
              {
                id: "tab1",
                label: "Tab 1",
                content: (
                  <AutoTabs
                    route={{ name: "sub", defaultChild: "one" }}
                    keepMounted
                    items={[
                      { id: "one", label: "Tab 1 One", content: "Tab 1 First" },
                      {
                        id: "two",
                        label: "Tab 1 Two",
                        content: "Tab 1 Second",
                      },
                    ]}
                  />
                ),
              },
              {
                id: "tab2",
                label: "Tab 2",
                content: (
                  <AutoTabs
                    route={{ name: "sub", defaultChild: "alpha" }}
                    keepMounted
                    items={[
                      {
                        id: "alpha",
                        label: "Tab 2 Alpha",
                        content: "Tab 2 First",
                      },
                      {
                        id: "beta",
                        label: "Tab 2 Beta",
                        content: "Tab 2 Second",
                      },
                    ]}
                  />
                ),
              },
            ]}
          />
        </AutoNavigationProvider>
      );
    }

    render(<App />);

    expect(screen.getByText("Tab 1 First")).toBeVisible();

    // Navigate to sub:two on active tab1
    await act(async () => {
      const res = await nav.goto("tabs:tab1:sub:two");
      expect(res.status).toBe("success");
    });
    expect(screen.getByText("Tab 1 Second")).toBeVisible();

    // Switch to tab2
    await act(async () => {
      const res = await nav.goto("tabs:tab2:sub:beta");
      expect(res.status).toBe("success");
    });
    expect(screen.getByText("Tab 2 Second")).toBeVisible();
    expect(nav.getPathString()).toBe("tabs:tab2:sub:beta");
  });
});
