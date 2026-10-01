import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AutoTable } from "../src/components/AutoTable";
test("tree expansion and merged cells render the right rows", async () => {
  type Node = { id: string; name: string; group: string; children?: Node[] };
  const rows: Node[] = [
    {
      id: "1",
      name: "父",
      group: "A",
      children: [{ id: "1.1", name: "子", group: "B" }],
    },
    { id: "2", name: "同组", group: "A" },
  ];
  const u = userEvent.setup();
  const { container } = render(
    <AutoTable
      id="tree"
      data={rows}
      rowKey="id"
      columns={[{ key: "name" }, { key: "group", merge: true }]}
      getChildren={(r) => r.children}
      pagination={false}
    />,
  );
  expect(container.querySelector("[data-virtual]")).toHaveAttribute(
    "data-virtual",
    "false",
  );
  expect(screen.getByText("A").closest("td")).toHaveAttribute("rowspan", "2");
  await u.click(screen.getByLabelText("展开行 1"));
  expect(screen.getByText("子")).toBeVisible();
});
test("default hidden column can be enabled in settings", async () => {
  const u = userEvent.setup();
  render(
    <AutoTable
      id="hidden"
      data={[{ id: "1", name: "甲" }]}
      rowKey="id"
      columns={[
        { key: "id", label: "编号", hidden: true },
        { key: "name", label: "姓名" },
      ]}
      virtual={false}
    />,
  );
  expect(
    screen.queryByRole("button", { name: "排序 编号" }),
  ).not.toBeInTheDocument();
  await u.click(screen.getByText("设置"));
  await u.click(screen.getByLabelText("编号", { exact: true }));
  await u.click(screen.getByText("确定"));
  expect(screen.getByRole("button", { name: "排序 编号" })).toBeVisible();
});

test("merged groups break at expanded detail rows", async () => {
  const u = userEvent.setup();
  const { container } = render(
    <AutoTable
      id="merge-details"
      data={[
        { id: "1", group: "A" },
        { id: "2", group: "A" },
      ]}
      rowKey="id"
      columns={[{ key: "group", merge: true }]}
      renderExpanded={(r) => <p>详情{r.id}</p>}
      pagination={false}
    />,
  );
  await u.click(screen.getByLabelText("展开行 1"));
  expect(
    container.querySelector('tr[data-row-id="1"] td[rowspan]'),
  ).toHaveAttribute("rowspan", "1");
  expect(
    container.querySelector('tr[data-row-id="2"] td[rowspan]'),
  ).toHaveTextContent("A");
});
