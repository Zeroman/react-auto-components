import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { test, expect, beforeAll } from "vitest";
import { AutoTable, type AutoColumn } from "../src";

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

interface Node {
  id: string;
  name: string;
  children?: Node[];
}
const data: Node[] = [
  { id: "1", name: "Root", children: [{ id: "1-child", name: "Child" }] },
  { id: "2", name: "Other" },
];
const columns: AutoColumn<Node>[] = [
  { key: "name", label: "Name", sortable: true },
];

test("repro: virtual + tree + renderExpanded", async () => {
  render(
    <AutoTable<Node>
      id="repro"
      rowKey="id"
      data={data}
      columns={columns}
      virtual={false}
      getChildren={(row) => row.children}
      renderExpanded={(row) => (
        <div data-testid="expanded-detail">{row.id} detail</div>
      )}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: "Expand row 1" }));
  expect(await screen.findByTestId("expanded-detail")).toBeInTheDocument();
});
