import { StrictMode, useEffect } from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import {
  AutoConfigProvider,
  AutoNavigationProvider,
  AutoTabs,
  createAutoNavigation,
  useAutoRoute,
} from "../src/index";
import { setupHashSync } from "../src/core/navigation/hashSync";

afterEach(() => vi.restoreAllMocks());

test("route selection respects provider permissions with an externally created navigation", async () => {
  const navigation = createAutoNavigation({ initialPath: "workspace:public" });
  render(
    <AutoConfigProvider
      config={{
        canAccess: (access) => !access.permissions?.includes("private.read"),
      }}
    >
      <AutoNavigationProvider navigation={navigation}>
        <AutoTabs
          route={{ name: "workspace", defaultChild: "public" }}
          items={[
            { id: "public", label: "Public", content: "Public content" },
            {
              id: "private",
              label: "Private",
              permissions: ["private.read"],
              content: "Private content",
            },
          ]}
        />
      </AutoNavigationProvider>
    </AutoConfigProvider>,
  );
  expect(screen.queryByRole("tab", { name: "Private" })).toBeNull();
  let status: string | undefined;
  await act(async () => {
    status = (await navigation.goto("workspace:private", { timeoutMs: 40 }))
      .status;
  });
  expect(status).toBe("forbidden");
  expect(navigation.getPathString()).toBe("workspace:public");
});

test("removing the selected declared child reconciles state and aborts its signal", async () => {
  const navigation = createAutoNavigation({ initialPath: "reports" });
  function Container({ reports }: { reports: boolean }) {
    const route = useAutoRoute({
      defaultChild: "summary",
      children: reports ? ["summary", "reports"] : ["summary"],
    });
    return <output data-testid="selected-child">{route.activeChild}</output>;
  }
  const view = render(
    <AutoNavigationProvider navigation={navigation}>
      <Container reports />
    </AutoNavigationProvider>,
  );
  const signal = navigation.getSignal();
  view.rerender(
    <AutoNavigationProvider navigation={navigation}>
      <Container reports={false} />
    </AutoNavigationProvider>,
  );
  expect(navigation.getPath()).toEqual(["summary"]);
  expect(screen.getByTestId("selected-child")).toHaveTextContent("summary");
  expect(signal.aborted).toBe(true);
});

test("destroy settles an in-flight navigation rather than leaving a pending promise", async () => {
  const navigation = createAutoNavigation({ readyTimeoutMs: 500 });
  const unregister = navigation.registerNode({
    id: "review-root",
    ticketId: 1,
    parentPath: [],
    routePath: [],
    getChildren: () => [{ id: "lazy" }],
  });
  const pending = navigation.goto("lazy:details");
  navigation.destroy();
  const result = await Promise.race([
    pending,
    new Promise<{ status: string }>((resolve) =>
      setTimeout(() => resolve({ status: "unsettled" }), 30),
    ),
  ]);
  expect(result.status).toBe("cancelled");
  unregister();
});

test("hash sync records ordinary goto in history and replace without a second entry", async () => {
  window.history.replaceState(null, "", "/");
  const navigation = createAutoNavigation();
  navigation.registerNode({
    id: "workspace-node",
    ticketId: 1,
    parentPath: [],
    routePath: ["workspace"],
    getChildren: () => [{ id: "list" }, { id: "details" }],
  });
  const push = vi.spyOn(window.history, "pushState");
  const replace = vi.spyOn(window.history, "replaceState");
  const detach = setupHashSync(navigation);
  try {
    await navigation.goto("workspace:list", {
      params: { term: "中文 & text" },
    });
    expect(push).toHaveBeenCalledTimes(1);
    await navigation.replace("workspace:details", { params: { id: "42" } });
    expect(push).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(
      new URLSearchParams(window.location.hash.split("?")[1]).get("id"),
    ).toBe("42");
  } finally {
    detach();
    navigation.destroy();
    window.history.replaceState(null, "", "/");
  }
});

test("StrictMode effect replay provides a live signal to initial route content", () => {
  const navigation = createAutoNavigation({ initialPath: "details" });
  const signals: AbortSignal[] = [];
  function Content() {
    const route = useAutoRoute();
    useEffect(() => {
      signals.push(route.signal);
    }, [route.signal]);
    return <div>Details</div>;
  }
  render(
    <StrictMode>
      <AutoNavigationProvider navigation={navigation}>
        <Content />
      </AutoNavigationProvider>
    </StrictMode>,
  );
  expect(signals.at(-1)?.aborted).toBe(false);
});

test("real nested AutoTabs route content resolves its child path without repeating ancestors", async () => {
  const navigation = createAutoNavigation({
    initialPath: "workspace:main:one",
  });
  render(
    <AutoNavigationProvider navigation={navigation}>
      <AutoTabs
        route={{ name: "workspace" }}
        items={[
          {
            id: "main",
            label: "Main",
            defaultActive: "one",
            children: [
              { id: "one", label: "One", content: "First panel" },
              { id: "two", label: "Two", content: "Second panel" },
            ],
          },
        ]}
      />
    </AutoNavigationProvider>,
  );
  let status: string | undefined;
  await act(async () => {
    status = (await navigation.goto("workspace:main:two", { timeoutMs: 40 }))
      .status;
  });
  expect(status).toBe("success");
  expect(navigation.getPathString()).toBe("workspace:main:two");
  expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(screen.getByText("Second panel")).toBeVisible();
});
