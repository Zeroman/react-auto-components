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
        { id: "a", label: "A", content: <input aria-label="Draft" /> },
        {
          id: "b",
          label: "B",
          children: [
            { id: "b1", label: "Child page", content: "Child content" },
          ],
        },
        { id: "c", label: "Hidden", hidden: true },
      ]}
    />,
  );
  await u.type(screen.getByLabelText("Draft"), "Kept");
  await u.click(screen.getByRole("tab", { name: "B" }));
  expect(screen.getByText("Child content")).toBeVisible();
  await u.click(screen.getByRole("tab", { name: "A" }));
  expect(screen.getByLabelText("Draft")).toHaveValue("Kept");
  expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
  expect(change).toHaveBeenCalled();
});
