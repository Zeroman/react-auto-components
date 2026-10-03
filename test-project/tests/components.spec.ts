import { openComponent } from "./helpers/navigation";
import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
});
test("table CRUD search and persisted settings through public package", async ({
  page,
}) => {
  const table = page.getByTestId("rac-table-projects-local");
  await expect(table).toBeVisible();
  await table.getByTestId("rac-add").click();
  const dialog = page.getByTestId("rac-dialog");
  await dialog
    .getByTestId("rac-field-name")
    .getByRole("textbox")
    .fill("Browser check project");
  await dialog.getByTestId("rac-ok").click();
  await expect(dialog).toBeHidden();
  const row = table.getByRole("row").filter({
    has: page.getByRole("cell", { name: "Browser check project", exact: true }),
  });
  await expect(row).toBeVisible();
  const rowId = await row.getAttribute("data-row-id");
  expect(rowId).toBeTruthy();
  const search = table.getByTestId("rac-search-panel");
  await search
    .getByTestId("rac-field-name")
    .getByRole("textbox")
    .fill("Browser check");
  await search.getByTestId("rac-search").click();
  await table.getByTestId(`rac-edit-${rowId}`).click();
  await dialog
    .getByTestId("rac-field-name")
    .getByRole("textbox")
    .fill("Browser check project updated");
  await dialog.getByTestId("rac-ok").click();
  const updatedCell = table.getByRole("cell", {
    name: "Browser check project updated",
    exact: true,
  });
  await expect(updatedCell).toBeVisible();
  await table.getByTestId(`rac-delete-${rowId}`).click();
  await dialog.getByTestId("rac-ok").click();
  await expect(updatedCell).toBeHidden();
  await search.getByTestId("rac-search-reset").click();
  await table.getByTestId("rac-settings").click();
  await dialog.getByLabel("Budget", { exact: true }).uncheck();
  await dialog.getByTestId("rac-ok").click();
  const budgetHeader = table
    .getByRole("columnheader")
    .filter({ hasText: "Budget" });
  await expect(budgetHeader).toHaveCount(0);
  await page.reload();
  await expect(table).toBeVisible();
  await expect(budgetHeader).toHaveCount(0);
});

test("column filter selection, keyboard dismissal and reset survive internal popover migration", async ({
  page,
}) => {
  const trigger = page.getByRole("button", {
    name: "Filter Status",
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const filter = page.getByRole("dialog");
  await expect(
    filter.getByRole("textbox", { name: "Search filter options" }),
  ).toBeFocused();
  await filter.getByRole("checkbox", { name: /In Progress/ }).check();
  await page.keyboard.press("Escape");
  await expect(filter).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveClass(/auto-filter-active/);
  await expect(page.getByText("16 records", { exact: true })).toBeVisible();
  await trigger.click();
  await expect(
    filter.getByRole("checkbox", { name: /In Progress/ }),
  ).toBeChecked();
  await filter
    .getByRole("button", { name: "Clear this column filter" })
    .click();
  await page.getByRole("heading", { name: "Smart table" }).click();
  await expect(filter).toBeHidden();
  await expect(trigger).not.toHaveClass(/auto-filter-active/);
  await expect(page.getByText("48 records", { exact: true })).toBeVisible();
});

test("form failures retain values and successful submission produces typed output", async ({
  page,
}) => {
  await openComponent(page, "AutoForm");
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page.getByText("Project Name is required")).toBeVisible();
  await page.getByRole("textbox", { name: "Project Name" }).fill("Form check");
  await page.getByLabel("Simulate submission failure").check();
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(
    page.getByText(
      "Simulated server rejection — please turn off the failure toggle and retry",
    ),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Project Name" })).toHaveValue(
    "Form check",
  );
  await page.getByLabel("Simulate submission failure").uncheck();
  await page.getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page.getByTestId("form-result")).toContainText("Form check");
});
test("dialog draft and focus restoration", async ({ page }) => {
  await openComponent(page, "AutoDialog");
  const trigger = page.getByRole("button", { name: "Open form dialog" });
  await trigger.click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "Project Name" })
    .fill("Saved draft");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(page.getByRole("textbox", { name: "Project Name" })).toHaveValue(
    "Saved draft",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});
