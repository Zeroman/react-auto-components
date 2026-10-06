import { expect, test, type Locator, type Page } from "@playwright/test";
import { openComponent } from "./helpers/navigation";

async function openAccess(page: Page, component = "AutoTable") {
  await openComponent(page, component, "Permissions");
  const demo = page.getByTestId("permissions-demo");
  await expect(demo.getByTestId("access-status")).toHaveText("Access loaded.");
  return demo;
}

function auditColumn(demo: Locator) {
  return demo.getByRole("columnheader").filter({ hasText: "Audit" });
}

async function showExample(demo: Locator) {
  await demo.getByRole("tab", { name: "Example", exact: true }).click();
}

async function showAccess(demo: Locator) {
  await demo.getByRole("tab", { name: "Access state", exact: true }).click();
}

test("permission updates change the owning component without changing the admin role", async ({
  page,
}) => {
  await page.goto("/");
  const table = await openAccess(page);
  await expect(
    table.getByRole("button", { name: "Reports", exact: true }),
  ).toHaveCount(0);
  await expect(
    table.getByRole("tab", { name: "Audit", exact: true }),
  ).toHaveCount(0);
  await expect(auditColumn(table)).toBeVisible();

  const tabs = await openAccess(page, "AutoTabs");
  await expect(
    tabs.getByRole("tab", { name: "Audit", exact: true }),
  ).toBeVisible();
  await tabs
    .getByRole("button", { name: "Revoke audit:read", exact: true })
    .click();
  await expect(tabs.getByTestId("permissions-role")).toContainText("admin");
  await expect(
    tabs.getByRole("tab", { name: "Audit", exact: true }),
  ).toHaveCount(0);
  await showAccess(tabs);
  await expect(tabs.getByTestId("access-check-perm")).toContainText("false");

  const menu = await openAccess(page, "AutoMenu");
  await expect(
    menu.getByRole("button", { name: "Reports", exact: true }),
  ).toBeVisible();
  await expect(
    menu.getByRole("tab", { name: "Audit", exact: true }),
  ).toHaveCount(0);
  await menu
    .getByRole("button", { name: "Grant audit:read", exact: true })
    .click();

  const tabsAgain = await openAccess(page, "AutoTabs");
  await expect(
    tabsAgain.getByRole("tab", { name: "Audit", exact: true }),
  ).toBeVisible();
  await tabsAgain.getByTestId("permissions-role").click();
  await expect(
    tabsAgain.getByRole("tab", { name: "Audit", exact: true }),
  ).toBeVisible();
  await expect(
    tabsAgain.getByRole("tab", { name: "Reports", exact: true }),
  ).toHaveCount(0);

  const menuGuest = await openAccess(page, "AutoMenu");
  await expect(
    menuGuest.getByRole("button", { name: "Reports", exact: true }),
  ).toHaveCount(0);
  await expect(
    menuGuest
      .getByRole("navigation", { name: "Navigation", exact: true })
      .getByRole("button", { name: "Settings", exact: true }),
  ).toBeVisible();
});

test("user and organization changes update caller-owned checks", async ({
  page,
}) => {
  await page.goto("/");
  const demo = await openAccess(page);
  await showAccess(demo);
  await expect(demo.getByTestId("access-check-user")).toContainText("true");
  await expect(demo.getByTestId("access-check-org")).toContainText("true");
  await showExample(demo);
  await demo
    .getByLabel("Current user", { exact: true })
    .selectOption({ label: "user-2" });
  await showAccess(demo);
  await expect(demo.getByTestId("access-check-user")).toContainText("false");
  await expect(demo.getByTestId("access-status")).toHaveText("Access loaded.");
  await expect(demo.getByTestId("access-check-org")).toContainText("false");
  await expect(demo.getByTestId("access-check-role")).toContainText("false");
  await showExample(demo);
  await expect(auditColumn(demo)).toHaveCount(0);
  await demo
    .getByLabel("Current user", { exact: true })
    .selectOption({ label: "user-1" });
  await expect(demo.getByTestId("access-status")).toHaveText("Access loaded.");
  await showAccess(demo);
  await expect(demo.getByTestId("access-check-user")).toContainText("true");
  await expect(demo.getByTestId("access-check-role")).toContainText("true");
  await expect(demo.getByTestId("access-check-org")).toContainText("true");
  await showExample(demo);
  await expect(auditColumn(demo)).toBeVisible();
  await demo
    .getByLabel("Current organization", { exact: true })
    .selectOption({ label: "org-2" });
  await showAccess(demo);
  await expect(demo.getByTestId("access-check-org")).toContainText("false");
});

