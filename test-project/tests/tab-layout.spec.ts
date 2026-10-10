import { openComponent } from "./helpers/navigation";
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("equal layout splits the row evenly, truncates and keeps switching", async ({
  page,
}) => {
  await openComponent(page, "AutoTabs", "Equal width");
  const demo = page.locator(".equal-tabs-demo");
  const tabsRoot = demo.locator(".auto-tabs");
  await expect(tabsRoot).toHaveAttribute("data-tab-layout", "equal");

  // No scroll affordances even though the labels cannot fit 360px.
  await expect(demo.locator(".auto-tabs-scroll-btn")).toHaveCount(0);

  // Every trigger takes an equal share of the row.
  const widths = await demo.locator("[role='tab']").evaluateAll((els) =>
    els.map((el) => el.getBoundingClientRect().width),
  );
  expect(widths).toHaveLength(4);
  const spread = Math.max(...widths) - Math.min(...widths);
  expect(spread).toBeLessThanOrEqual(1);
  expect(Math.min(...widths)).toBeGreaterThan(40);

  // The long label truncates with an ellipsis and keeps its full title.
  const longTab = page.getByRole("tab", {
    name: "Performance reports and insights",
  });
  await expect(longTab).toHaveAttribute(
    "title",
    "Performance reports and insights",
  );
  expect(await longTab.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(
    true,
  );

  // Selection keeps working and the layout can be switched back.
  await page.getByRole("tab", { name: "Profile" }).click();
  await expect(page.getByRole("tab", { name: "Profile" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await demo.getByLabel("Equal width").click();
  await expect(tabsRoot).toHaveAttribute("data-tab-layout", "scroll");
});
