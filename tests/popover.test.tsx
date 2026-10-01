import { test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AutoPopover } from "../src/components/AutoPopover";
test("popover opens and treats strings as text", async () => {
  const u = userEvent.setup();
  render(
    <AutoPopover content={"<b>安全文本</b>"}>
      <button>详情</button>
    </AutoPopover>,
  );
  await u.click(screen.getByText("详情"));
  expect(await screen.findByText("<b>安全文本</b>")).toBeVisible();
  await u.keyboard("{Escape}");
  expect(screen.queryByText("<b>安全文本</b>")).not.toBeInTheDocument();
});
