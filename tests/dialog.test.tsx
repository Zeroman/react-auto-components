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

// Audit 1.6: crypto.randomUUID() throws on non-secure contexts (plain HTTP
// LAN IPs), where the API is unavailable. Opening a dialog must still work.
test("opens a dialog when crypto.randomUUID is unavailable", async () => {
  const proto = Object.getPrototypeOf(crypto) as {
    randomUUID?: () => string;
  };
  const original = proto.randomUUID;
  const hadOwn = Object.prototype.hasOwnProperty.call(proto, "randomUUID");
  const own = Object.getOwnPropertyDescriptor(crypto, "randomUUID");
  const unset = { value: undefined, configurable: true };
  if (hadOwn) {
    Object.defineProperty(proto, "randomUUID", unset);
  }
  Object.defineProperty(crypto, "randomUUID", unset);
  try {
    const u = userEvent.setup();
    render(
      <AutoDialogProvider>
        <Launcher submit={vi.fn().mockResolvedValue(undefined)} />
      </AutoDialogProvider>,
    );
    await u.click(screen.getByText("Open"));
    expect(screen.getByTestId("rac-dialog")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Name" })).toBeInTheDocument();
  } finally {
    delete (crypto as { randomUUID?: unknown }).randomUUID;
    if (own) Object.defineProperty(crypto, "randomUUID", own);
    if (hadOwn && original) {
      Object.defineProperty(proto, "randomUUID", {
        value: original,
        configurable: true,
        writable: true,
      });
    }
  }
});
