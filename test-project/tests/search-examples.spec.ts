import { openComponent } from "./helpers/navigation";
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await openComponent(page, "AutoSearch");
});

test("instant search updates results without submitting and resets", async ({
  page,
}) => {
  await expect(
    page.getByRole("tab", { name: "Instant Search" }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("textbox", { name: "Project Name" }).fill("Customer");
  await expect(page.getByTestId("query-result")).toContainText("Customer");
  await expect(
    page.getByRole("heading", { name: "Real-time matches (3 items)" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Status" })
    .selectOption({ label: "Completed" });
  await expect(
    page.getByRole("heading", { name: "Real-time matches (1 items)" }),
  ).toBeVisible();
  await page.getByTestId("rac-search-reset").click();
  await expect(
    page.getByRole("heading", { name: "Real-time matches (24 items)" }),
  ).toBeVisible();
});

test("advanced search combines cross-field text and multiple statuses", async ({
  page,
}) => {
  await page.getByRole("tab", { name: "Cross-field & Multi-select" }).click();
  await page.getByRole("textbox", { name: "Keyword" }).fill("chen");
  await expect(
    page.getByRole("heading", { name: "Real-time matches (6 items)" }),
  ).toBeVisible();
  await page
    .getByRole("listbox", { name: "Status" })
    .selectOption([{ label: "In Progress" }, { label: "Completed" }]);
  await expect(
    page.getByRole("heading", { name: "Real-time matches (4 items)" }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Region" })
    .selectOption({ label: "Shanghai" });
  await expect(
    page.getByRole("heading", { name: "Real-time matches (2 items)" }),
  ).toBeVisible();
});

test("mock search applies the latest query and supports empty results and reset", async ({
  page,
}) => {
  await page.getByRole("tab", { name: "RSQL query" }).click();
  await expect(page.getByText(/Mock server:/)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Real-time matches (24 items)" }),
  ).toBeVisible();
  const name = page.getByRole("textbox", { name: "Project Name" });
  await name.fill("Customer");
  await name.fill("Brand");
  await expect(
    page.getByRole("heading", { name: "Real-time matches (3 items)" }),
  ).toBeVisible();
  await expect(page.locator(".search-hit strong")).toHaveText([
    "Brand Website Upgrade",
    "Brand Website Upgrade 10",
    "Brand Website Upgrade 18",
  ]);
  await name.fill("no-such-project");
  await expect(
    page.getByText("No records match the search criteria"),
  ).toBeVisible();
  await page.getByTestId("rac-search-reset").click();
  await expect(
    page.getByRole("heading", { name: "Real-time matches (24 items)" }),
  ).toBeVisible();
});
