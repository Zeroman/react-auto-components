import { test, expect } from "@playwright/test";

test.use({ permissions: ["clipboard-read", "clipboard-write"] });

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("example source dialog shows source with file tabs", async ({ page }) => {
  await page.getByRole("button", { name: "View code" }).click();
  const dialog = page.getByRole("dialog");
  const viewer = dialog.getByTestId("code-viewer");
  await expect(dialog).toBeVisible();
  await expect(viewer).toContainText("TableDemo.tsx");
  await expect(viewer.locator("pre code")).toContainText(
    "export function TableDemo",
  );

  await viewer.getByRole("button", { name: "AutoHeightDemo.tsx" }).click();
  await expect(viewer.locator("pre code")).toContainText(
    "export function AutoHeightDemo",
  );
  await expect(
    viewer.getByRole("link", { name: "View on GitHub" }),
  ).toHaveAttribute(
    "href",
    /.+\/test-project\/src\/examples\/AutoHeightDemo\.tsx$/,
  );

  await viewer.getByRole("button", { name: "Copy code" }).click();
  await expect(viewer.getByRole("button", { name: "Copied" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    await viewer.locator("pre code").textContent(),
  );
});

test("example source follows the active demo page", async ({ page }) => {
  await page.getByRole("button", { name: /AutoForm/ }).click();
  await page.getByRole("button", { name: "View code" }).click();
  const viewer = page.getByRole("dialog").getByTestId("code-viewer");
  await expect(viewer.locator("pre code")).toContainText(
    "export function FormDemo",
  );
  await expect(
    viewer.getByRole("button", { name: "TableDemo.tsx" }),
  ).toHaveCount(0);
});

test("source dialog stays within a narrow viewport and scrolls code internally", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  const trigger = page.getByRole("button", { name: "View code" });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect
    .poll(() =>
      dialog.evaluate((element) => {
        const box = element.getBoundingClientRect();
        return (
          box.left >= 0 &&
          box.right <= innerWidth &&
          box.top >= 0 &&
          box.bottom <= innerHeight
        );
      }),
    )
    .toBe(true);
  const code = dialog.locator("pre");
  await expect(code).toBeInViewport();
  expect(
    await code.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true);
  await code.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  expect(await code.evaluate((element) => element.scrollTop)).toBeGreaterThan(
    0,
  );
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
