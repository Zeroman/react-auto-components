import { test, expect } from "@playwright/test";

async function openSettings(page: import("@playwright/test").Page) {
  await page
    .getByRole("button", { name: "Open Global Settings" })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  return dialog;
}

test("theme selector drives dark, presets, and back to auto", async ({
  page,
}) => {
  await page.goto("/");
  const html = page.locator("html");

  // Default: auto — no forcing attributes on <html>.
  await expect(html).not.toHaveAttribute("data-auto-theme");
  await expect(html).not.toHaveAttribute("data-auto-preset");

  const dialog = await openSettings(page);
  const select = dialog.getByLabel("Demo theme");

  // Dark: the library default dark theme.
  await select.selectOption("dark");
  await expect(html).toHaveAttribute("data-auto-theme", "dark");
  await expect(html).not.toHaveAttribute("data-auto-preset");
  await expect(html).toHaveClass(/studio-dark/);

  // Preset: forces light tokens plus the preset attribute.
  await select.selectOption("antd");
  await expect(html).toHaveAttribute("data-auto-theme", "light");
  await expect(html).toHaveAttribute("data-auto-preset", "antd");
  await expect(html).not.toHaveClass(/studio-dark/);
  const accent = await html.evaluate((el) =>
    getComputedStyle(el).getPropertyValue("--auto-accent").trim(),
  );
  expect(accent).toBe("#1677ff");

  // Back to auto: attributes removed, library follows the OS again.
  await select.selectOption("auto");
  await expect(html).not.toHaveAttribute("data-auto-theme");
  await expect(html).not.toHaveAttribute("data-auto-preset");
});