test("mock access failure retains the snapshot and retry replaces it", async ({
  page,
}) => {
  await page.goto("/");
  const demo = await openAccess(page);
  await demo
    .getByRole("button", { name: "Revoke audit:read", exact: true })
    .click();
  await showAccess(demo);
  await demo
    .getByRole("button", {
      name: "Simulate access request failure",
      exact: true,
    })
    .click();
  await expect(demo.getByTestId("access-status")).toHaveText("Loading access…");
  await expect(demo.getByRole("alert")).toContainText(
    "The mock server could not complete this request.",
  );
  await showExample(demo);
  await expect(auditColumn(demo)).toHaveCount(0);
  await showAccess(demo);
  await demo.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(demo.getByTestId("access-status")).toHaveText("Access loaded.");
  await showExample(demo);
  await expect(auditColumn(demo)).toBeVisible();
});

test("a pending response for user A cannot overwrite user B", async ({
  page,
}) => {
  await page.goto("/");
  const demo = await openAccess(page);
  await showAccess(demo);
  await demo
    .getByRole("button", { name: "Reload from server", exact: true })
    .click();
  await expect(demo.getByTestId("access-status")).toHaveText("Loading access…");
  await demo
    .getByLabel("Current user", { exact: true })
    .selectOption({ label: "user-2" });
  await expect(demo.getByTestId("access-check-role")).toContainText("false");
  await showExample(demo);
  await expect(auditColumn(demo)).toHaveCount(0);
  await expect(demo.getByTestId("access-status")).toHaveText("Access loaded.");
  await expect(
    demo.getByLabel("Current user", { exact: true }).locator("option:checked"),
  ).toHaveText("user-2");
  // A's slower mock request would finish after B; it must never restore A.
  await page.waitForTimeout(750);
  await showAccess(demo);
  await expect(demo.getByTestId("access-check-user")).toContainText("false");
  await expect(demo.getByTestId("access-check-role")).toContainText("false");
  await expect(demo.getByTestId("access-check-perm")).toContainText("false");
});

test("each Chrome tab retains its own user after reload", async ({ page }) => {
  await page.goto("/");
  const demo = await openAccess(page);
  await demo
    .getByLabel("Current user", { exact: true })
    .selectOption({ label: "user-2" });
  await expect(demo.getByTestId("access-status")).toHaveText("Access loaded.");
  await page.reload();
  await expect(demo.getByTestId("access-status")).toHaveText("Access loaded.");
  await expect(
    demo.getByLabel("Current user", { exact: true }).locator("option:checked"),
  ).toHaveText("user-2");
  await showAccess(demo);
  await expect(demo.getByTestId("access-check-role")).toContainText("false");
});

test("two tabs in one browser keep identity, permission updates and logout independent", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const alice = await openAccess(page);
  await showAccess(alice);
  const [bobPage] = await Promise.all([
    context.waitForEvent("page"),
    alice
      .getByRole("link", { name: "Open user-2 in another tab", exact: true })
      .click(),
  ]);
  try {
    const bob = bobPage.getByTestId("permissions-demo");
    await expect(bob.getByTestId("access-status")).toHaveText("Access loaded.");
    await showAccess(bob);
    await expect(alice.getByTestId("access-check-user")).toContainText("true");
    await expect(bob.getByTestId("access-check-user")).toContainText("false");
    await expect(alice.getByTestId("access-check-role")).toContainText("true");
    await expect(bob.getByTestId("access-check-role")).toContainText("false");
    await bob
      .getByRole("button", { name: "Grant audit:read", exact: true })
      .click();
    await alice
      .getByRole("button", { name: "Revoke audit:read", exact: true })
      .click();
    await showExample(alice);
    await showExample(bob);
    await expect(auditColumn(alice)).toHaveCount(0);
    await expect(auditColumn(bob)).toBeVisible();
    await showAccess(bob);
    await bob
      .getByRole("button", { name: "Sign out in this tab", exact: true })
      .click();
    await expect(bob.getByTestId("access-check-user")).toContainText("false");
    await showExample(bob);
    await expect(auditColumn(bob)).toHaveCount(0);
    await showAccess(alice);
    await expect(alice.getByTestId("access-check-user")).toContainText("true");
    await expect(alice.getByTestId("access-check-role")).toContainText("true");
    await bob
      .getByLabel("Current organization", { exact: true })
      .selectOption({ label: "org-2" });
    await expect(
      bob
        .getByLabel("Current organization", { exact: true })
        .locator("option:checked"),
    ).toHaveText("org-2");
    await bobPage.reload();
    await expect(bob.getByTestId("access-status")).toHaveText("Access loaded.");
    await expect(
      bob.getByLabel("Current user", { exact: true }).locator("option:checked"),
    ).toHaveText("Select");
    await expect(alice.getByTestId("access-check-user")).toContainText("true");
  } finally {
    await bobPage.close();
  }
});