for (const mode of ["horizontal", "vertical"] as const) {
  test(`${mode} nested tabs preserve state and keep panel navigation separate`, async ({
    page,
  }) => {
    await openComponent(page, "AutoTabs");
    const modes = page.getByRole("combobox", { name: "Tab mode", exact: true });
    await expect(modes.locator("option")).toHaveCount(2);
    await modes.selectOption(mode);
    const root = page.locator(".card > .auto-tabs");
    const tabList = root.getByRole("tablist").first();
    await expect(tabList).toHaveAttribute("aria-orientation", mode);
    await page.getByLabel("Tab draft").fill("Kept text");
    await page.getByRole("tab", { name: "Overview", exact: true }).focus();
    await page.keyboard.press(mode === "vertical" ? "ArrowDown" : "ArrowRight");
    await expect(
      page.getByRole("tab", { name: "Configuration", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    const panel = root.getByRole("tabpanel", {
      name: "Configuration",
      exact: true,
    });
    await expect(panel.getByRole("tablist")).toHaveAttribute(
      "aria-orientation",
      "horizontal",
    );
    await panel.getByRole("tab", { name: "Permissions", exact: true }).click();
    await expect(
      panel.getByText("Permissions configuration content"),
    ).toBeVisible();
    await page.getByRole("tab", { name: "Overview", exact: true }).click();
    await expect(page.getByLabel("Tab draft")).toHaveValue("Kept text");
  });
}
test("server mode and large table have no runtime errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page
    .getByRole("tab", { name: "Server-side (Mock)", exact: true })
    .click();
  await expect(page.getByText("48 records")).toBeVisible();
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText("Page 2 / 5")).toBeVisible();
  await page.getByRole("tab", { name: "10,000 rows of data" }).click();
  await expect(page.getByText("10,000 records")).toBeVisible();
  expect(await page.getByRole("row").count()).toBeLessThan(40);
  expect(errors).toEqual([]);
});
test("search panel preserves manual mode and handles more conditions", async ({
  page,
}) => {
  await openComponent(page, "AutoSearch");
  await page.getByRole("tab", { name: "Manual Search" }).click();
  await page.getByRole("textbox", { name: "Project Name" }).fill("Customer");
  await expect(page.getByTestId("query-result")).not.toContainText("Customer");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByTestId("query-result")).toContainText("Customer");
  await page.getByRole("button", { name: "More filters" }).click();
  await expect(page.getByRole("combobox", { name: "Region" })).toBeVisible();
});
test("mobile navigation and actions remain reachable", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(
    page.getByRole("button", { name: "Add", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
});

test("dynamic table expansion, column resizing and export work in the browser", async ({
  page,
}) => {
  await page
    .getByRole("tab", { name: "Tree & Expansion", exact: true })
    .click();
  await page.getByRole("button", { name: "Expand row 1", exact: true }).click();
  await expect(page.getByTestId("expanded-detail").first()).toBeVisible();
  const child = page.locator('tr[data-row-id="1-child"]');
  await expect(child).toBeVisible();
  const detailBox = await page
    .getByTestId("expanded-detail")
    .first()
    .boundingBox();
  const childBox = await child.boundingBox();
  expect(childBox!.y).toBeGreaterThanOrEqual(detailBox!.y + detailBox!.height);
  await page.getByRole("tab", { name: "Local Data", exact: true }).click();
  const separator = page.getByRole("separator", {
    name: "Resize column Project Name",
  });
  const header = page.getByRole("columnheader").filter({ has: separator });
  const before = await header.boundingBox();
  await separator.focus();
  await page.keyboard.press("ArrowRight");
  const after = await header.boundingBox();
  expect(after!.width).toBeGreaterThan(before!.width);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/\.csv$/);
});
test("visual capture", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.screenshot({
    path: "test-results/studio-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({
    path: "test-results/studio-mobile.png",
    fullPage: true,
  });
});

test("dialog traps focus, drags, toggles fullscreen and honors close guard", async ({
  page,
}) => {
  await openComponent(page, "AutoDialog");
  await page.getByRole("button", { name: "Open form dialog" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "OK", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(dialog).toContainText("New Project");
  expect(
    await dialog.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  const title = dialog.getByRole("heading", { name: "New Project" });
  const before = await dialog.boundingBox();
  const titleBox = await title.boundingBox();
  await page.mouse.move(titleBox!.x + 20, titleBox!.y + 10);
  await page.mouse.down();
  await page.mouse.move(titleBox!.x + 70, titleBox!.y + 40);
  await page.mouse.up();
  const moved = await dialog.boundingBox();
  expect(moved!.x).toBeGreaterThan(before!.x + 30);
  await dialog.getByRole("button", { name: "Toggle fullscreen" }).click();
  const full = await dialog.boundingBox();
  expect(full!.width).toBeGreaterThan(moved!.width);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Test close interception" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "OK", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
});
