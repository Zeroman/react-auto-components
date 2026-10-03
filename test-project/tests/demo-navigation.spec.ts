import { test, expect } from "@playwright/test";
import { openComponent } from "./helpers/navigation";

const examples = {
  AutoTable: [
    "Local Data",
    "Server-side (Mock)",
    "10,000 rows of data",
    "Tree & Expansion",
    "Remaining Height",
    "Server-driven Mock",
  ],
  AutoSearch: [
    "Instant Search",
    "Manual Search",
    "Cross-field & Multi-select",
    "Server-side (Mock)",
    "Server-driven Mock",
  ],
  AutoTabs: ["Basic", "Dynamic tabs", "Access control", "Server-driven Mock"],
  AutoForm: ["Component examples", "Server-driven Mock"],
  AutoDialog: ["Component examples", "Server-driven Mock"],
  AutoMenu: ["Component examples", "Server-driven Mock"],
  AutoChat: [
    "Conversation",
    "Large history",
    "Rendering",
    "Message layout",
    "Hooks",
    "Edge states",
    "Server-driven Mock",
  ],
};

test("component parents expand without navigation and leaves synchronize with page tabs", async ({
  page,
}) => {
  await page.goto("/");
  const search = page
    .locator("aside")
    .getByRole("button", { name: "AutoSearch", exact: true });
  await search.click();
  await expect(search).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("main")).toHaveAttribute("data-page", "table");
  await openComponent(page, "AutoSearch", "Manual Search");
  const tabs = page.locator(".demo-navigation");
  await expect(
    tabs.getByRole("tab", { name: "Manual Search", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await tabs
    .getByRole("tab", { name: "Cross-field & Multi-select", exact: true })
    .click();
  await expect(
    page
      .locator("aside")
      .getByRole("button", { name: "Cross-field & Multi-select", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await openComponent(page, "AutoTable", "Remaining Height");
  await expect(page.getByTestId("height-frame")).toBeVisible();
  await expect(
    tabs.getByRole("tab", { name: "Remaining Height", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await tabs.getByRole("tab", { name: "Local Data", exact: true }).click();
  await expect(
    page
      .locator("aside")
      .getByRole("button", { name: "Local Data", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("height-frame")).toHaveCount(0);
});

for (const [component, labels] of Object.entries(examples)) {
  test(`${component} exposes matching example tabs and its own server mock`, async ({
    page,
  }) => {
    await page.goto("/");
    await openComponent(page, component);
    const tabs = page.locator(".demo-navigation").getByRole("tab");
    await expect(tabs).toHaveText(labels);
    await openComponent(page, component, "Server-driven Mock");
    await expect(
      page
        .locator(".demo-navigation")
        .getByRole("tab", { name: "Server-driven Mock", exact: true }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(
      page.getByTestId("server-driven-demo").locator(".mock-response"),
    ).toBeVisible();
    await page
      .locator(".demo-navigation")
      .getByRole("tab", { name: labels[0], exact: true })
      .click();
    await expect(page.getByTestId("server-driven-demo")).toHaveCount(0);
    await expect(
      page
        .locator("aside")
        .getByRole("button", { name: labels[0], exact: true })
        .filter({ visible: true }),
    ).toHaveAttribute("aria-current", "page");
  });
}

test("mobile collapsed menu opens a bounded flyout and selects a nested destination", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const parent = page
    .locator("aside")
    .getByRole("button", { name: "AutoSearch", exact: true });
  await parent.click();
  const flyout = page.getByRole("dialog");
  await expect(flyout).toBeVisible();
  await expect(page.locator("main")).toHaveAttribute("data-page", "table");
  const box = await flyout.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await flyout
    .getByRole("button", { name: "Manual Search", exact: true })
    .click();
  await expect(flyout).toHaveCount(0);
  await expect(page.locator("main")).toHaveAttribute("data-page", "search");
  await expect(
    page
      .locator(".demo-navigation")
      .getByRole("tab", { name: "Manual Search", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await openComponent(page, "AutoTabs", "Server-driven Mock");
  await expect(page.getByTestId("server-driven-demo")).toBeVisible();
  await expect(
    page
      .locator("aside")
      .getByRole("button", { name: "AutoTabs", exact: true }),
  ).toHaveAttribute("data-active-branch", "true");
});

test("navigation showcase toolbar drives global goto, relative goto, params, and lazy tree demo", async ({
  page,
}) => {
  await page.goto("/");

  const toolbar = page.getByTestId("demo-navigation-bar");
  await expect(toolbar).toBeVisible();

  // 1. Global goto: table:large
  await page.getByTestId("nav-goto-large").click();
  await expect(page.locator("main")).toHaveAttribute("data-page", "table");
  await expect(
    page.locator(".demo-navigation").getByRole("tab", { name: "10,000 rows of data" }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("nav-path-badge")).toContainText("table:large");

  // 2. Global goto: chat:performance
  await page.getByTestId("nav-goto-chat-perf").click();
  await expect(page.locator("main")).toHaveAttribute("data-page", "chat");
  await expect(
    page.locator(".demo-navigation").getByRole("tab", { name: "Large history" }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("nav-path-badge")).toContainText("chat:performance");

  // 3. Deep search with params
  await page.getByTestId("nav-goto-deep-search").click();
  await expect(page.locator("main")).toHaveAttribute("data-page", "search");
  await expect(page.getByTestId("nav-path-badge")).toContainText("search:instant");
  await expect(page.getByTestId("nav-params-badge")).toContainText("audit");

  // 4. Relative goto: ./server
  await page.getByTestId("nav-relative-server").click();
  await expect(
    page.locator(".demo-navigation").getByRole("tab", { name: "Server-driven Mock" }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("server-driven-demo")).toBeVisible();

  // 5. Interactive Tree Demo Node with deep params and role access
  await page.getByTestId("nav-goto-tree-demo").click();
  const demoCard = page.getByTestId("interactive-nav-demo");
  await expect(demoCard).toBeVisible();
  await expect(page.getByTestId("tree-active-child")).toHaveText("details");
  await expect(page.getByTestId("param-project-id")).toHaveText("42");
  await expect(page.getByTestId("param-tab")).toHaveText("specs");

  // Set param button
  await demoCard.getByRole("button", { name: "Set Param projectId=1" }).click();
  await expect(page.getByTestId("param-project-id")).toHaveText("1");

  // Admin audit restricted view
  await demoCard.getByRole("button", { name: "Enter Admin Audit (Restricted)" }).click();
  await expect(page.getByTestId("admin-audit-content")).toBeVisible();

  // Relative ./overview
  await demoCard.getByRole("button", { name: "Relative: ./overview" }).click();
  await expect(page.getByTestId("tree-active-child")).toHaveText("overview");
});

