import { test, expect, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AutoTable } from "../src/components/AutoTable";
import {
  reconcileSettings,
  initialSettings,
} from "../src/components/AutoTable/settings";
test("malformed persisted filter is discarded", () => {
  const s = initialSettings(["name"]);
  (s.filter.presets[0] as { value: unknown }).value = {
    kind: "group",
    children: null,
  };
  expect(() => reconcileSettings(s, ["name"], {})).not.toThrow();
  expect(reconcileSettings(s, ["name"], {}).filter.presets[0].value).toEqual({
    kind: "group",
    operator: "and",
    children: [],
  });
});
test("remote selected rows survive page changes", async () => {
  const u = userEvent.setup();
  const source = vi.fn(async (q: { pageIndex: number }) => ({
    rows: [{ id: String(q.pageIndex + 1), name: `row-${q.pageIndex + 1}` }],
    total: 2,
  }));
  render(
    <AutoTable
      id="remote-select"
      dataSource={source}
      rowKey="id"
      columns={[{ key: "name" }]}
      pageSize={1}
      virtual={false}
    />,
  );
  await screen.findByText("row-1");
  await u.click(screen.getByLabelText("选择行 1"));
  await u.click(screen.getByLabelText("下一页"));
  await screen.findByText("row-2");
  expect(screen.getByText("已选 1 项")).toBeVisible();
});
test("stale requests cannot replace current page", async () => {
  const resolve: ((v: {
    rows: { id: string; name: string }[];
    total: number;
  }) => void)[] = [];
  const source = vi.fn(
    () =>
      new Promise<{ rows: { id: string; name: string }[]; total: number }>(
        (r) => resolve.push(r),
      ),
  );
  const props = {
    id: "race",
    dataSource: source,
    rowKey: "id" as const,
    columns: [{ key: "name" as const }],
    virtual: false,
  };
  const { rerender } = render(
    <AutoTable
      {...props}
      query={{
        pageIndex: 0,
        pageSize: 1,
        sort: [],
        filter: { kind: "group", operator: "and", children: [] },
      }}
    />,
  );
  await waitFor(() => expect(resolve.length).toBe(1));
  rerender(
    <AutoTable
      {...props}
      query={{
        pageIndex: 1,
        pageSize: 1,
        sort: [],
        filter: { kind: "group", operator: "and", children: [] },
      }}
    />,
  );
  await waitFor(() => expect(resolve.length).toBe(2));
  await act(async () =>
    resolve[1]({ rows: [{ id: "2", name: "new" }], total: 2 }),
  );
  await act(async () =>
    resolve[0]({ rows: [{ id: "1", name: "old" }], total: 2 }),
  );
  expect(screen.getByText("new")).toBeVisible();
  expect(screen.queryByText("old")).not.toBeInTheDocument();
});

test("controlled settings notify the parent with the chosen sort", async () => {
  const u = userEvent.setup(),
    change = vi.fn();
  render(
    <AutoTable
      id="controlled-settings"
      data={[{ id: "1", name: "a" }]}
      rowKey="id"
      columns={[{ key: "name", label: "姓名" }]}
      virtual={false}
      query={{
        pageIndex: 0,
        pageSize: 10,
        sort: [],
        filter: { kind: "group", operator: "and", children: [] },
      }}
      onQueryChange={change}
    />,
  );
  await u.click(screen.getByText("设置"));
  await u.click(screen.getByRole("button", { name: /^排序$/ }));
  await u.click(screen.getByText("添加排序"));
  await u.click(screen.getByText("确定"));
  await waitFor(() =>
    expect(change).toHaveBeenCalledWith(
      expect.objectContaining({
        pageIndex: 0,
        sort: [{ id: "name", desc: false }],
      }),
    ),
  );
});

test("removing the last row on the last page clamps pagination", async () => {
  const u = userEvent.setup();
  const props = {
    id: "last-page",
    rowKey: "id" as const,
    columns: [{ key: "name" as const }],
    virtual: false,
    pageSize: 1,
  };
  const { rerender } = render(
    <AutoTable
      {...props}
      data={[
        { id: "1", name: "first" },
        { id: "2", name: "last" },
      ]}
    />,
  );
  await u.click(screen.getByLabelText("下一页"));
  expect(screen.getByText("last")).toBeVisible();
  rerender(<AutoTable {...props} data={[{ id: "1", name: "first" }]} />);
  await waitFor(() => expect(screen.getByText("first")).toBeVisible());
  expect(screen.getByText("第 1 / 1 页")).toBeVisible();
});

test("remote filtered summaries require explicit aggregate values", async () => {
  const props = {
    id: "remote-summary",
    rowKey: "id" as const,
    columns: [{ key: "amount" as const, summary: true }],
    dataSource: async () => ({ rows: [{ id: "1", amount: 5 }], total: 10 }),
    virtual: false,
    summaryScope: "filtered" as const,
  };
  const { container, rerender } = render(<AutoTable {...props} />);
  await screen.findByText("10 条记录");
  expect(container.querySelector("tfoot")).toHaveTextContent("—");
  expect(container.querySelector("tfoot")).not.toHaveTextContent("5");
  rerender(<AutoTable {...props} summaryValues={{ amount: 50 }} />);
  expect(container.querySelector("tfoot")).toHaveTextContent("50");
});
