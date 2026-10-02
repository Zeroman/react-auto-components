import { test, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AutoDialogProvider,
  useAutoDialog,
} from "../src/components/AutoDialog";
function Launcher({
  submit,
}: {
  submit: (v: { name: string }) => Promise<void>;
}) {
  const dialog = useAutoDialog();
  return (
    <button
      onClick={() =>
        dialog.open({
          title: "Edit user",
          fields: [{ name: "name", label: "Name", required: true }],
          defaultValue: { name: "" },
          draftKey: "user",
          onSubmit: submit,
        })
      }
    >
      Open
    </button>
  );
}
test("failed submit preserves input, cancel saves draft, successful submit clears it", async () => {
  const submit = vi
      .fn()
      .mockRejectedValueOnce(new Error("Save failed"))
      .mockResolvedValue(undefined),
    u = userEvent.setup();
  render(
    <AutoDialogProvider>
      <Launcher submit={submit} />
    </AutoDialogProvider>,
  );
  await u.click(screen.getByText("Open"));
  await u.type(screen.getByRole("textbox", { name: "Name" }), "Zhang San");
  await u.click(screen.getByText("OK"));
  expect(await screen.findByText("Save failed")).toBeVisible();
  expect(screen.getByRole("dialog")).toBeVisible();
  await u.click(screen.getByText("Cancel"));
  await u.click(screen.getByText("Open"));
  expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue(
    "Zhang San",
  );
  await u.click(screen.getByText("OK"));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  await u.click(screen.getByText("Open"));
  expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("");
});
