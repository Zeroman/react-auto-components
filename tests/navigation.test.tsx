import { describe, it, expect, vi } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, useEffect, StrictMode } from "react";
import {
  createAutoNavigation,
  AutoNavigationProvider,
  useAutoNavigation,
  useAutoRoute,
  AutoRouteScope,
  AutoMenu,
  AutoTabs,
  AutoConfigProvider,
} from "../src/index";

function registerWorkspaceParents(
  nav: ReturnType<typeof createAutoNavigation>,
) {
  nav.registerNode({
    id: "root",
    ticketId: 1,
    parentPath: [],
    routePath: [],
    children: ["workspace"],
  });
  nav.registerNode({
    id: "workspace",
    ticketId: 1,
    parentPath: [],
    routePath: ["workspace"],
    children: ["projects"],
  });
}

describe("AutoNavigation Core & Tree", () => {
  it("createAutoNavigation works outside React with absolute path and params", async () => {
    const nav = createAutoNavigation({
      initialPath: "workspace:projects",
      initialParams: { org: "acme" },
    });
    registerWorkspaceParents(nav);
    nav.registerNode({
      id: "workspace-node",
      ticketId: 1,
      parentPath: [],
      routePath: ["workspace", "projects"],
      getChildren: () => [{ id: "details" }],
    });

    expect(nav.getPath()).toEqual(["workspace", "projects"]);
    expect(nav.getPathString()).toBe("workspace:projects");
    expect(nav.getParams()).toEqual({ org: "acme" });

    const result = await nav.goto("workspace:projects:details", {
      params: { projectId: "42" },
    });

    expect(result.status).toBe("success");
    expect(result.path).toEqual(["workspace", "projects", "details"]);
    expect(result.pathString).toBe("workspace:projects:details");
    expect(result.params).toEqual({ projectId: "42" });
    expect(nav.getPath()).toEqual(["workspace", "projects", "details"]);
  });

  it("supports readonly string[] as path argument to avoid delimiter ambiguity", async () => {
    const nav = createAutoNavigation();
    registerWorkspaceParents(nav);
    nav.registerNode({
      id: "workspace-node",
      ticketId: 1,
      parentPath: [],
      routePath: ["workspace", "projects"],
      getChildren: () => [{ id: "details:with:colon" }],
    });
    const result = await nav.goto([
      "workspace",
      "projects",
      "details:with:colon",
    ]);
    expect(result.status).toBe("success");
    expect(result.path).toEqual([
      "workspace",
      "projects",
      "details:with:colon",
    ]);
  });

  it("useAutoRoute exposes params, signal, activeChild and handles relative navigation", async () => {
    const user = userEvent.setup();
    const abortSpy = vi.fn();

    function ProjectDetail() {
      const { params, signal, goto, activeChild } = useAutoRoute({
        name: "details",
        defaultChild: "overview",
        children: ["overview", "settings", "tasks"],
      });

      useEffect(() => {
        const handler = () => abortSpy();
        signal.addEventListener("abort", handler);
        return () => signal.removeEventListener("abort", handler);
      }, [signal]);

      return (
        <div>
          <div data-testid="project-id">{params.projectId}</div>
          <div data-testid="active-child">{activeChild}</div>
          <button onClick={() => goto("./settings")}>Go to settings</button>
          <button onClick={() => goto("../list")}>Back to list</button>
        </div>
      );
    }

    function Workspace() {
      const { nodePath, activeChild } = useAutoRoute({
        name: "workspace",
        children: ["list", "details"],
      });

      return (
        <AutoRouteScope path={nodePath}>
          <div>
            <div data-testid="workspace-child">{activeChild}</div>
            {activeChild === "details" && <ProjectDetail />}
            {activeChild === "list" && (
              <div data-testid="list-view">Project List</div>
            )}
          </div>
        </AutoRouteScope>
      );
    }

    const nav = createAutoNavigation({
      initialPath: "workspace:details",
      initialParams: { projectId: "101" },
    });

    render(
      <AutoNavigationProvider navigation={nav}>
        <Workspace />
      </AutoNavigationProvider>,
    );

    expect(screen.getByTestId("workspace-child").textContent).toBe("details");
    expect(screen.getByTestId("project-id").textContent).toBe("101");
    // Normal entry resolves defaultChild "overview"
    expect(screen.getByTestId("active-child").textContent).toBe("overview");
    await waitFor(() =>
      expect(nav.getPathString()).toBe("workspace:details:overview"),
    );

    // Relative navigation ./settings
    await user.click(screen.getByText("Go to settings"));
    expect(nav.getPathString()).toBe("workspace:details:settings");
    expect(screen.getByTestId("active-child").textContent).toBe("settings");

    // Relative navigation ../list
    await user.click(screen.getByText("Back to list"));
    expect(nav.getPathString()).toBe("workspace:list");
    expect(screen.getByTestId("workspace-child").textContent).toBe("list");
  });

  it("signal cancels pending fetch/async work when new navigation occurs", async () => {
    const nav = createAutoNavigation({
      initialPath: "page1",
      initialParams: { query: "first" },
    });
    let abortedAt: boolean | undefined;

    function HeavyComponent() {
      const { signal, params } = useAutoRoute();
      useEffect(() => {
        const handler = () => {
          abortedAt = true;
        };
        signal.addEventListener("abort", handler);
        return () => signal.removeEventListener("abort", handler);
      }, [signal]);
      return <div>Param: {params.query}</div>;
    }

    render(
      <AutoNavigationProvider navigation={nav}>
        <HeavyComponent />
      </AutoNavigationProvider>,
    );

    expect(abortedAt).toBeUndefined();

    await act(async () => {
      await nav.goto("page2", { params: { query: "second" } });
    });
    expect(abortedAt).toBe(true);
  });

  it("isolates independent navigation providers", async () => {
    const navA = createAutoNavigation({ initialPath: "a:first" });
    navA.registerNode({
      id: "root-a",
      ticketId: 1,
      parentPath: [],
      routePath: ["a"],
      getChildren: () => [{ id: "first" }, { id: "second" }],
    });
    const navB = createAutoNavigation({ initialPath: "b:first" });
    navB.registerNode({
      id: "root-b",
      ticketId: 1,
      parentPath: [],
      routePath: ["b"],
      getChildren: () => [{ id: "first" }, { id: "second" }],
    });

    function NavDisplay() {
      const nav = useAutoNavigation();
      return <div data-testid="path">{nav.getPathString()}</div>;
    }

    render(
      <div>
        <AutoNavigationProvider navigation={navA}>
          <div data-testid="scope-a">
            <NavDisplay />
          </div>
        </AutoNavigationProvider>
        <AutoNavigationProvider navigation={navB}>
          <div data-testid="scope-b">
            <NavDisplay />
          </div>
        </AutoNavigationProvider>
      </div>,
    );

    expect(screen.getByTestId("scope-a").textContent).toBe("a:first");
    expect(screen.getByTestId("scope-b").textContent).toBe("b:first");

    await act(async () => {
      await navA.goto("a:second");
    });

    expect(screen.getByTestId("scope-a").textContent).toBe("a:second");
    expect(screen.getByTestId("scope-b").textContent).toBe("b:first");
  });

  it("handles concurrency: newer goto cancels older navigation", async () => {
    const nav = createAutoNavigation({ initialPath: "start" });

    let slowResolve: () => void = () => {};
    function LazyTarget() {
      useAutoRoute({ name: "slow", children: ["leaf"] });
      return <div>Slow Target</div>;
    }

    function Root() {
      const { activeChild } = useAutoRoute({
        children: ["start", "slow", "fast"],
      });
      return (
        <div>
          {activeChild === "slow" && <LazyTarget />}
          {activeChild === "fast" && <div>Fast Target</div>}
        </div>
      );
    }

    render(
      <AutoNavigationProvider navigation={nav}>
        <Root />
      </AutoNavigationProvider>,
    );

    // Launch first navigation that takes time
    const promise1 = nav.goto("slow:leaf");
    // Launch second navigation immediately
    const promise2 = nav.goto("fast");

    const [res1, res2] = await Promise.all([promise1, promise2]);
    expect(res1.status).toBe("cancelled");
    expect(res1.cancelledBy).toBe("new-navigation");
    expect(res2.status).toBe("success");
    expect(nav.getPathString()).toBe("fast");
  });

  it("reports forbidden for disabled/hidden/unauthorized nodes and does not silently fallback", async () => {
    const nav = createAutoNavigation({
      canAccess: (access) => !access.roles?.includes("admin"),
    });

    function Root() {
      useAutoRoute({
        children: [
          { id: "public" },
          { id: "admin-only", roles: ["admin"] },
          { id: "disabled-item", disabled: true },
          { id: "hidden-item", hidden: true },
        ],
        defaultChild: "public",
      });
      return <div>Root</div>;
    }

    render(
      <AutoNavigationProvider navigation={nav}>
        <Root />
      </AutoNavigationProvider>,
    );

    const resForbidden = await nav.goto("admin-only");
    expect(resForbidden.status).toBe("forbidden");

    const resDisabled = await nav.goto("disabled-item");
    expect(resDisabled.status).toBe("forbidden");

    const resNotFound = await nav.goto("unknown-item");
    expect(resNotFound.status).toBe("not-found");
  });

  it("lazy child node registration dispatches remaining path once ready", async () => {
    const nav = createAutoNavigation({ initialPath: "home" });

    function Child() {
      useAutoRoute({ name: "lazy-child", children: ["deep-target"] });
      return <div>Lazy Child Mounted</div>;
    }

    function Parent() {
      const [mounted, setMounted] = useState(false);
      const { nodePath, activeChild } = useAutoRoute({
        name: "parent",
        children: ["lazy-child"],
      });

      useEffect(() => {
        if (activeChild === "lazy-child") {
          const timer = setTimeout(() => setMounted(true), 20);
          return () => clearTimeout(timer);
        }
      }, [activeChild]);

      return (
        <AutoRouteScope path={nodePath}>
          <div>
            <div>Parent active: {activeChild}</div>
            {mounted && <Child />}
          </div>
        </AutoRouteScope>
      );
    }

    function App() {
      const { activeChild } = useAutoRoute({ children: ["home", "parent"] });
      return <div>{activeChild === "parent" && <Parent />}</div>;
    }

    render(
      <AutoNavigationProvider navigation={nav}>
        <App />
      </AutoNavigationProvider>,
    );

    const result = await nav.goto("parent:lazy-child:deep-target");
    expect(result.status).toBe("success");
    expect(nav.getPathString()).toBe("parent:lazy-child:deep-target");
  });

  it("reconciles current route when permissions are revoked or node is removed", async () => {
    let allowReports = true;
    const nav = createAutoNavigation({
      canAccess: (access) => {
        if (access.permissions?.includes("view-reports")) return allowReports;
        return true;
      },
    });

    function App() {
      const { activeChild } = useAutoRoute({
        name: "dashboard",
        defaultChild: "summary",
        children: [
          { id: "summary" },
          { id: "reports", permissions: ["view-reports"] },
        ],
      });
      return <div data-testid="dashboard-child">{activeChild}</div>;
    }

    const { rerender } = render(
      <AutoNavigationProvider navigation={nav}>
        <App />
      </AutoNavigationProvider>,
    );

    await act(async () => {
      await nav.goto("dashboard:reports");
    });
    expect(screen.getByTestId("dashboard-child").textContent).toBe("reports");

    // Revoke permission
    allowReports = false;
    await act(async () => {
      nav.reconcile();
    });

    // Reconciled back to summary
    expect(screen.getByTestId("dashboard-child").textContent).toBe("summary");
    expect(nav.getPathString()).toBe("dashboard:summary");
  });

  it("handles keepMounted without hidden inactive tabs overriding active registration", async () => {
    const nav = createAutoNavigation({ initialPath: "tabs:tab1" });

    function Tab1Content() {
      useAutoRoute({ name: "sub", defaultChild: "a", children: ["a", "b"] });
      return <div>Tab 1 Subcontent</div>;
    }

    function Tab2Content() {
      useAutoRoute({ name: "sub", defaultChild: "x", children: ["x", "y"] });
      return <div>Tab 2 Subcontent</div>;
    }

    function App() {
      const { nodePath, activeChild } = useAutoRoute({
        name: "tabs",
        children: ["tab1", "tab2"],
      });
      return (
        <div>
          <AutoRouteScope
            path={[...nodePath, "tab1"]}
            active={activeChild === "tab1"}
          >
            <div style={{ display: activeChild === "tab1" ? "block" : "none" }}>
              <Tab1Content />
            </div>
          </AutoRouteScope>
          <AutoRouteScope
            path={[...nodePath, "tab2"]}
            active={activeChild === "tab2"}
          >
            <div style={{ display: activeChild === "tab2" ? "block" : "none" }}>
              <Tab2Content />
            </div>
          </AutoRouteScope>
        </div>
      );
    }

    render(
      <AutoNavigationProvider navigation={nav}>
        <App />
      </AutoNavigationProvider>,
    );

    // Initial tab1
    await act(async () => {
      await nav.goto("tabs:tab1:sub:b");
    });
    expect(nav.getPathString()).toBe("tabs:tab1:sub:b");

    // Switch to tab2
    await act(async () => {
      await nav.goto("tabs:tab2:sub:y");
    });
    expect(nav.getPathString()).toBe("tabs:tab2:sub:y");
  });

  it("supports React StrictMode double-mount without premature unregistration", async () => {
    const nav = createAutoNavigation({ initialPath: "home" });

    function Component() {
      useAutoRoute({ name: "home", children: ["sub"] });
      return <div>Home</div>;
    }

    render(
      <StrictMode>
        <AutoNavigationProvider navigation={nav}>
          <Component />
        </AutoNavigationProvider>
      </StrictMode>,
    );

    const result = await nav.goto("home:sub");
    expect(result.status).toBe("success");
    expect(nav.getPathString()).toBe("home:sub");
  });
});

