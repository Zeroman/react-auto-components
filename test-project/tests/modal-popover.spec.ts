import { expect, test } from "@playwright/test";

test("search popover stays interactive inside the modal focus trap", async ({
  page,
}) => {
  await page.goto("/tests/fixtures/modal.html");
  await page.getByRole("button", { name: "Open modal" }).click();
  const modal = page.getByTestId("rac-dialog");
  await modal.getByTestId("rac-more-filters").click();
  const popup = modal.locator(".auto-search-popover-panel");
  await expect(popup).toBeVisible();
  const owner = popup.getByRole("textbox", { name: "Owner" });
  await owner.fill("Browser verified");
  await expect(owner).toBeFocused();
  await popup.getByRole("button", { name: "Search", exact: true }).click();
  await expect(popup).toBeHidden();
  await expect(modal.getByTestId("search-result")).toHaveText(
    "Browser verified",
  );
  await expect(modal).toBeVisible();
  await modal.getByRole("button", { name: "Close dialog" }).click();
  await expect(modal).toBeHidden();
});
