import { expect, type Page } from "@playwright/test";

/** Select a leaf in the desktop sidebar or the mobile icon-rail flyout. */
export async function openComponent(
  page: Page,
  component: string,
  example?: string,
) {
  const parent = page
    .locator("aside")
    .getByRole("button", { name: component, exact: true });
  if ((await parent.getAttribute("aria-expanded")) !== "true")
    await parent.click();
  await expect(parent).toHaveAttribute("aria-expanded", "true");
  const controls = await parent.getAttribute("aria-controls");
  const submenu = page.locator(`[id="${controls}"]`);
  const leaf = example
    ? submenu.getByRole("button", { name: example, exact: true })
    : submenu.getByRole("button").first();
  await expect(leaf).toBeVisible();
  const label = await leaf.getAttribute("aria-label");
  expect(label).toBeTruthy();
  // Playwright waits for a stable click target. Verify navigation using the
  // destination tab, which also survives dismissal of the mobile flyout.
  await leaf.click();
  await expect(
    page
      .locator(".demo-navigation")
      .getByRole("tab", { name: label!, exact: true }),
  ).toHaveAttribute("aria-selected", "true");
}
