import { test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AutoSearchPanel } from "../src/components/AutoSearchPanel";
test("manual searches only on submit and reset once", async () => {
  const onSearch = vi.fn(),
    u = userEvent.setup();
  render(
    <AutoSearchPanel
      fields={[{ name: "name", label: "姓名", match: "contains" }]}
      onSearch={onSearch}
    />,
  );
  await u.type(screen.getByRole("textbox", { name: "姓名" }), "张");
  expect(onSearch).not.toHaveBeenCalled();
  await u.click(screen.getByText("搜索"));
  expect(onSearch).toHaveBeenCalledTimes(1);
  await u.click(screen.getByText("重置"));
  expect(onSearch).toHaveBeenCalledTimes(2);
});
