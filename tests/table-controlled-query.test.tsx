import { useState } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { AutoTable, type TableQuery } from "../src/index";

const data = [
  { id: "1", n: "alpha" },
  { id: "2", n: "beta" },
  { id: "3", n: "gamma" },
];
const columns = [{ key: "n" as const, label: "N" }];

function rowTexts(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("tbody tr")).map(
    (tr) => tr.textContent,
  );
}

const desc = (q?: Partial<TableQuery>): TableQuery => ({
  pageIndex: 0,
  pageSize: 10,
  sort: [{ id: "n", desc: true }],
  filter: { kind: "group", operator: "and", children: [] },
  ...q,
});

test("controlled initial query sort and filter are honored", () => {
  const { container } = render(
    <AutoTable
      id="ctrl-table"
      data={data}
      columns={columns}
      rowKey="id"
      virtual={false}
      query={desc({
        filter: {
          kind: "group",
          operator: "and",
          children: [
            {
              kind: "condition",
              field: "n",
              operator: "in",
              value: ["alpha", "gamma"],
            },
          ],
        },
      })}
    />,
  );
  // in [alpha, gamma], then descending -> gamma, alpha
  expect(rowTexts(container)).toEqual(["gamma", "alpha"]);
});

test("controlled rerender follows the parent query", () => {
  const { container, rerender } = render(
    <AutoTable
      id="ctrl-table"
      data={data}
      columns={columns}
      rowKey="id"
      virtual={false}
      query={desc()}
    />,
  );
  expect(rowTexts(container)).toEqual(["gamma", "beta", "alpha"]);
  rerender(
    <AutoTable
      id="ctrl-table"
      data={data}
      columns={columns}
      rowKey="id"
      virtual={false}
      query={desc({ sort: [{ id: "n", desc: false }] })}
    />,
  );
  expect(rowTexts(container)).toEqual(["alpha", "beta", "gamma"]);
});

test("header sort click without parent acceptance only proposes", () => {
  const onQueryChange = vi.fn();
  const { container } = render(
    <AutoTable
      id="ctrl-table"
      data={data}
      columns={columns}
      rowKey="id"
      virtual={false}
      query={desc({ sort: [] })}
      onQueryChange={onQueryChange}
    />,
  );
  fireEvent.click(screen.getByText("N"));
  expect(onQueryChange).toHaveBeenCalledTimes(1);
  const proposed = onQueryChange.mock.calls[0][0] as TableQuery;
  expect(proposed.sort).toEqual([{ id: "n", desc: false }]);
  // UI/data must not move until the parent accepts.
  expect(rowTexts(container)).toEqual(["alpha", "beta", "gamma"]);
});

test("header sort click applies when the parent accepts the proposal", () => {
  function Host() {
    const [query, setQuery] = useState<TableQuery>(desc({ sort: [] }));
    return (
      <AutoTable
        id="ctrl-table"
        data={data}
        columns={columns}
        rowKey="id"
        virtual={false}
        query={query}
        onQueryChange={setQuery}
      />
    );
  }
  const { container } = render(<Host />);
  fireEvent.click(screen.getByRole("button", { name: "Sort N" }));
  fireEvent.click(screen.getByRole("button", { name: "Sort N" }));
  expect(rowTexts(container)).toEqual(["gamma", "beta", "alpha"]);
});

test("remote dataSource receives the controlled query", async () => {
  const dataSource = vi.fn(async (_query: TableQuery) => ({
    rows: data,
    total: 3,
  }));
  const query = desc({
    filter: {
      kind: "group",
      operator: "and",
      children: [
        { kind: "condition", field: "n", operator: "eq", value: "beta" },
      ],
    },
  });
  render(
    <AutoTable
      id="ctrl-table"
      dataSource={dataSource}
      columns={columns}
      rowKey="id"
      virtual={false}
      query={query}
    />,
  );
  await waitFor(() => expect(dataSource).toHaveBeenCalled());
  const received = dataSource.mock.calls[0][0] as TableQuery;
  expect(received.sort).toEqual([{ id: "n", desc: true }]);
  expect(received.filter).toEqual(query.filter);
});

test("uncontrolled sorting still works", () => {
  const { container } = render(
    <AutoTable
      id="unctrl-table"
      data={data}
      columns={columns}
      rowKey="id"
      virtual={false}
    />,
  );
  expect(rowTexts(container)).toEqual(["alpha", "beta", "gamma"]);
  fireEvent.click(screen.getByRole("button", { name: "Sort N" }));
  fireEvent.click(screen.getByRole("button", { name: "Sort N" }));
  expect(rowTexts(container)).toEqual(["gamma", "beta", "alpha"]);
});
