import { StrictMode } from "react";
import { renderToString } from "react-dom/server";
import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { AutoConfigProvider } from "../src/core/AutoConfigProvider";
import {
  AutoTabs,
  useAutoTabsWorkspace,
  type AutoTabsWorkspaceOptions,
  type AutoWorkspacePage,
} from "../src/components/AutoTabs";

afterEach(() => sessionStorage.clear());

const pages: Record<string, AutoWorkspacePage> = {
  home: { title: "Home", render: () => "Home content" },
  order: {
    title: "Order",
    render: ({ tab, setState }) => (
      <input
        aria-label="Order draft"
        value={typeof tab.state === "string" ? tab.state : ""}
        onChange={(event) => setState(event.target.value)}
      />
    ),
  },
};
const defaults: AutoTabsWorkspaceOptions = {
  workspaceId: "test",
  pages,
  defaultTabs: [{ id: "home", page: "home", pinned: true }],
};
const storageKey = "auto:tabs:test";

test("opening, switching and remounting restore order, selection, parameters and explicit page state", async () => {
  let workspace!: ReturnType<typeof useAutoTabsWorkspace>;
  function App() {
    workspace = useAutoTabsWorkspace(defaults);
    return <AutoTabs {...workspace.tabsProps} />;
  }
  const first = render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  act(() => {
    expect(
      workspace.open({ id: "order:1", page: "order", params: { orderId: 1 } }),
    ).toBe(true);
    expect(
      workspace.open({ id: "order:2", page: "order", params: { orderId: 2 } }),
    ).toBe(true);
    workspace.activate("order:1");
  });
  await userEvent.type(screen.getByLabelText("Order draft"), "Save draft");
  act(() => {
    workspace.activate("home");
    // Duplicate open keeps original parameters and draft.
    workspace.open({ id: "order:1", page: "order", params: { orderId: 999 } });
  });
  expect(workspace.tabs).toHaveLength(3);
  first.unmount();
  render(<App />);
  expect(workspace.tabs.map((tab) => tab.id)).toEqual([
    "home",
    "order:1",
    "order:2",
  ]);
  expect(workspace.activeId).toBe("order:1");
  expect(workspace.tabs[1].params).toEqual({ orderId: 1 });
  expect(screen.getByLabelText("Order draft")).toHaveValue("Save draft");
  expect(
    screen.getByRole("tab", { name: "Order", selected: true }),
  ).toBeInTheDocument();
});

test("closing uses right then left neighbors, persists removal, and protects pinned tabs", async () => {
  const { result } = renderHook(() => useAutoTabsWorkspace(defaults));
  act(() => {
    result.current.open({ id: "a", page: "order" });
    result.current.open({ id: "b", page: "order" });
    result.current.open({ id: "c", page: "order" });
    result.current.activate("b");
  });
  await act(async () => {
    expect(await result.current.close("b")).toBe(true);
  });
  expect(result.current.activeId).toBe("c");
  await act(async () => {
    await result.current.close("c");
  });
  expect(result.current.activeId).toBe("a");
  await act(async () => {
    expect(await result.current.close("home")).toBe(false);
  });
  expect(
    JSON.parse(sessionStorage.getItem(storageKey)!).tabs.map(
      (tab: { id: string }) => tab.id,
    ),
  ).toEqual(["home", "a"]);
});

test("restoration validates version, descriptors, permissions, duplicate ids and active selection", () => {
  sessionStorage.setItem(
    storageKey,
    JSON.stringify({
      version: 1,
      activeId: "secret",
      tabs: [
        null,
        { id: "bad", page: "missing" },
        { id: "proto", page: "toString" },
        { id: "secret", page: "secret" },
        { id: "invalid", page: "order", params: "invalid" },
        { id: "a", page: "order", params: { orderId: 1 } },
        { id: "a", page: "order" },
      ],
    }),
  );
  const registry = {
    ...pages,
    order: {
      ...pages.order,
      validate: (tab: { params?: unknown }) => typeof tab.params === "object",
    },
    secret: { ...pages.home, permissions: ["secret"] },
  };
  const { result } = renderHook(
    () => useAutoTabsWorkspace({ ...defaults, pages: registry }),
    {
      wrapper: ({ children }) => (
        <AutoConfigProvider
          config={{
            canAccess: (access) => !access.permissions?.includes("secret"),
          }}
        >
          {children}
        </AutoConfigProvider>
      ),
    },
  );
  expect(result.current.tabs.map((tab) => tab.id)).toEqual(["a", "home"]);
  expect(result.current.activeId).toBe("a");
  expect(JSON.parse(sessionStorage.getItem(storageKey)!).activeId).toBe("a");
});

test.each(["{broken", JSON.stringify({ version: 99, tabs: [] })])(
  "corrupt or incompatible storage falls back to defaults: %s",
  (stored) => {
    sessionStorage.setItem(storageKey, stored);
    const { result } = renderHook(() => useAutoTabsWorkspace(defaults));
    expect(result.current.ready).toBe(true);
    expect(result.current.activeId).toBe("home");
  },
);

