import { test, expect, type Page } from "@playwright/test";

async function fitted(page: Page) {
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const frame = document.querySelector('[data-testid="height-frame"]')!;
        const table = frame.querySelector(".auto-table")!;
        const footer = frame.querySelector(".height-demo-footer")!;
        const scroll = table.querySelector(".auto-table-scroll, .auto-json")!;
        const pagination = table.querySelector(".auto-pagination");
        const f = frame.getBoundingClientRect(),
          t = table.getBoundingClientRect(),
          s = scroll.getBoundingClientRect();
        return (
          Math.abs(
            t.bottom -
              (footer.getBoundingClientRect().top -
                parseFloat(getComputedStyle(frame).rowGap)),
          ) <= 2 &&
          s.height > 60 &&
          s.bottom <= t.bottom &&
          (!pagination ||
            s.bottom <= pagination.getBoundingClientRect().top + 1) &&
          frame.scrollHeight <= frame.clientHeight + 1 &&
          document.documentElement.scrollHeight <= window.innerHeight + 1 &&
          document.documentElement.scrollWidth <= window.innerWidth + 1 &&
          f.top > 0 &&
          f.bottom <= window.innerHeight &&
          f.height < window.innerHeight
        );
      }),
    )
    .toBe(true);
}
async function bodyHeight(page: Page) {
  return page.locator(".auto-table-scroll").evaluate((el) => el.clientHeight);
}
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page
    .getByRole("tab", { name: "Remaining Height", exact: true })
    .click();
});

test("auto height fills flex remainder after viewport and sibling size changes", async ({
  page,
}) => {
  await fitted(page);
  const start = await bodyHeight(page);
  await page.setViewportSize({ width: 1440, height: 1180 });
  await expect.poll(() => bodyHeight(page)).toBe(start + 180);
  await page.getByRole("button", { name: "Toggle description above" }).click();
  await fitted(page);
  expect(await bodyHeight(page)).toBeLessThan(start + 180);
  await page.getByRole("button", { name: "Toggle description above" }).click();
  await expect.poll(() => bodyHeight(page)).toBe(start + 180);
  await page.screenshot({
    path: "test-results/auto-height-flex.png",
    fullPage: true,
  });
  const footer = await page.locator(".auto-pagination").boundingBox();
  await page.locator(".auto-table-scroll").evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  expect((await page.locator(".auto-pagination").boundingBox())!.y).toBe(
    footer!.y,
  );
});

test("auto height responds to more search fields and toolbar wrapping", async ({
  page,
}) => {
  await fitted(page);
  const start = await bodyHeight(page);
  await page.getByRole("button", { name: "More filters" }).click();
  await fitted(page);
  expect(await bodyHeight(page)).toBeLessThan(start);
  const wideToolbar = await page
    .locator(".auto-toolbar")
    .evaluate((el) => el.clientHeight);
  await page.setViewportSize({ width: 375, height: 1300 });
  await fitted(page);
  expect(
    await page.locator(".auto-toolbar").evaluate((el) => el.clientHeight),
  ).toBeGreaterThan(wideToolbar);
  await expect(page.getByRole("button", { name: "Next page" })).toBeVisible();
});

test("grid auto height survives hiding, pagination changes, virtual jumps and empty data", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.getByLabel("Parent layout").selectOption("grid");
  await fitted(page);
  const paginated = await bodyHeight(page);
  await page.getByLabel("Show pagination").uncheck();
  await fitted(page);
  expect(await bodyHeight(page)).toBeGreaterThan(paginated);
  await page.getByRole("button", { name: "Scroll to row 9000" }).click();
  await expect(page.locator('tr[data-row-id="9000"]')).toBeVisible();
  expect(await page.locator("tbody tr[data-row-id]").count()).toBeLessThan(60);
  await page.getByRole("button", { name: "Hide table" }).click();
  await expect(
    page.getByRole("region", { name: "Adaptive table" }),
  ).toBeHidden();
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.getByRole("button", { name: "Show table" }).click();
  await fitted(page);
  await page.getByRole("button", { name: "Scroll to row 9000" }).click();
  await expect(page.locator('tr[data-row-id="9000"]')).toBeVisible();
  const all = await bodyHeight(page);
  await page.getByLabel("Data size").selectOption("few");
  await fitted(page);
  expect(await bodyHeight(page)).toBe(all);
  await page.getByLabel("Data size").selectOption("empty");
  await fitted(page);
  await expect(page.getByText("No data")).toBeVisible();
  expect(await bodyHeight(page)).toBe(all);
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  await fitted(page);
  expect(errors).toEqual([]);
});

test("numeric table height retains its original scroll-area meaning", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const path = "/tests/fixtures/fixed-height.tsx";
    (await import(/* @vite-ignore */ path)).mount();
  });
  const fixedBody = () =>
    page
      .locator('[aria-label="fixed-height-fixture"] .auto-table-scroll')
      .evaluate((el) => el.clientHeight);
  await expect.poll(fixedBody).toBe(440);
  await page.setViewportSize({ width: 1000, height: 800 });
  expect(await fixedBody()).toBe(440);
});

test("remaining height is an in-page tab and the old link opens the same application shell", async ({
  page,
}) => {
  await expect(
    page.getByRole("tab", { name: "Remaining Height", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: /AutoForm/ })).toBeVisible();
  expect(new URL(page.url()).search).toBe("");
  await fitted(page);
  await page.getByRole("tab", { name: "Local Data", exact: true }).click();
  await expect(page.getByTestId("height-frame")).toHaveCount(0);
  await page.getByRole("tab", { name: "Local Data", exact: true }).focus();
  await page.keyboard.press("End");
  await expect(
    page.getByRole("tab", { name: "Remaining Height", exact: true }),
  ).toBeFocused();
  await fitted(page);
  await page.goto("/?demo=auto-height");
  await expect(page.getByRole("button", { name: /AutoForm/ })).toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Remaining Height", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await fitted(page);
});

test("switching to remaining height preserves the page heading, description and tabs", async ({
  page,
}) => {
  await page.getByRole("tab", { name: "Local Data", exact: true }).click();
  const selectors = [
    ".page-heading",
    ".section-heading",
    ".table-demo .auto-tabs-heading",
  ];
  const before = await Promise.all(
    selectors.map((selector) => page.locator(selector).boundingBox()),
  );
  await page
    .getByRole("tab", { name: "Remaining Height", exact: true })
    .click();
  await expect(
    page.getByText(
      "Search, sort, layout, export, and edit — all in one workflow.",
      {
        exact: true,
      },
    ),
  ).toBeVisible();
  await expect(page.locator(".page-footer")).toBeVisible();
  for (const [index, selector] of selectors.entries()) {
    const after = await page.locator(selector).boundingBox();
    for (const key of ["x", "y", "width", "height"] as const) {
      expect(Math.abs(after![key] - before[index]![key])).toBeLessThanOrEqual(
        1,
      );
    }
  }
  await fitted(page);
});