describe("AutoMenu & AutoTabs Route Adapters", () => {
  it("AutoTabs with route drives selection and tab clicks call goto", async () => {
    const user = userEvent.setup();
    const nav = createAutoNavigation({ initialPath: "tabs:tab1" });

    function App() {
      return (
        <AutoNavigationProvider navigation={nav}>
          <AutoTabs
            route={{ name: "tabs", defaultChild: "tab1" }}
            items={[
              { id: "tab1", label: "Tab One", content: <div>Panel 1</div> },
              { id: "tab2", label: "Tab Two", content: <div>Panel 2</div> },
            ]}
          />
        </AutoNavigationProvider>
      );
    }

    render(<App />);

    expect(screen.getByRole("tab", { name: "Tab One" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Panel 1")).toBeVisible();

    await user.click(screen.getByRole("tab", { name: "Tab Two" }));
    expect(nav.getPathString()).toBe("tabs:tab2");
    expect(screen.getByRole("tab", { name: "Tab Two" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Panel 2")).toBeVisible();
  });

  it("AutoMenu with route, content, and target shortcut entries", async () => {
    const user = userEvent.setup();
    const nav = createAutoNavigation({ initialPath: "dashboard" });

    function App() {
      return (
        <AutoNavigationProvider navigation={nav}>
          <AutoMenu
            route={{ defaultChild: "dashboard" }}
            items={[
              {
                id: "dashboard",
                label: "Dashboard",
                content: <div data-testid="content">Dashboard View</div>,
              },
              {
                id: "shortcut",
                label: "Go to Profile",
                target: "profile",
              },
              {
                id: "settings",
                label: "Settings",
                children: [
                  {
                    id: "profile",
                    label: "Profile",
                    content: <div data-testid="content">Profile View</div>,
                  },
                ],
              },
            ]}
          />
        </AutoNavigationProvider>
      );
    }

    render(<App />);

    expect(screen.getByTestId("content").textContent).toBe("Dashboard View");

    await user.click(screen.getByRole("button", { name: "Go to Profile" }));
    expect(nav.getPathString()).toBe("profile");
    expect(screen.getByTestId("content").textContent).toBe("Profile View");

    await user.click(screen.getByRole("button", { name: "Dashboard" }));
    await user.click(screen.getByRole("button", { name: "Profile" }));
    expect(nav.getPathString()).toBe("profile");
    expect(screen.getByRole("button", { name: "Profile" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("AutoMenu with a named route navigates below its own segment", async () => {
    const user = userEvent.setup();
    const nav = createAutoNavigation({ initialPath: "workspace:dashboard" });
    let contentPath: readonly string[] = [];
    function ProfileView() {
      contentPath = useAutoRoute().nodePath;
      return <div data-testid="content">Profile View</div>;
    }

    render(
      <AutoNavigationProvider navigation={nav}>
        <AutoMenu
          route={{ name: "workspace", defaultChild: "dashboard" }}
          items={[
            {
              id: "dashboard",
              label: "Dashboard",
              content: <div data-testid="content">Dashboard View</div>,
            },
            {
              id: "settings",
              label: "Settings",
              children: [
                { id: "profile", label: "Profile", content: <ProfileView /> },
              ],
            },
          ]}
        />
      </AutoNavigationProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.click(screen.getByRole("button", { name: "Profile" }));
    expect(nav.getPathString()).toBe("workspace:profile");
    expect(screen.getByTestId("content").textContent).toBe("Profile View");
    expect(contentPath).toEqual(["workspace", "profile"]);

    await act(() => nav.goto("workspace:settings"));
    expect(nav.getPathString()).toBe("workspace:profile");
  });

  it("AutoMenu leaves inherit an ancestor's disabled state as route children", async () => {
    const nav = createAutoNavigation({ initialPath: "menu:open" });
    render(
      <AutoNavigationProvider navigation={nav}>
        <AutoMenu
          route={{ name: "menu" }}
          items={[
            { id: "open", label: "Open", content: <div>Open</div> },
            {
              id: "locked",
              label: "Locked",
              disabled: true,
              children: [{ id: "secret", label: "Secret", content: <div /> }],
            },
          ]}
        />
      </AutoNavigationProvider>,
    );

    let result: Awaited<ReturnType<typeof nav.goto>> | undefined;
    await act(async () => {
      result = await nav.goto("menu:secret");
    });
    expect(result?.status).toBe("forbidden");
    expect(nav.getPathString()).toBe("menu:open");
  });

  it("regresses non-route AutoTabs and AutoMenu seamlessly", async () => {
    const user = userEvent.setup();
    const tabChange = vi.fn();
    const menuChange = vi.fn();

    render(
      <div>
        <AutoTabs
          defaultValue={["tabA"]}
          onChange={tabChange}
          items={[
            { id: "tabA", label: "Tab A", content: "Content A" },
            { id: "tabB", label: "Tab B", content: "Content B" },
          ]}
        />
        <AutoMenu
          defaultValue="item1"
          onChange={menuChange}
          items={[
            { id: "item1", label: "Item 1" },
            { id: "item2", label: "Item 2" },
          ]}
        />
      </div>,
    );

    expect(screen.getByText("Content A")).toBeVisible();
    await user.click(screen.getByRole("tab", { name: "Tab B" }));
    expect(tabChange).toHaveBeenCalledWith(["tabB"], expect.anything());

    await user.click(screen.getByRole("button", { name: "Item 2" }));
    expect(menuChange).toHaveBeenCalledWith("item2", expect.anything(), [
      "item2",
    ]);
  });
});
