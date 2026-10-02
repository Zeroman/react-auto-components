import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 1000 });
  await page.goto("/");
  await page.evaluate(async () => {
    const path = "/tests/fixtures/adaptive-labels.tsx";
    (await import(/* @vite-ignore */ path)).mount();
  });
});
test("long automatic and fixed labels wrap without covering or squeezing inputs", async ({
  page,
}) => {
  for (const name of [
    "auto-long-form",
    "auto-long-search",
    "fixed-long-search",
  ]) {
    const field = page.getByTestId(name).locator('[data-field="name"]');
    const label = field.locator("label");
    const input = field.getByRole("textbox");
    await expect(input).toBeVisible();
    const inputBox = await input.boundingBox();
    const textBox = await label.evaluate((el) => {
      const r = document.createRange();
      r.selectNodeContents(el);
      return r.getBoundingClientRect().toJSON();
    });
    expect(inputBox!.width).toBeGreaterThanOrEqual(120);
    expect(textBox.right).toBeLessThanOrEqual(inputBox!.x);
    if (name === "fixed-long-search")
      expect((await label.boundingBox())!.width).toBe(80);
    await label.click();
    await expect(input).toBeFocused();
  }
});
test("automatic form labels remeasure when the translation provider changes", async ({
  page,
}) => {
  const section = page.getByTestId("translated-labels");
  const label = section.locator("label");
  const initial = (await label.boundingBox())!.width;
  await section.getByRole("button", { name: "Switch label language" }).click();
  await expect
    .poll(async () => (await label.boundingBox())!.width)
    .toBeGreaterThan(initial + 20);
  await section.getByRole("button", { name: "Switch label language" }).click();
  await expect
    .poll(async () => (await label.boundingBox())!.width)
    .toBeCloseTo(initial, 0);
});
