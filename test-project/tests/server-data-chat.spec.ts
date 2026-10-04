import { expect, test, type Page } from "@playwright/test";

async function openDemo(page: Page, name: string) {
  await page.goto("/");
  const parent = page
    .locator("aside")
    .getByRole("button", { name, exact: true });
  if ((await parent.getAttribute("aria-expanded")) !== "true")
    await parent.click();
  await parent
    .locator("..")
    .getByRole("button", {
      name: name === "AutoTable" ? "Mock server" : "Server-driven Mock",
      exact: true,
    })
    .click();
  return page.getByTestId("server-driven-demo");
}

test("server table filters, sorts, pages and respects returned permissions", async ({
  page,
}) => {
  const demo = await openDemo(page, "AutoTable");
  const table = demo.getByTestId("rac-table-server-projects-normal");
  await expect(table.locator("tbody tr[data-row-id]")).toHaveCount(5);
  await table.getByRole("button", { name: "Edit row 1", exact: true }).click();
  const editor = page.getByRole("dialog");
  await editor
    .getByRole("textbox", { name: "Project Name", exact: true })
    .fill("Customer Data Platform Updated");
  await editor.getByTestId("rac-ok").click();
  await expect(editor).toBeHidden();
  await expect(table.locator('tbody tr[data-row-id="1"]')).toContainText(
    "Customer Data Platform Updated",
  );
  await table.getByRole("button", { name: "Sort Status", exact: true }).click();
  await table
    .getByRole("button", { name: "Sort Budget", exact: true })
    .click({ modifiers: ["Shift"] });
  await expect(table.locator("tbody tr[data-row-id]").first()).toHaveAttribute(
    "data-row-id",
    "2",
  );
  await expect(demo.getByTestId("mock-table-exchange")).toContainText(
    '"id": "budget"',
  );
  await table.getByRole("button", { name: "Next page" }).click();
  await expect(table.locator("tbody tr[data-row-id]").first()).toHaveAttribute(
    "data-row-id",
    "17",
  );
  await demo
    .getByRole("textbox", { name: "Project Name", exact: true })
    .fill("Customer Data Platform");
  await expect(demo.getByTestId("mock-table-exchange")).toContainText(
    '"total": 3',
  );
  await demo
    .getByRole("combobox", { name: "Server response" })
    .selectOption("restricted");
  await expect(
    demo.getByRole("columnheader").filter({ hasText: "Budget" }),
  ).toHaveCount(0);
  await expect(demo.getByRole("button", { name: /^Edit row/ })).toHaveCount(0);
  await expect(demo.getByTestId("mock-table-exchange")).toContainText(
    '"total": 8',
  );
  await demo
    .getByRole("combobox", { name: "Server response" })
    .selectOption("empty");
  await expect(demo.getByTestId("mock-table-exchange")).toContainText(
    '"total": 0',
  );
});

test("server search applies the latest query, retries failure and replaces schema", async ({
  page,
}) => {
  const demo = await openDemo(page, "AutoSearch");
  await expect(demo.getByTestId("mock-search-count")).toContainText("24");
  const name = demo.getByRole("textbox", { name: "Project Name", exact: true });
  await name.fill("Customer");
  await name.fill("no-match-at-all");
  await expect(demo.getByTestId("mock-search-count")).toContainText("0");
  await expect(
    demo.getByTestId("mock-search-results").getByRole("listitem"),
  ).toHaveCount(0);
  await name.fill("Customer");
  await expect(demo.getByTestId("mock-search-count")).toContainText("3");
  await demo.getByRole("button", { name: "Simulate query failure" }).click();
  await expect(demo.getByRole("alert")).toBeVisible();
  await demo.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(demo.getByTestId("mock-search-count")).toContainText("3");
  await demo
    .getByRole("combobox", { name: "Server response" })
    .selectOption("restricted");
  await expect(demo.getByTestId("mock-search-count")).toContainText("8");
  await expect(demo.getByTestId("rac-field-region")).toHaveCount(0);
});

