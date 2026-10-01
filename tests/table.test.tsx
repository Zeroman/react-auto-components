import { test, expect, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AutoTable } from "../src/components/AutoTable";
const data = [
  { id: "1", name: "甲", age: 20 },
  { id: "2", name: "乙", age: 10 },
  { id: "3", name: "丙", age: 30 },
];
test("sorting paging and selection keep stable row identity", async () => {
  const u = userEvent.setup();
  render(
    <AutoTable
      id="people"
      data={data}
      rowKey="id"
      columns={[
        { key: "name", label: "姓名" },
        { key: "age", label: "年龄", sortable: true },
      ]}
      pageSize={2}
      virtual={false}
    />,
  );
  expect(screen.queryByText("丙")).not.toBeInTheDocument();
  await u.click(screen.getByRole("button", { name: "排序 年龄" }));
  const rows = screen.getAllByRole("row");
  expect(within(rows[1]).getByText("乙")).toBeVisible();
  await u.click(screen.getByLabelText("选择行 2"));
  expect(screen.getByText("已选 1 项")).toBeVisible();
  await u.click(screen.getByRole("button", { name: "下一页" }));
  expect(screen.getByText("丙")).toBeVisible();
});
test("server mode does not slice returned pages again and ignores stale requests", async () => {
  const source = vi
    .fn()
    .mockResolvedValue({ rows: data.slice(0, 2), total: 8 });
  const u = userEvent.setup();
  render(
    <AutoTable
      id="remote"
      dataSource={source}
      rowKey="id"
      columns={[{ key: "name", label: "姓名" }]}
      pageSize={2}
      virtual={false}
    />,
  );
  await screen.findByText("甲");
  await u.click(screen.getByRole("button", { name: "下一页" }));
  await waitFor(() => expect(source).toHaveBeenCalledTimes(2));
  expect(screen.getByText("甲")).toBeVisible();
  expect(source.mock.calls[1][1].signal).toBeInstanceOf(AbortSignal);
});
