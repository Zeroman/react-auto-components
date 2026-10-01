import { test, expect, expectTypeOf, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AutoTabs, type AutoTabsProps } from "../src/components/AutoTabs";

expectTypeOf<AutoTabsProps["mode"]>().toEqualTypeOf<
  "horizontal" | "vertical" | undefined
>();
test("nested tabs, hidden entries and retained state", async () => {
  const change = vi.fn(),
    u = userEvent.setup();
  render(
    <AutoTabs
      onChange={change}
      items={[
        { id: "a", label: "甲", content: <input aria-label="草稿" /> },
        {
          id: "b",
          label: "乙",
          children: [{ id: "b1", label: "子页", content: "子内容" }],
        },
        { id: "c", label: "隐藏", hidden: true },
      ]}
    />,
  );
  await u.type(screen.getByLabelText("草稿"), "保留");
  await u.click(screen.getByRole("tab", { name: "乙" }));
  expect(screen.getByText("子内容")).toBeVisible();
  await u.click(screen.getByRole("tab", { name: "甲" }));
  expect(screen.getByLabelText("草稿")).toHaveValue("保留");
  expect(screen.queryByText("隐藏")).not.toBeInTheDocument();
  expect(change).toHaveBeenCalled();
});
