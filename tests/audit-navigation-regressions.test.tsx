import { act, render, cleanup } from "@testing-library/react";
import { test, expect, afterEach, vi } from "vitest";
import {
  AutoNavigationProvider,
  AutoConfigProvider,
  AutoTabs,
  AutoRouteScope,
  createAutoNavigation,
  useAutoRoute,
} from "../src/index";

afterEach(cleanup);

// Audit 1.2: a child route mounted inside an inactive keepMounted AutoTabs
// panel registers with isActive() === false. When nav.goto activates the
// parent tab, RouteActiveContext flips to true, but useAutoRoute's effects
// never re-run (isContextActive is not a dependency), so nav.updateNode is
// never called and the engine is not notified that the node became active.
// (Today the AutoTabs path is masked by unstable RoutePathContext identity
// causing full re-registration; this test pins the notification contract.)
test("activation of an enclosing keepMounted tab notifies the engine via updateNode", async () => {
  const nav = createAutoNavigation({ initialPath: "tabs:one" });
  render(
    <AutoNavigationProvider navigation={nav}>
      <AutoConfigProvider>
        <AutoTabs
          route={{ name: "tabs" }}
          items={[
            { id: "one", label: "One", content: "first" },
            {
              id: "two",
              label: "Two",
              defaultActive: "child",
              children: [{ id: "child", label: "Child", content: "nested" }],
            },
          ]}
        />
      </AutoConfigProvider>
    </AutoNavigationProvider>,
  );
  expect(nav.pathString).toBe("tabs:one");

  const updateNode = vi.spyOn(nav, "updateNode");
  let result!: Awaited<ReturnType<typeof nav.goto>>;
  await act(async () => {
    result = await nav.goto("tabs:two:child", { timeoutMs: 300 });
  });
  expect(updateNode).toHaveBeenCalled();
  expect(result.status).toBe("success");
  expect(nav.pathString).toBe("tabs:two:child");

  // Deactivating must notify as well so reconcile sees the node inactive.
  updateNode.mockClear();
  await act(async () => {
    result = await nav.goto("tabs:one", { timeoutMs: 300 });
  });
  expect(updateNode).toHaveBeenCalled();
  expect(result.status).toBe("success");
});

// Behavioral proof for audit 1.2 without the unstable-path masking: a stable
// PARENT_PATH means the nested node never re-registers, so the ONLY way the
// pending transition can resume is the engine being notified when the
// enclosing scope becomes active. Before the fix this goto timed out as
// "not-found" (verified by temporarily reverting the isContextActive dep).
// The scope provides the parent path, so the inner node declares children
// WITHOUT a name (a name would double the path to parent:parent).
test("pending goto into a stable-path inactive scope settles once it activates", async () => {
  const PARENT_PATH: readonly string[] = ["parent"];
  function Fixture() {
    const root = useAutoRoute({
      children: [{ id: "parent", awaitRegistration: true }],
    });
    const active = root.activeChild === "parent";
    return (
      <AutoRouteScope path={PARENT_PATH} active={active}>
        <Inner />
      </AutoRouteScope>
    );
  }
  function Inner() {
    useAutoRoute({ children: ["child"] });
    return null;
  }
  const nav = createAutoNavigation({ initialPath: "" });
  render(
    <AutoNavigationProvider navigation={nav}>
      <AutoConfigProvider>
        <Fixture />
      </AutoConfigProvider>
    </AutoNavigationProvider>,
  );
  let result!: Awaited<ReturnType<typeof nav.goto>>;
  await act(async () => {
    result = await nav.goto("parent:child", { timeoutMs: 300 });
  });
  expect(result.status).toBe("success");
  expect(result.error).toBeUndefined();
  expect(nav.pathString).toBe("parent:child");
});