test("registry and access changes remove stale tabs and synchronize selection", () => {
  const { result, rerender } = renderHook(
    ({ registry }) => useAutoTabsWorkspace({ ...defaults, pages: registry }),
    { initialProps: { registry: pages } },
  );
  act(() => {
    result.current.open({ id: "a", page: "order" });
  });
  rerender({
    registry: { ...pages, order: { ...pages.order, disabled: true } },
  });
  expect(result.current.activeId).toBe("home");
  expect(result.current.activate("a")).toBe(false);
  rerender({ registry: { home: pages.home } });
  expect(result.current.tabs.map((tab) => tab.id)).toEqual(["home"]);
  expect(JSON.parse(sessionStorage.getItem(storageKey)!).tabs).toHaveLength(1);
});

test("workspace key and storage changes restore independently without copying the previous workspace", () => {
  const { result, rerender } = renderHook(
    ({ id, storage }: { id: string; storage: "session" | "local" }) =>
      useAutoTabsWorkspace({ ...defaults, workspaceId: id, storage }),
    { initialProps: { id: "one", storage: "session" } },
  );
  act(() => {
    result.current.open({ id: "a", page: "order" });
  });
  rerender({ id: "two", storage: "session" });
  expect(result.current.activeId).toBe("home");
  rerender({ id: "one", storage: "session" });
  expect(result.current.activeId).toBe("a");
  rerender({ id: "one", storage: "local" });
  expect(result.current.activeId).toBe("home");
  expect(localStorage.getItem("auto:tabs:one")).not.toBeNull();
});

test("storage failures keep operations usable in memory and notify the host", () => {
  const error = new Error("storage unavailable");
  const onPersistenceError = vi.fn();
  const storage = {
    get: () => {
      throw error;
    },
    set: () => {
      throw error;
    },
    remove: vi.fn(),
  };
  const { result } = renderHook(() =>
    useAutoTabsWorkspace({ ...defaults, storage, onPersistenceError }),
  );
  act(() => {
    expect(result.current.open({ id: "a", page: "order" })).toBe(true);
  });
  expect(result.current.activeId).toBe("a");
  expect(onPersistenceError).toHaveBeenCalledWith(error);
});

test("asynchronous guards deduplicate closes and protect drafts changed while waiting", async () => {
  let resolve!: (value: boolean) => void;
  const beforeClose = vi.fn(
    () =>
      new Promise<boolean>((done) => {
        resolve = done;
      }),
  );
  const { result } = renderHook(() =>
    useAutoTabsWorkspace({ ...defaults, beforeClose }),
  );
  act(() => {
    result.current.open({ id: "a", page: "order" });
  });
  let pending!: Promise<boolean>;
  act(() => {
    pending = result.current.close("a");
  });
  expect(await result.current.close("a")).toBe(false);
  expect(beforeClose).toHaveBeenCalledTimes(1);
  act(() => {
    result.current.setTabState("a", "new draft");
  });
  await act(async () => {
    resolve(true);
    expect(await pending).toBe(false);
  });
  expect(result.current.activeId).toBe("a");
  act(() => {
    pending = result.current.close("a");
  });
  await act(async () => {
    resolve(false);
    expect(await pending).toBe(false);
  });
  act(() => {
    pending = result.current.close("a");
  });
  await act(async () => {
    resolve(true);
    expect(await pending).toBe(true);
  });
  expect(result.current.activeId).toBe("home");
});

test("page renderers mount only on first visit and local state survives tab switches", async () => {
  const renderA = vi.fn(() => <input aria-label="local draft" />);
  const renderB = vi.fn(() => "second page");
  function App() {
    const workspace = useAutoTabsWorkspace({
      workspaceId: "lazy",
      defaultTabs: [
        { id: "a", page: "a" },
        { id: "b", page: "b" },
      ],
      pages: {
        a: { title: "A", render: renderA },
        b: { title: "B", render: renderB },
      },
    });
    return <AutoTabs {...workspace.tabsProps} />;
  }
  render(<App />);
  expect(renderA).toHaveBeenCalled();
  expect(renderB).not.toHaveBeenCalled();
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("local draft"), "keep");
  await user.click(screen.getByRole("tab", { name: "B" }));
  await user.click(screen.getByRole("tab", { name: "A" }));
  expect(screen.getByLabelText("local draft")).toHaveValue("keep");
  await user.click(screen.getByRole("button", { name: "Close B" }));
  expect(screen.queryByRole("tab", { name: "B" })).not.toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "A" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(document.querySelector("button button")).toBeNull();
});

