import { act, render, cleanup } from "@testing-library/react";
import { test, expect, afterEach } from "vitest";
import {
  AutoNavigationProvider,
  AutoConfigProvider,
  AutoTabs,
  createAutoNavigation,
  useAutoRoute,
  type AutoRouteContextValue,
  type AutoNavigationResult,
} from "../src/index";
afterEach(cleanup);
test("revoking local permissions reconciles an already active route", async () => {
  const nav = createAutoNavigation({ initialPath: "private" });
  function Content() {
    useAutoRoute({ name: "private", permissions: ["secret"] });
    return null;
  }
  const view = (allow: boolean) => (
    <AutoNavigationProvider navigation={nav}>
      <AutoConfigProvider
        config={{
          canAccess: (a) => allow || !a.permissions?.includes("secret"),
        }}
      >
        <Content />
      </AutoConfigProvider>
    </AutoNavigationProvider>
  );
  const rendered = render(view(true));
  expect(nav.pathString).toBe("private");
  rendered.rerender(view(false));
  expect(nav.pathString).toBe("");
});
test("same-path goto leaves live route signal", async () => {
  const nav = createAutoNavigation({ initialPath: "a" });
  let route!: AutoRouteContextValue;
  function Content() {
    route = useAutoRoute({ children: ["a", "b"] });
    return null;
  }
  render(
    <AutoNavigationProvider navigation={nav}>
      <Content />
    </AutoNavigationProvider>,
  );
  expect(route.signal.aborted).toBe(false);
  await act(async () => {
    await nav.goto("a");
  });
  expect(route.signal.aborted).toBe(false);
});
test("destroy aborts signal after first navigation", async () => {
  const nav = createAutoNavigation({ initialPath: "a" });
  let route!: AutoRouteContextValue;
  function Content() {
    route = useAutoRoute({ children: ["a", "b"] });
    return null;
  }
  render(
    <AutoNavigationProvider navigation={nav}>
      <Content />
    </AutoNavigationProvider>,
  );
  await act(async () => {
    await nav.goto("b");
  });
  expect(route.signal.aborted).toBe(false);
  act(() => nav.destroy());
  expect(route.signal.aborted).toBe(true);
});
test("local permissions apply to route node itself", async () => {
  const nav = createAutoNavigation();
  function Content() {
    useAutoRoute({ name: "private", permissions: ["secret"] });
    return null;
  }
  render(
    <AutoNavigationProvider navigation={nav}>
      <AutoConfigProvider
        config={{ canAccess: (a) => !a.permissions?.includes("secret") }}
      >
        <Content />
      </AutoConfigProvider>
    </AutoNavigationProvider>,
  );
  let status: string | undefined;
  await act(async () => {
    status = (await nav.goto("private")).status;
  });
  expect(status).toBe("forbidden");
});
test("entering lazy nested group resolves its default", async () => {
  const nav = createAutoNavigation({ initialPath: "tabs:one" });
  render(
    <AutoNavigationProvider navigation={nav}>
      <AutoTabs
        route={{ name: "tabs" }}
        lazy
        keepMounted
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
    </AutoNavigationProvider>,
  );
  await act(async () => {
    await nav.goto("tabs:two");
  });
  expect(nav.pathString).toBe("tabs:two:child");
});
test("newly lazy mounted route has live signal after transition commits", async () => {
  const nav = createAutoNavigation({ initialPath: "tabs:one" });
  let route!: AutoRouteContextValue;
  function Content() {
    route = useAutoRoute();
    return <div>Details</div>;
  }
  render(
    <AutoNavigationProvider navigation={nav}>
      <AutoTabs
        route={{ name: "tabs" }}
        lazy
        keepMounted={false}
        items={[
          { id: "one", label: "One", content: "first" },
          {
            id: "two",
            label: "Two",
            children: [{ id: "child", label: "Child", content: <Content /> }],
          },
        ]}
      />
    </AutoNavigationProvider>,
  );
  let pending!: Promise<AutoNavigationResult>;
  act(() => {
    pending = nav.goto("tabs:two:child", { timeoutMs: 100 });
  });
  await act(async () => {
    await pending;
  });
  expect(nav.pathString).toBe("tabs:two:child");
  expect(route.signal.aborted).toBe(false);
});
