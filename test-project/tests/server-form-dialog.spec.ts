import { expect, test, type Page } from "@playwright/test";

async function openDemo(page: Page, component: string) {
  await page.goto("/");
  const branch = page.locator("aside li").filter({
    has: page.getByRole("button", { name: component, exact: true }),
  });
  await branch.getByRole("button", { name: component, exact: true }).click();
  await branch
    .getByRole("button", { name: "Server-driven Mock", exact: true })
    .click();
  return page.getByTestId("server-driven-demo");
}

test("server form keeps failed drafts and applies normalized successful responses", async ({
  page,
}) => {
  const demo = await openDemo(page, "AutoForm");
  const name = demo.getByRole("textbox", { name: "Display name" });
  await name.fill("  Casey Changed  ");
  await demo.getByRole("checkbox", { name: "Fail next save" }).check();
  await demo.getByTestId("rac-submit").click();
  await expect(demo.getByRole("alert")).toContainText("draft is preserved");
  await expect(name).toHaveValue("  Casey Changed  ");
  await demo.getByTestId("rac-submit").click();
  await expect(demo.getByTestId("mock-form-saved")).toContainText(
    "Casey Changed",
  );
  await expect(name).toHaveValue("Casey Changed");
  await demo
    .getByRole("combobox", { name: "Server response" })
    .selectOption("restricted");
  await expect(
    demo.getByText("Read-only access", { exact: true }),
  ).toBeVisible();
  await expect(demo.getByTestId("rac-submit")).toHaveCount(0);
  await expect(demo.getByTestId("rac-field-role")).toHaveCount(0);
});

