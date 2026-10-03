import { openComponent } from "./helpers/navigation";
import { test, expect, type Page } from "@playwright/test";

async function openDemo(page: Page, component: "AutoTabs" | "AutoMenu") {
  await page.goto("/");
  await openComponent(page, component);
  await page
    .getByRole("tab", { name: "Server-driven Mock", exact: true })
    .click();
  return page.getByTestId("server-driven-demo");
}

test("server tabs reconcile removed selection, retry content and handle empty responses", async ({
  page,
}) => {
  const demo = await openDemo(page, "AutoTabs");
  await expect(demo.getByTestId("server-tab-content")).toContainText(
    "Project overview",
  );
  await expect(demo.getByRole("tab", { name: "Archive" })).toBeDisabled();
  await demo.getByRole("tab", { name: /Billing/ }).click();
  await expect(demo.getByTestId("server-tab-content")).toContainText(
    "Billing summary",
  );
  await demo.getByLabel("Server response").selectOption("restricted");
  await expect(demo.getByRole("tab", { name: /Billing/ })).toHaveCount(0);
  await expect(demo.getByRole("tab").first()).toHaveAccessibleName(/Activity/);
  await expect(demo.getByRole("alert")).toContainText(
    "activity endpoint failed",
  );
  await demo.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(demo.getByTestId("server-tab-content")).toContainText(
    "Recent activity",
  );
  await demo.getByLabel("Server response").selectOption("empty");
  await expect(demo.getByRole("status")).toHaveText(
    "The server returned no tabs.",
  );
  await expect(demo.getByTestId("server-tab-content")).toHaveCount(0);
  await demo.getByLabel("Server response").selectOption("error");
  await expect(demo.getByRole("alert")).toBeVisible();
  await demo.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(demo.getByTestId("server-tab-content")).toContainText(
    "Project overview",
  );
});

test("server navigation prunes forbidden descendants and loads selected leaf content", async ({
  page,
}) => {
  const demo = await openDemo(page, "AutoMenu");
  await expect(demo.getByTestId("server-menu-content")).toContainText(
    "Inbox messages",
  );
  await expect(
    demo.getByRole("button", { name: "Maintenance", exact: true }),
  ).toBeDisabled();
  await demo
    .getByRole("button", { name: "Administration", exact: true })
    .click();
  await demo.getByRole("button", { name: "Reports", exact: true }).click();
  await expect(demo.getByRole("alert")).toContainText(
    "reports endpoint failed",
  );
  await demo.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(demo.getByTestId("server-menu-content")).toContainText(
    "Monthly reports",
  );
  await demo.getByLabel("Server response").selectOption("restricted");
  await expect(
    demo.getByRole("button", { name: "Administration", exact: true }),
  ).toHaveCount(0);
  await expect(
    demo.getByRole("button", { name: "Reports", exact: true }),
  ).toHaveCount(0);
  await expect(demo.getByTestId("server-menu-content")).toContainText(
    "Inbox messages",
  );
  await demo.getByRole("button", { name: "Projects", exact: true }).click();
  await expect(demo.getByTestId("server-menu-content")).toContainText(
    "Available projects",
  );
  await demo.getByLabel("Server response").selectOption("empty");
  await expect(demo.getByRole("status")).toHaveText(
    "The server returned no navigation entries.",
  );
  await expect(demo.getByTestId("server-menu-content")).toHaveCount(0);
});