test("invalid runtime JSON is rejected and an empty workspace stays empty on refresh", async () => {
  const options = { workspaceId: "empty", pages };
  const first = renderHook(() => useAutoTabsWorkspace(options));
  act(() => {
    expect(
      first.result.current.open({ id: "bad", page: "order", params: NaN }),
    ).toBe(false);
    first.result.current.open({ id: "a", page: "order" });
    expect(first.result.current.setTabState("a", Infinity)).toBe(false);
  });
  await act(async () => {
    await first.result.current.close("a");
  });
  first.unmount();
  const next = renderHook(() => useAutoTabsWorkspace(options));
  expect(next.result.current.tabs).toEqual([]);
  expect(next.result.current.activeId).toBeUndefined();
});

test("server rendering does not read browser storage or mount pages before restoration", () => {
  const storage = { get: vi.fn(), set: vi.fn(), remove: vi.fn() };
  function App() {
    const workspace = useAutoTabsWorkspace({ ...defaults, storage });
    return <AutoTabs {...workspace.tabsProps} />;
  }
  expect(renderToString(<App />)).not.toContain("Home content");
  expect(storage.get).not.toHaveBeenCalled();
});

test("a pending close cannot write after switching workspace", async () => {
  let resolve!: (allowed: boolean) => void;
  const beforeClose = () =>
    new Promise<boolean>((done) => {
      resolve = done;
    });
  const { result, rerender } = renderHook(
    ({ workspaceId }) =>
      useAutoTabsWorkspace({ ...defaults, workspaceId, beforeClose }),
    { initialProps: { workspaceId: "first" } },
  );
  act(() => {
    result.current.open({ id: "a", page: "order" });
  });
  const pending = result.current.close("a");
  rerender({ workspaceId: "second" });
  await act(async () => {
    resolve(true);
    expect(await pending).toBe(false);
  });
  expect(JSON.parse(sessionStorage.getItem("auto:tabs:first")!).activeId).toBe(
    "a",
  );
  expect(result.current.activeId).toBe("home");
});

test("a rejected close guard releases the lock and preserves the tab", async () => {
  const beforeClose = vi
    .fn()
    .mockRejectedValueOnce(new Error("cancelled"))
    .mockResolvedValue(true);
  const { result } = renderHook(() =>
    useAutoTabsWorkspace({ ...defaults, beforeClose }),
  );
  act(() => {
    result.current.open({ id: "a", page: "order" });
  });
  await expect(result.current.close("a")).rejects.toThrow("cancelled");
  expect(result.current.activeId).toBe("a");
  await act(async () => {
    expect(await result.current.close("a")).toBe(true);
  });
});

test("memory-only mode skips persistence and custom adapters receive namespaced JSON", () => {
  const first = renderHook(() =>
    useAutoTabsWorkspace({ ...defaults, storage: false }),
  );
  act(() => {
    first.result.current.open({ id: "a", page: "order" });
  });
  expect(sessionStorage.getItem(storageKey)).toBeNull();
  const storage = { get: vi.fn(), set: vi.fn(), remove: vi.fn() };
  renderHook(() => useAutoTabsWorkspace({ ...defaults, storage }), {
    wrapper: ({ children }) => (
      <AutoConfigProvider config={{ namespace: "user:42" }}>
        {children}
      </AutoConfigProvider>
    ),
  });
  expect(storage.get).toHaveBeenCalledWith("user:42:tabs:test");
  expect(storage.set).toHaveBeenCalledWith(
    "user:42:tabs:test",
    expect.objectContaining({ version: 1, activeId: "home" }),
  );
});

test("nested close requests report the full path and Delete works without activating a different tab", async () => {
  const onClose = vi.fn();
  const onChange = vi.fn();
  const child = {
    id: "child",
    label: "Child",
    closable: true,
    content: "child content",
  };
  render(
    <AutoTabs
      items={[{ id: "parent", label: "Parent", children: [child] }]}
      onClose={onClose}
      onChange={onChange}
    />,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Close Child" }));
  expect(onClose).toHaveBeenCalledWith(["parent", "child"], child);
  expect(onChange).not.toHaveBeenCalled();
  act(() => {
    screen.getByRole("tab", { name: "Child" }).focus();
  });
  onClose.mockClear();
  await user.keyboard("{Delete}");
  expect(onClose).toHaveBeenCalledWith(["parent", "child"], child);
});

test("lazy panels honor keepMounted=false and forget removed panel instances", async () => {
  const items = [
    { id: "a", label: "A", content: <input aria-label="temporary draft" /> },
    { id: "b", label: "B", content: "B content" },
  ];
  const { rerender } = render(
    <AutoTabs items={items} lazy keepMounted={false} />,
  );
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("temporary draft"), "discard");
  await user.click(screen.getByRole("tab", { name: "B" }));
  expect(screen.queryByLabelText("temporary draft")).not.toBeInTheDocument();
  await user.click(screen.getByRole("tab", { name: "A" }));
  expect(screen.getByLabelText("temporary draft")).toHaveValue("");
  rerender(<AutoTabs items={[items[1]]} lazy />);
  rerender(<AutoTabs items={items} lazy value={["b"]} />);
  expect(screen.queryByLabelText("temporary draft")).not.toBeInTheDocument();
});
