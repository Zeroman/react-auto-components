import { test, expect } from "@playwright/test";

test("Mock help floats on the tab and switching keeps tab click positions stable", async ({
  page,
}) => {
  await page.goto("/");
  const local = page.getByRole("tab", { name: "Local Data", exact: true });
  const remote = page.getByRole("tab", {
    name: "Mock server",
    exact: true,
  });
  const before = await local.boundingBox();
  await remote.click();
  await expect(remote).toHaveAttribute("aria-selected", "true");
  const after = await local.boundingBox();
  expect(after!.y).toBe(before!.y);
  expect(after!.x).toBe(before!.x);
  await remote.hover();
  await expect(page.getByRole("tooltip")).toContainText("One mock server");
  await page.getByRole("tooltip").hover();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("tab-tip.png") });
  const hovering = await local.boundingBox();
  expect(hovering!.y).toBe(before!.y);
  await local.click();
  await expect(local).toHaveAttribute("aria-selected", "true");
  await page.mouse.move(0, 0);
  await expect(page.getByRole("tooltip")).toHaveCount(0);
});

test("dialog tips remain hoverable and scrollable and dismiss before the dialog", async ({
  page,
}) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.goto("/tests/fixtures/tip.html");
  await page.getByRole("button", { name: "Open dialog" }).click();
  const dialog = page.getByRole("dialog");
  const input = dialog.getByRole("textbox", { name: "Name" });
  await expect(input).toHaveAccessibleDescription(/Help paragraph 30/);
  await input.focus();
  await input.fill("Ada");
  await expect(page.getByRole("tooltip")).toContainText("Help paragraph 30");
  await dialog.locator("label").hover();
  const tip = page.getByRole("tooltip");
  await expect(tip).toContainText("Help paragraph 30");
  await tip.hover();
  await page.mouse.wheel(0, 200);
  await expect
    .poll(() => tip.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
  await page.keyboard.press("Escape");
  await expect(tip).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});
