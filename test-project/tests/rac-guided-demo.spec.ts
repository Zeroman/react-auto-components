import { expect, test, type Page } from "@playwright/test";

/**
 * Server-driven guided demo against the real bridge: the Start button only
 * dispatches rac:demo-request; every inspect/fill/click is executed by the
 * devtools server over the pinned page connection. Completion of the full
 * form/search scenarios takes ~39s/~54s (3.5s guidance + >=3s holds).
 */

const COMPLETE_TIMEOUT = 70000;

async function bridgeReady(page: Page) {
  // The start button only renders once the demo client answered its first
  // status poll with the server's available scenarios.
  await expect(page.getByTestId("rac-demo-start")).toBeVisible({
    timeout: 20000,
  });
}

async function startDemo(page: Page) {
  await bridgeReady(page);
  await page.getByTestId("rac-demo-start").click();
  await expect(page.getByTestId("rac-demo-overlay")).toBeVisible();
}

test("form guided demo runs the real scenario and stops physical input while locked", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/#/form:rac");
  await expect(page.getByTestId("rac-form-preview")).toContainText("Atlas");
  await startDemo(page);

  // The overlay locks physical input: a trusted click and typing on the
  // underlying name field must not change the controlled value.
  const hint = page.getByTestId("rac-demo-hint");
  await expect(hint).toBeVisible();
  const nameField = page.getByLabel("Project name");
  await nameField.click({ position: { x: 6, y: 8 } });
  await expect(nameField).not.toBeFocused();
  // Stop retains keyboard focus. Space intentionally activates that button,
  // so ordinary text here has no spaces; cancellation is covered below.
  await page.keyboard.type("TypedByHand");
  await expect(nameField).toHaveValue("Atlas");
  await expect(page.getByTestId("rac-form-preview")).toContainText("Atlas");

  // The server drives the real demo to completion.
  await expect(page.getByTestId("rac-demo-state")).toHaveText(
    "Demonstration complete.",
    { timeout: COMPLETE_TIMEOUT },
  );
  await expect(page.getByTestId("rac-demo-overlay")).toBeHidden();

  // Every step landed in the live preview, JSON and submitted record.
  await expect(page.getByTestId("rac-form-preview")).toContainText(
    "Nebula / 星云计划",
  );
  await expect(page.getByTestId("rac-form-preview")).toContainText("4800");
  await expect(page.getByTestId("rac-form-preview")).toContainText("RAC-2026");
  await expect(page.getByTestId("rac-form-json")).toContainText(
    '"name": "Nebula / 星云计划"',
  );
  await expect(page.getByTestId("rac-form-json")).toContainText(
    '"budget": 4800',
  );
  await expect(page.getByTestId("rac-form-json")).toContainText(
    '"code": "RAC-2026"',
  );
  await expect(page.getByTestId("rac-form-submitted")).toContainText(
    "Nebula / 星云计划",
  );
  await expect(page.getByTestId("rac-form-submitted")).toContainText(
    "RAC-2026",
  );
});

test("form guided demo leaves other pages untouched", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto("/#/search:rac");
  await expect(page.getByTestId("rac-search-count")).toHaveText("6 projects");
  const otherUrl = page.url();

  const demoPage = await page.context().newPage();
  try {
    await demoPage.goto("/#/form:rac");
    await startDemo(demoPage);
    await expect(page.getByTestId("rac-demo-overlay")).toHaveCount(0);
    await expect(page.getByTestId("rac-search-count")).toHaveText("6 projects");
    await demoPage.getByTestId("rac-demo-stop").click();
    await expect(demoPage.getByTestId("rac-demo-state")).toHaveText(
      "Demonstration stopped.",
    );
    await expect(demoPage.getByTestId("rac-demo-overlay")).toBeHidden();
  } finally {
    await demoPage.close();
  }

  // The spectator page never moved and never entered a run.
  await expect(page).toHaveURL(otherUrl);
  await expect(page.getByTestId("rac-demo-state")).not.toHaveText(
    /complete|running|Step/i,
  );
  await expect(page.getByTestId("rac-search-count")).toHaveText("6 projects");
});

test("search guided demo applies instant and manual steps to the real results", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/#/search:rac");
  await startDemo(page);

  // The demo begins from a clean slate: all six rows before filtering.
  await expect(page.getByTestId("rac-search-count")).toHaveText("6 projects");

  // Step 7 of 8 refills the draft under manual mode: results hold at six.
  await expect(page.getByTestId("rac-demo-progress")).toHaveText(
    "Step 7 of 8",
    { timeout: 45000 },
  );
  await expect(page.getByTestId("rac-search-draft")).toContainText(
    '"name": "Atlas"',
  );
  await expect(page.getByTestId("rac-search-count")).toHaveText("6 projects");

  await expect(page.getByTestId("rac-demo-state")).toHaveText(
    "Demonstration complete.",
    { timeout: COMPLETE_TIMEOUT },
  );
  await expect(page.getByTestId("rac-demo-overlay")).toBeHidden();

  // Applied criteria: the manual Search step matched the two Atlas rows.
  await expect(page.getByTestId("rac-search-count")).toHaveText("2 projects");
  await expect(
    page.getByTestId("rac-search-results").getByText("Atlas", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByTestId("rac-search-results")
      .getByText("Atlas Mobile", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByTestId("rac-search-results").getByText("Beacon"),
  ).toHaveCount(0);
  await expect(page.getByTestId("rac-search-draft")).toContainText(
    '"name": "Atlas"',
  );
  await expect(page.getByTestId("rac-search-applied")).toContainText(
    '"value": "Atlas"',
  );
});

test("mobile overlay blocks input, Escape stops, reload never auto-starts", async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/form:rac");
  await startDemo(page);

  // Capture only once the target highlight is present.
  await expect(page.locator(".rac-demo-highlight")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("mobile-guidance.png"),
    fullPage: false,
  });
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  // Physical input stays blocked while guidance runs.
  const nameField = page.getByLabel("Project name");
  await nameField.click();
  await page.keyboard.type("nope");
  await expect(nameField).toHaveValue("Atlas");

  // Escape always stops: the overlay unlocks and nothing further changes.
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("rac-demo-overlay")).toBeHidden({
    timeout: 10000,
  });
  await page.waitForTimeout(4000);
  await expect(nameField).toHaveValue("Atlas");
  await expect(page.getByTestId("rac-form-preview")).toContainText("Atlas");

  // A fresh start works after a manual stop...
  await startDemo(page);
  // ...and reloading during the run unlocks the page without auto-start.
  await page.reload();
  await expect(page.getByTestId("rac-demo-overlay")).toBeHidden();
  await expect(page.getByTestId("rac-form-preview")).toContainText("Atlas");
  // The replacement page client reports idle ("rac.demo.ready") and nothing
  // re-locks the page.
  await expect
    .poll(
      async () => ({
        overlay: await page.getByTestId("rac-demo-overlay").count(),
        state: await page.getByTestId("rac-demo-state").textContent(),
      }),
      { timeout: 10000 },
    )
    .toEqual({
      overlay: 0,
      state: "The demonstration drives this page. Watch the highlighted area.",
    });
});
