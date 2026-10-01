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
          title: "编辑用户",
          fields: [{ name: "name", label: "姓名", required: true }],
          defaultValue: { name: "" },
          draftKey: "user",
          onSubmit: submit,
        })
      }
    >
      打开
    </button>
  );
}
test("failed submit preserves input, cancel saves draft, successful submit clears it", async () => {
  const submit = vi
      .fn()
      .mockRejectedValueOnce(new Error("保存失败"))
      .mockResolvedValue(undefined),
    u = userEvent.setup();
  render(
    <AutoDialogProvider>
      <Launcher submit={submit} />
    </AutoDialogProvider>,
  );
  await u.click(screen.getByText("打开"));
  await u.type(screen.getByRole("textbox", { name: "姓名" }), "张三");
  await u.click(screen.getByText("确定"));
  expect(await screen.findByText("保存失败")).toBeVisible();
  expect(screen.getByRole("dialog")).toBeVisible();
  await u.click(screen.getByText("取消"));
  await u.click(screen.getByText("打开"));
  expect(screen.getByRole("textbox", { name: "姓名" })).toHaveValue("张三");
  await u.click(screen.getByText("确定"));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  await u.click(screen.getByText("打开"));
  expect(screen.getByRole("textbox", { name: "姓名" })).toHaveValue("");
});
