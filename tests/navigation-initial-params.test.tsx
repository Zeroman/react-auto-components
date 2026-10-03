import { StrictMode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import {
  AutoNavigationProvider,
  AutoTabs,
  createAutoNavigation,
  createMemoryHistory,
  syncHistory,
  useAutoRoute,
  type AutoRouteContextValue,
} from "../src/index";

afterEach(cleanup);

for (const strict of [false, true]) {
  test(`initial defaults commit the displayed child with a live signal (${strict ? "StrictMode" : "normal"})`, async () => {
    const nav = createAutoNavigation({
      initialPath: "workspace:details",
      initialParams: { id: "42" },
    });
    const history = createMemoryHistory({
      path: ["workspace", "details"],
      params: { id: "42" },
    });
    let route!: AutoRouteContextValue;
    function Overview() {
      route = useAutoRoute();
      return <div>Overview content</div>;
    }
    const app = (
      <AutoNavigationProvider navigation={nav} history={history}>
        <AutoTabs
          route={{ name: "workspace" }}
          items={[
            {
              id: "details",
              label: "Details",
              defaultActive: "overview",
              children: [
                { id: "overview", label: "Overview", content: <Overview /> },
              ],
            },
          ]}
        />
      </AutoNavigationProvider>
    );
    const view = render(strict ? <StrictMode>{app}</StrictMode> : app);
    try {
      await waitFor(() =>
        expect(nav.pathString).toBe("workspace:details:overview"),
      );
      expect(screen.getByText("Overview content")).toBeVisible();
      expect(route.signal.aborted).toBe(false);
      expect(history.read()).toEqual({
        path: ["workspace", "details", "overview"],
        params: { id: "42" },
      });
      expect(history.getEntries()).toHaveLength(1);
    } finally {
      view.unmount();
      nav.destroy();
    }
  });
}

function tree() {
  const nav = createAutoNavigation({
    initialPath: "home",
    initialParams: { keep: "yes", remove: "old" },
  });
  nav.registerNode({
    id: "root",
    ticketId: 1,
    parentPath: [],
    routePath: [],
    children: [{ id: "home" }, { id: "slow" }],
  });
  return nav;
}
function ready(nav: ReturnType<typeof tree>) {
  nav.registerNode({
    id: "slow",
    ticketId: 2,
    parentPath: [],
    routePath: ["slow"],
    children: [{ id: "details" }],
  });
}

test("parameter edits join a pending destination and preserve its history push", async () => {
  const nav = tree();
  const history = createMemoryHistory({
    path: ["home"],
    params: { keep: "yes", remove: "old" },
  });
  const detach = syncHistory(nav, history);
  try {
    const pending = nav.goto("slow:details", {
      params: { keep: "yes", remove: "target", from: "target" },
    });
    const edit = nav.setParams({ remove: null, query: "" });
    ready(nav);
    expect((await pending).status).toBe("success");
    expect((await edit).status).toBe("success");
    expect(nav.getParams()).toEqual({ keep: "yes", from: "target", query: "" });
    expect(history.read()).toEqual({
      path: ["slow", "details"],
      params: { keep: "yes", from: "target", query: "" },
    });
    expect(history.getEntries()).toHaveLength(2);
  } finally {
    detach();
    nav.destroy();
  }
});

test("null deletes existing parameters while an empty string and unrelated keys survive", async () => {
  const nav = tree();
  try {
    await nav.setParams({ remove: null, query: "" });
    expect(nav.getParams()).toEqual({ keep: "yes", query: "" });
    await nav.setParams({});
    expect(nav.getParams()).toEqual({ keep: "yes", query: "" });
  } finally {
    nav.destroy();
  }
});

test("editing params on a pending history destination commits its edited URL", async () => {
  const nav = tree();
  const history = createMemoryHistory({
    path: ["home"],
    params: nav.getParams(),
  });
  const detach = syncHistory(nav, history);
  try {
    history.push({
      path: ["slow", "details"],
      params: { id: "42", filter: "old" },
    });
    const edit = nav.setParams({ filter: null, id: "43" });
    ready(nav);
    expect((await edit).status).toBe("success");
    expect(history.read()).toEqual({
      path: ["slow", "details"],
      params: { id: "43" },
    });
    expect(history.getEntries()).toHaveLength(2);
  } finally {
    detach();
    nav.destroy();
  }
});

test("default normalization waits for registration and never supersedes an explicit navigation", async () => {
  const nav = createAutoNavigation({ initialPath: "workspace" });
  try {
    nav.registerNode({
      id: "workspace",
      ticketId: 1,
      parentPath: [],
      routePath: ["workspace"],
      defaultChild: "overview",
      children: [{ id: "overview" }, { id: "details" }],
    });
    const goto = nav.goto("workspace:details");
    await Promise.resolve();
    expect((await goto).status).toBe("success");
    expect(nav.pathString).toBe("workspace:details");
  } finally {
    nav.destroy();
  }
});
