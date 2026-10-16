import { Component, Profiler, type ReactNode } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { AutoDialog, AutoTable, AutoTabs, type TableQuery } from "../src/index";
import { decodeLocation } from "../src/core/navigation/history";
const columns = [{ key: "name" as const, label: "Name" }];
const query: TableQuery = {
  pageIndex: 3,
  pageSize: 10,
  sort: [{ id: "name", desc: true }],
  filter: { kind: "condition", field: "name", operator: "eq", value: "beta" },
};
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

test("controlled source replacement proposes reset without fetching an unaccepted page", async () => {
  const a = vi.fn(async (_q: TableQuery) => ({
    rows: [{ id: "a", name: "A" }],
    total: 100,
  }));
  const b = vi.fn(async (_q: TableQuery) => ({
    rows: [{ id: "b", name: "B" }],
    total: 100,
  }));
  const change = vi.fn();
  const props = {
    id: "source-owner",
    columns,
    rowKey: "id" as const,
    query,
    onQueryChange: change,
    virtual: false,
  };
  const view = render(<AutoTable {...props} dataSource={a} />);
  await screen.findByText("A");
  view.rerender(<AutoTable {...props} dataSource={b} />);
  await screen.findByText("B");
  expect(change).toHaveBeenCalledWith({ ...query, pageIndex: 0 });
  expect(b.mock.calls.map(([q]) => q.pageIndex)).toEqual([3]);
});

test("applying unchanged controlled settings retains the active query instead of old presets", async () => {
  const u = userEvent.setup();
  const change = vi.fn();
  const controlled = { ...query, pageIndex: 0 };
  render(
    <AutoTable
      id="settings-owner"
      columns={columns}
      rowKey="id"
      data={[{ id: "1", name: "beta" }]}
      query={controlled}
      onQueryChange={change}
      virtual={false}
    />,
  );
  await u.click(screen.getByText("Settings"));
  await u.click(screen.getByTestId("rac-ok"));
  await waitFor(() => expect(change).toHaveBeenCalledTimes(1));
  expect(change.mock.calls[0][0]).toEqual(controlled);
});

test("a replaced dialog cannot run its old beforeClose callback after submit resolves", async () => {
  const gate = deferred<void>();
  const submit = vi.fn(() => gate.promise);
  const beforeClose = vi.fn(() => true);
  const changed = vi.fn();
  const fields = [{ name: "name" as const, label: "Name" }];
  const u = userEvent.setup();
  const view = render(
    <AutoDialog
      open
      onOpenChange={changed}
      title="A"
      draftKey="late-a"
      fields={fields}
      defaultValue={{ name: "A" }}
      onSubmit={submit}
      beforeClose={beforeClose}
    />,
  );
  await u.click(screen.getByTestId("rac-ok"));
  await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
  view.rerender(
    <AutoDialog
      open
      onOpenChange={changed}
      title="B"
      draftKey="late-b"
      fields={fields}
      defaultValue={{ name: "B" }}
    />,
  );
  await act(async () => {
    gate.resolve();
    await gate.promise;
  });
  expect(beforeClose).not.toHaveBeenCalled();
  expect(changed).not.toHaveBeenCalled();
  expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("B");
});

test("a replaced dialog's pending field validation never submits the previous record", async () => {
  const gate = deferred<undefined>();
  const rule = vi.fn(() => gate.promise);
  const submit = vi.fn();
  const u = userEvent.setup();
  const view = render(
    <AutoDialog
      open
      onOpenChange={() => {}}
      title="A"
      draftKey="validation-a"
      fields={[{ name: "name", label: "Name", rules: [rule] }]}
      defaultValue={{ name: "A" }}
      onSubmit={submit}
    />,
  );
  await u.click(screen.getByTestId("rac-ok"));
  await waitFor(() => expect(rule).toHaveBeenCalled());
  view.rerender(
    <AutoDialog
      open
      onOpenChange={() => {}}
      title="B"
      draftKey="validation-b"
      fields={[{ name: "name", label: "Name" }]}
      defaultValue={{ name: "B" }}
    />,
  );
  await act(async () => {
    gate.resolve(undefined);
    await gate.promise;
  });
  expect(submit).not.toHaveBeenCalled();
  expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("B");
});

test.each([
  ["/%E7%AE%A1%E7%90%86/%E7%A9%BA%20%E9%97%B4?tab=x", "/管理/空 间"],
  ["/管理/空 间?tab=x", "/%E7%AE%A1%E7%90%86/%E7%A9%BA%20%E9%97%B4"],
  ["/a%2fb?tab=x", "/a%2Fb"],
])("exact encoded base preserves query params: %s", (url, prefix) => {
  expect(decodeLocation(url, prefix)).toEqual({
    path: [],
    params: { tab: "x" },
  });
});
test("encoded slash in a base segment never matches an actual slash boundary", () => {
  expect(decodeLocation("/a/b/child?tab=x", "/a%2Fb")).toEqual({
    path: [],
    params: {},
  });
});

class CommitBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
test("missing tabs source settles under flushed internal commits", async () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  let commits = 0;
  const view = render(
    <CommitBoundary>
      <Profiler
        id="missing-source"
        onRender={() => {
          if (++commits > 30) throw new Error("commit bound");
        }}
      >
        <AutoTabs source="missing-internal-commits" />
      </Profiler>
    </CommitBoundary>,
  );
  try {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });
    expect(commits).toBeLessThanOrEqual(30);
    expect(screen.getByRole("alert")).toHaveTextContent(
      'source "missing-internal-commits" is not registered',
    );
  } finally {
    view.unmount();
    error.mockRestore();
  }
});
