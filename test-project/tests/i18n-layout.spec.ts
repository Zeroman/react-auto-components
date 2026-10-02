import { test, expect, type Page } from "@playwright/test";

test.use({ locale: "en-US" });
const picker = (page: Page) =>
  page.locator(".topbar").getByTestId("language-picker");
const pages = [
  "AutoChat",
  "AutoTable",
  "AutoForm",
  "AutoSearch",
  "AutoDialog",
  "AutoTabs",
];

async function openDemo(page: Page, name: string) {
  await page
    .getByRole("navigation")
    .getByRole("button", { name, exact: true })
    .click();
}

async function bounded(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const root = document.documentElement;
        const content = document
          .querySelector(".demo-viewport")!
          .getBoundingClientRect();
        return (
          root.scrollHeight <= innerHeight + 1 &&
          root.scrollWidth <= innerWidth + 1 &&
          content.height > 100 &&
          content.bottom <= innerHeight
        );
      }),
    )
    .toBe(true);
}

test("browser detection, manual persistence and returning to automatic language", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("h1")).toHaveText("Smart table");
  await picker(page).selectOption("zh-CN");
  await expect(page.locator("h1")).toHaveText("智能表格");
  await page.reload();
  await expect(picker(page)).toHaveValue("zh-CN");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
  await picker(page).selectOption("auto");
  await expect(page.locator("h1")).toHaveText("Smart table");
  const context = await browser.newContext({ locale: "zh-HK" });
  const detected = await context.newPage();
  await detected.goto("/");
  await expect(detected.locator("html")).toHaveAttribute("lang", "zh-TW");
  await context.close();
});

test("language changes keep form input and translate the active settings dialog", async ({
  page,
}) => {
  await page.goto("/");
  await openDemo(page, "AutoForm");
  const input = page.locator('[data-field="name"] input');
  await input.fill("Keep my draft");
  await picker(page).selectOption("ja");
  await expect(input).toHaveValue("Keep my draft");
  await page.locator(".topbar button").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByTestId("language-picker").selectOption("de");
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByTestId("language-picker")).toHaveValue("de");
  await page.keyboard.press("Escape");
  await expect(input).toHaveValue("Keep my draft");
});

for (const locale of [
  "en",
  "zh-CN",
  "zh-TW",
  "ja",
  "ko",
  "es",
  "fr",
  "de",
  "pt-BR",
  "ru",
]) {
  test(`${locale}: every page fits the viewport and has translated interface text`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    await picker(page).selectOption(locale);
    for (const name of pages) {
      await openDemo(page, name);
      await bounded(page);
      if (!["zh-CN", "zh-TW", "ja"].includes(locale)) {
        const text = await page.locator("main").innerText();
        expect(text).not.toMatch(/[\u3400-\u9fff]/);
      }
    }
  });
}

test("all pages remain reachable on a narrow screen with long translations", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await picker(page).selectOption("de");
  for (const name of pages) {
    await openDemo(page, name);
    await bounded(page);
    await expect(picker(page)).toBeVisible();
  }
  await openDemo(page, "AutoTable");
  await expect
    .poll(() =>
      page.locator(".auto-table-scroll").evaluate((el) => el.clientHeight),
    )
    .toBeGreaterThan(60);
  const next = page.locator(".auto-pagination button").last();
  await next.scrollIntoViewIfNeeded();
  await expect(next).toBeInViewport();
  await next.click();
  await expect(page.locator(".auto-pagination")).toContainText("2 / 5");
  const table = await page.locator(".auto-table").boundingBox();
  const footer = await page.locator(".auto-pagination").boundingBox();
  expect(footer!.y + footer!.height).toBeLessThanOrEqual(
    table!.y + table!.height + 1,
  );
  await page.screenshot({ path: "test-results/i18n-mobile-de.png" });
});

test("table grows with available height", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const table = page.locator(".auto-table-scroll");
  const before = await table.evaluate((el) => el.clientHeight);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await expect
    .poll(() => table.evaluate((el) => el.clientHeight))
    .toBe(before + 200);
});
