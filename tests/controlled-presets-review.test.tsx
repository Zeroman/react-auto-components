import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { AutoTable, type TableQuery } from "../src/index";

test("controlled settings still save explicitly created named presets", async () => {
  const u = userEvent.setup();
  const change = vi.fn();
  const query: TableQuery = {
    pageIndex: 0,
    pageSize: 10,
    sort: [{ id: "name", desc: true }],
    filter: { kind: "group", operator: "and", children: [] },
  };
  render(
    <AutoTable
      id="presets-owner"
      columns={[{ key: "name", label: "Name" }]}
      rowKey="id"
      data={[
        { id: "1", name: "alpha" },
        { id: "2", name: "beta" },
      ]}
      query={query}
      onQueryChange={change}
      virtual={false}
    />,
  );
  await u.click(screen.getByText("Settings"));
  await u.click(screen.getByRole("button", { name: "Sort" }));
  await u.type(
    screen.getByRole("textbox", { name: "Preset name" }),
    "Review preset",
  );
  await u.click(screen.getByRole("button", { name: "Save as new preset" }));
  await u.click(screen.getByTestId("rac-ok"));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  const saved = JSON.parse(localStorage.getItem("auto:table:presets-owner")!);
  expect(
    saved.sort.presets.find((p: { name: string }) => p.name === "Review preset")
      ?.value,
  ).toEqual([{ id: "name", desc: true }]);
  expect(change).toHaveBeenCalledWith(query);
  expect(screen.getByRole("columnheader", { name: /Name/ })).toHaveAttribute(
    "aria-sort",
    "descending",
  );
});
