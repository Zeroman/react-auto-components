import { test, expect, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AutoTable } from "../src/components/AutoTable";

test("edit dialog shows the current row, not a draft kept from an earlier Cancel", async () => {
  const user = userEvent.setup();
  const warn = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const columns = [{ key: "name", label: "Name" } as const];
  const { rerender } = render(
    <AutoTable
      id="people"
      data={[{ id: "1", name: "Alice" }]}
      rowKey="id"
      columns={columns}
      onEdit={() => undefined}
      virtual={false}
    />,
  );
  await user.click(screen.getByRole("button", { name: "Edit row 1" }));
  await user.clear(screen.getByRole("textbox", { name: "Name" }));
  await user.type(screen.getByRole("textbox", { name: "Name" }), "Stale");
  await user.click(screen.getByTestId("rac-cancel"));
  await waitFor(() => expect(screen.queryByTestId("rac-dialog")).toBeNull());
  // Cancel must not leave record data behind in storage.
  expect(
    Object.keys(localStorage).filter((key) => key.includes(":draft:")),
  ).toEqual([]);

  // The record changed on the server; reopening the editor must show it.
  rerender(
    <AutoTable
      id="people"
      data={[{ id: "1", name: "Fresh" }]}
      rowKey="id"
      columns={columns}
      onEdit={() => undefined}
      virtual={false}
    />,
  );
  await user.click(screen.getByRole("button", { name: "Edit row 1" }));
  const dialog = await screen.findByRole("dialog", { name: "Edit record" });
  expect(within(dialog).getByRole("textbox", { name: "Name" })).toHaveValue(
    "Fresh",
  );
  warn.mockRestore();
});

test("add dialog still resumes its unsaved draft after Cancel", async () => {
  const user = userEvent.setup();
  const warn = vi.spyOn(console, "error").mockImplementation(() => undefined);
  render(
    <AutoTable
      id="people"
      data={[{ id: "1", name: "Alice" }]}
      rowKey="id"
      columns={[{ key: "name", label: "Name" }]}
      onAdd={() => undefined}
      virtual={false}
    />,
  );
  await user.click(screen.getByTestId("rac-add"));
  await user.type(
    await screen.findByRole("textbox", { name: "Name" }),
    "Unsaved",
  );
  await user.click(screen.getByTestId("rac-cancel"));
  await waitFor(() => expect(screen.queryByTestId("rac-dialog")).toBeNull());
  await user.click(screen.getByTestId("rac-add"));
  expect(
    within(await screen.findByRole("dialog", { name: "Add record" })).getByRole(
      "textbox",
      { name: "Name" },
    ),
  ).toHaveValue("Unsaved");
  warn.mockRestore();
});