test("server chat retries preserved drafts, cancels replies, and loads read-only or empty history", async ({
  page,
}) => {
  const demo = await openDemo(page, "AutoChat");
  const draft = demo.getByRole("textbox", { name: "Message", exact: true });
  await draft.fill("Keep my question");
  await demo.getByRole("checkbox", { name: "Fail the next send" }).check();
  await demo.getByRole("button", { name: "Send", exact: true }).click();
  await expect(demo.getByRole("alert")).toContainText("draft is preserved");
  await expect(draft).toHaveValue("Keep my question");
  await demo.getByRole("button", { name: "Send", exact: true }).click();
  await expect(draft).toHaveValue("");
  await expect(
    demo.locator('.auto-chat-message[data-role="assistant"]').last(),
  ).toContainText("Keep my question");
  await draft.fill("Cancelled question");
  await demo.getByRole("button", { name: "Send", exact: true }).click();
  await demo.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(draft).toHaveValue("Cancelled question");
  await expect(demo.getByRole("status")).toContainText("Send cancelled");
  await expect(demo.getByRole("alert")).toHaveCount(0);
  await demo
    .getByRole("combobox", { name: "Server response" })
    .selectOption("restricted");
  await expect(demo.getByText(/composer is hidden/)).toBeVisible();
  await expect(draft).toHaveCount(0);
  await expect(demo.locator(".auto-chat-message")).toHaveCount(3);
  await demo
    .getByRole("combobox", { name: "Server response" })
    .selectOption("empty");
  await expect(draft).toBeVisible();
  await expect(demo.locator(".auto-chat-message")).toHaveCount(0);
  await draft.fill("First message");
  await demo.getByRole("button", { name: "Send", exact: true }).click();
  await expect(demo.locator(".auto-chat-message")).toHaveCount(2);
});

test("switching table permissions discards an in-flight edit and page request", async ({
  page,
}) => {
  const demo = await openDemo(page, "AutoTable");
  const table = demo.getByTestId("rac-table-server-projects-normal");
  await table.getByRole("button", { name: "Edit row 1", exact: true }).click();
  const editor = page.getByRole("dialog");
  await editor
    .getByRole("textbox", { name: "Project Name", exact: true })
    .fill("Discard this pending edit");
  await page.clock.install({ time: new Date("2026-10-02T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-02T12:00:01Z"));
  await editor.getByTestId("rac-ok").click();
  await expect(editor.getByTestId("rac-ok")).toBeDisabled();
  // Permissions may be revoked by a new server response while the modal is busy.
  await demo
    .getByRole("combobox", { name: "Server response", includeHidden: true })
    .selectOption("restricted");
  await page.clock.runFor(1200);
  const restricted = demo.getByTestId("rac-table-server-projects-restricted");
  await expect(restricted).toBeVisible();
  // The mounted table starts its own page request after the schema response.
  await page.clock.runFor(500);
  await expect(restricted.locator('tbody tr[data-row-id="1"]')).toContainText(
    "Customer Data Platform",
  );
  await expect(demo).not.toContainText("Discard this pending edit");
  await expect(demo.getByRole("button", { name: /^Edit row/ })).toHaveCount(0);
  await expect(
    demo.getByRole("columnheader").filter({ hasText: "Budget" }),
  ).toHaveCount(0);
  await expect(demo.getByRole("alert")).toHaveCount(0);
  // A pending page response must also be discarded when access changes again.
  await restricted.getByRole("button", { name: "Next page" }).click();
  await demo
    .getByRole("combobox", { name: "Server response" })
    .selectOption("empty");
  await page.clock.runFor(1200);
  await expect(
    demo.getByTestId("rac-table-server-projects-empty"),
  ).toBeVisible();
  await page.clock.runFor(500);
  await expect(demo.getByTestId("mock-table-exchange")).toContainText(
    '"total": 0',
  );
  await expect(demo.locator("tbody tr[data-row-id]")).toHaveCount(0);
});

test("switching chat permissions cancels pending replies and late history loads", async ({
  page,
}) => {
  const demo = await openDemo(page, "AutoChat");
  await expect(demo.locator(".auto-chat-message")).toHaveCount(3);
  await page.clock.install({ time: new Date("2026-10-02T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-02T12:00:01Z"));
  await demo
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("Do not publish this stale reply");
  await demo.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    demo.getByRole("button", { name: "Stop", exact: true }),
  ).toBeVisible();
  const scenario = demo.getByRole("combobox", { name: "Server response" });
  await scenario.selectOption("restricted");
  await page.clock.runFor(1200);
  await expect(
    demo.getByRole("textbox", { name: "Message", exact: true }),
  ).toHaveCount(0);
  await expect(demo.locator(".auto-chat-message")).toHaveCount(3);
  await expect(demo).not.toContainText("Do not publish this stale reply");
  await expect(demo.getByRole("alert")).toHaveCount(0);
  // The normal history request is superseded before its transport delay elapses.
  await scenario.selectOption("normal");
  await scenario.selectOption("empty");
  await page.clock.runFor(1200);
  await expect(demo.locator(".auto-chat-message")).toHaveCount(0);
  await expect(
    demo.getByRole("textbox", { name: "Message", exact: true }),
  ).toBeVisible();
  await expect(demo.getByRole("alert")).toHaveCount(0);
});