test("server dialog keeps failed drafts, saves after response, and cancels pending requests", async ({
  page,
}) => {
  // The mock transport is an in-browser 750ms timer, not an HTTP request, so
  // the pending-save boundary is controlled with the clock API: the
  // cancel-case save stays in flight until the test releases it (WebKit's
  // slower actionability checks used to lose the race and the Cancel button
  // detached mid-click).
  await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
  const demo = await openDemo(page, "AutoDialog");
  // pauseAt freezes timers; the app above already loaded while time ran.
  await page.clock.pauseAt(new Date("2026-01-01T01:00:00Z"));
  await demo.getByRole("button", { name: "Open server record" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("status")).toContainText("Loading record");
  await page.clock.runFor(600); // record load resolves
  const name = dialog.getByRole("textbox", { name: "Display name" });
  await name.fill("  Saved Name  ");
  await dialog.getByRole("checkbox", { name: "Fail next save" }).check();
  await dialog.getByTestId("rac-submit").click();
  await page.clock.runFor(800); // failing save resolves
  await expect(dialog.getByRole("alert")).toContainText("draft is preserved");
  await expect(name).toHaveValue("  Saved Name  ");
  await dialog.getByTestId("rac-submit").click();
  await expect(dialog).toBeVisible();
  await page.clock.runFor(800); // successful save resolves and closes
  await expect(dialog).toBeHidden();
  await expect(demo.getByTestId("mock-dialog-summary")).toContainText(
    "Saved Name",
  );
  await demo.getByRole("button", { name: "Open server record" }).click();
  await expect(dialog.getByRole("status")).toContainText("Loading record");
  await page.clock.runFor(600); // record load resolves
  await name.fill("Cancelled Name");
  await dialog.getByTestId("rac-submit").click();
  // The save is pending while timers are paused: prove it, then cancel —
  // the Cancel button cannot detach.
  await expect(dialog.getByRole("status")).toContainText("Saving to mock server");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toBeHidden();
  // Resume time: Cancel aborted the request, clearing its timer, so nothing
  // can commit.
  await page.clock.runFor(1000);
  await expect(demo.getByTestId("mock-dialog-summary")).toContainText(
    "Saved Name",
  );
  await expect(demo.getByTestId("mock-dialog-summary")).not.toContainText(
    "Cancelled Name",
  );
});

test("server form revokes permissions during a pending save and restores a fresh editable form", async ({
  page,
}) => {
  const demo = await openDemo(page, "AutoForm");
  const response = demo.getByRole("combobox", { name: "Server response" });
  await demo
    .getByRole("textbox", { name: "Display name" })
    .fill("Revoked draft");
  await demo.getByTestId("rac-submit").click();
  await expect(demo.getByTestId("rac-submit")).toBeDisabled();
  await response.selectOption("restricted");
  await expect(
    demo.getByText("Read-only access", { exact: true }),
  ).toBeVisible();
  await expect(demo.getByRole("textbox")).toHaveCount(0);
  await expect(demo.getByTestId("rac-submit")).toHaveCount(0);
  await expect(demo.getByTestId("rac-reset")).toHaveCount(0);
  await expect(demo.getByRole("checkbox")).toHaveCount(0);
  await expect(demo.getByTestId("rac-field-role")).toHaveCount(0);
  await page.waitForTimeout(800);
  await expect(demo.getByTestId("mock-form-saved")).toHaveCount(0);
  await expect(demo).not.toContainText("Revoked draft");
  await response.selectOption("normal");
  await expect(demo.getByRole("textbox", { name: "Display name" })).toHaveValue(
    "Casey Chen",
  );
  await expect(demo.getByTestId("rac-field-role")).toBeVisible();
  await demo
    .getByRole("textbox", { name: "Display name" })
    .fill("Restored profile");
  await demo.getByTestId("rac-submit").click();
  await expect(demo.getByTestId("mock-form-saved")).toContainText(
    "Restored profile",
  );
});

test("form schema changes discard stale loads and recover from empty and failed responses", async ({
  page,
}) => {
  const demo = await openDemo(page, "AutoForm");
  const response = demo.getByRole("combobox", { name: "Server response" });
  await response.selectOption("restricted");
  await response.selectOption("empty");
  await expect(demo.getByRole("status")).toHaveText(
    "The server returned no form fields.",
  );
  await expect(demo.getByTestId("rac-submit")).toHaveCount(0);
  await response.selectOption("error");
  await expect(demo.getByRole("alert")).toBeVisible();
  await demo.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(response).toHaveValue("normal");
  await expect(demo.getByRole("textbox", { name: "Display name" })).toHaveValue(
    "Casey Chen",
  );
  await expect(demo.getByTestId("rac-submit")).toBeEnabled();
});

for (const pending of ["load", "save", "failed save"] as const) {
  test(`dialog permission change cancels a pending ${pending} and restores editable access`, async ({
    page,
  }) => {
    const demo = await openDemo(page, "AutoDialog");
    const response = demo.locator('select[aria-label="Server response"]');
    await demo.getByRole("button", { name: "Open server record" }).click();
    const dialog = page.getByRole("dialog");
    if (pending === "load") {
      await expect(dialog.getByRole("status")).toContainText("Loading record");
    } else {
      await dialog
        .getByRole("textbox", { name: "Display name" })
        .fill("Revoked dialog draft");
      if (pending === "failed save")
        await dialog.getByRole("checkbox", { name: "Fail next save" }).check();
      await dialog.getByTestId("rac-submit").click();
      await expect(dialog.getByRole("status")).toContainText(
        "Saving to mock server",
      );
    }
    // Emulate an external server-permission response while the modal blocks ordinary page interaction.
    await response.selectOption("restricted", { force: true });
    await expect(dialog).toBeHidden();
    await demo.getByRole("button", { name: "Open server record" }).click();
    await expect(
      dialog.getByText("Read-only access", { exact: true }),
    ).toBeVisible();
    await expect(dialog.getByRole("textbox")).toHaveCount(0);
    await expect(dialog.getByTestId("rac-submit")).toHaveCount(0);
    await expect(dialog.getByTestId("rac-reset")).toHaveCount(0);
    await expect(dialog.getByRole("checkbox")).toHaveCount(0);
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(demo.getByTestId("mock-dialog-summary")).toContainText(
      "Jordan Lee",
    );
    await response.selectOption("normal");
    await demo.getByRole("button", { name: "Open server record" }).click();
    await expect(
      dialog.getByRole("textbox", { name: "Display name" }),
    ).toHaveValue("Jordan Lee");
    await dialog
      .getByRole("textbox", { name: "Display name" })
      .fill("Restored dialog");
    await dialog.getByTestId("rac-submit").click();
    await expect(dialog).toBeHidden();
    await expect(demo.getByTestId("mock-dialog-summary")).toContainText(
      "Restored dialog",
    );
  });
}

test("dialog cancellation during record loading cannot reopen or populate a later session", async ({
  page,
}) => {
  const demo = await openDemo(page, "AutoDialog");
  const dialog = page.getByRole("dialog");
  await demo.getByRole("button", { name: "Open server record" }).click();
  await expect(dialog.getByRole("status")).toContainText("Loading record");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.waitForTimeout(650);
  await expect(dialog).toHaveCount(0);
  await demo.getByRole("button", { name: "Open server record" }).click();
  await expect(dialog.getByRole("status")).toContainText("Loading record");
  await expect(
    dialog.getByRole("textbox", { name: "Display name" }),
  ).toHaveValue("Jordan Lee");
});

test("dialog schema errors and empty records expose no stale actions and retry restores access", async ({
  page,
}) => {
  const demo = await openDemo(page, "AutoDialog");
  const response = demo.getByRole("combobox", { name: "Server response" });
  await demo.getByRole("button", { name: "Open server record" }).waitFor();
  await response.selectOption("empty");
  await expect(demo.getByRole("status")).toHaveText(
    "No record is available to open.",
  );
  await expect(
    demo.getByRole("button", { name: "Open server record" }),
  ).toHaveCount(0);
  await response.selectOption("error");
  await expect(demo.getByRole("alert")).toBeVisible();
  await expect(
    demo.getByRole("button", { name: "Open server record" }),
  ).toHaveCount(0);
  await demo.getByRole("button", { name: "Retry", exact: true }).click();
  await demo.getByRole("button", { name: "Open server record" }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("textbox", { name: "Display name" }),
  ).toHaveValue("Jordan Lee");
  await expect(dialog.getByTestId("rac-submit")).toBeEnabled();
});
