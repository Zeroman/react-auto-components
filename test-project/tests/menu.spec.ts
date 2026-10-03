import { openComponent } from "./helpers/navigation";
import { test, expect } from "@playwright/test";

test.use({ locale: "en-US" });
async function fixture(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.evaluate((path) => import(path), "/tests/fixtures/menu.tsx");
  await page.getByTestId("menu-fixture").waitFor();
  return page.getByTestId("menu-fixture");
}

test("nested menu, collapsed flyout and keyboard dismissal preserve navigation", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  const preview = await fixture(page);
  await preview.getByRole("button", { name: "Projects", exact: true }).click();
  await preview.getByRole("button", { name: "Reports", exact: true }).click();
  await preview
    .getByRole("button", { name: "Weekly overview", exact: true })
    .click();
  await expect(preview.getByTestId("menu-selection")).toHaveText("weekly");
  await preview.getByRole("button", { name: "Collapse menu" }).click();
  const trigger = preview.getByRole("button", {
    name: "Projects",
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const flyout = page.getByRole("dialog");
  await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(
    flyout.getByRole("button", { name: "Weekly overview", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(flyout).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await flyout
    .getByRole("button", { name: "Active projects", exact: true })
    .focus();
  await page.keyboard.press("ArrowLeft");
  await expect(flyout).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await flyout
    .getByRole("button", { name: "Active projects", exact: true })
    .click();
  await expect(preview.getByTestId("menu-selection")).toHaveText("active");
  await expect(flyout).not.toBeVisible();
  await expect(trigger).toHaveAttribute("data-active-branch", "true");
});

test("short viewport scrolls entries while keeping footer and collapse reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 420 });
  const preview = await fixture(page);
  const nav = preview.getByRole("navigation");
  const list = nav.locator(":scope > .auto-menu-list");
  await expect
    .poll(() => list.evaluate((el) => el.scrollHeight > el.clientHeight))
    .toBe(true);
  await nav
    .getByRole("button", { name: "Team 18", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    nav.getByRole("button", { name: "Collapse menu" }),
  ).toBeInViewport();
  await expect(nav.getByText("Workspace settings · v1")).toBeInViewport();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollHeight <= innerHeight),
    )
    .toBe(true);
});

test("mobile sidebar retains accessible names and a narrow flyout stays in the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto("/");
  await openComponent(page, "AutoForm");
  await expect(page.locator("main")).toHaveAttribute("data-page", "form");
  const preview = await fixture(page);
  await preview.getByRole("button", { name: "Collapse menu" }).click();
  await preview.getByRole("button", { name: "Projects", exact: true }).click();
  const flyout = page.getByRole("dialog");
  await flyout.getByRole("button", { name: "Reports", exact: true }).click();
  await expect(
    flyout.getByRole("button", {
      name: "Annual planning and international collaboration",
      exact: true,
    }),
  ).toBeVisible();
  await expect
    .poll(async () => {
      const box = await flyout.boundingBox();
      return (
        !!box &&
        box.x >= 0 &&
        box.y >= 0 &&
        box.x + box.width <= 375 &&
        box.y + box.height <= 667
      );
    })
    .toBe(true);
});
