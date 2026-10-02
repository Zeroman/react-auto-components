import { test, expect, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AutoTable } from "../src/components/AutoTable";
const data = [
  { id: "1", name: "A", age: 20 },
  { id: "2", name: "B", age: 10 },
  { id: "3", name: "C", age: 30 },
];
test("sorting paging and selection keep stable row identity", async () => {
  const u = userEvent.setup();
  render(
    <AutoTable
      id="people"
      data={data}
      rowKey="id"
      columns={[
        { key: "name", label: "Name" },
        { key: "age", label: "Age", sortable: true },
      ]}
      pageSize={2}
      virtual={false}
    />,
  );
  expect(screen.queryByText("C")).not.toBeInTheDocument();
  await u.click(screen.getByRole("button", { name: "Sort Age" }));
  const rows = screen.getAllByRole("row");
  expect(within(rows[1]).getByText("B")).toBeVisible();
  await u.click(screen.getByLabelText("Select row 2"));
  expect(screen.getByText("1 selected")).toBeVisible();
  await u.click(screen.getByRole("button", { name: "Next page" }));
  expect(screen.getByText("C")).toBeVisible();
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
      columns={[{ key: "name", label: "Name" }]}
      pageSize={2}
      virtual={false}
    />,
  );
  await screen.findByText("A");
  await u.click(screen.getByRole("button", { name: "Next page" }));
  await waitFor(() => expect(source).toHaveBeenCalledTimes(2));
  expect(screen.getByText("A")).toBeVisible();
  expect(source.mock.calls[1][1].signal).toBeInstanceOf(AbortSignal);
});
