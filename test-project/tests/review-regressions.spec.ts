import { test, expect } from "@playwright/test";

test("nested form sizes match standalone sizes inside large tabs", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    // Vite serves this test-only fixture using the consumer's installed package.
    const fixturePath = "/tests/fixtures/size-overrides.tsx";
    const fixture = await import(/* @vite-ignore */ fixturePath);
    fixture.mount();
  });
  for (const [size, height] of [
    ["small", 26],
    ["medium", 30],
    ["large", 36],
  ] as const) {
    const row = page
      .getByRole("region", { name: `sizing-${size}`, exact: true })
      .locator("tbody tr");
    await expect(row).toBeVisible();
    expect((await row.boundingBox())!.height).toBeCloseTo(height, 0);
  }
  for (const size of ["small", "medium"]) {
    const baseline = page.getByRole("textbox", { name: `baseline-${size}` });
    const nested = page.getByRole("textbox", { name: `nested-${size}` });
    await expect(nested).toBeVisible();
    const box = await baseline.boundingBox();
    expect((await nested.boundingBox())!.height).toBeCloseTo(box!.height, 0);
    await expect(nested).toHaveCSS(
      "font-size",
      await baseline.evaluate((el) => getComputedStyle(el).fontSize),
    );
    const plainButton = baseline
      .locator("xpath=ancestor::form")
      .getByRole("button", { name: "提交", exact: true });
    const nestedButton = nested
      .locator("xpath=ancestor::form")
      .getByRole("button", { name: "提交", exact: true });
    expect((await nestedButton.boundingBox())!.height).toBeCloseTo(
      (await plainButton.boundingBox())!.height,
      0,
    );
  }
});

test("local standard table density overrides global compact and survives reload", async ({
  page,
}) => {
  await page.goto("/");
  const table = page.locator(".auto-table");
  await expect(table).toHaveAttribute("data-density", "compact");
  await page.getByRole("button", { name: "设置", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(/^密度/).selectOption("normal");
  await dialog.getByRole("button", { name: "确定", exact: true }).click();
  await expect(table).toHaveAttribute("data-density", "normal");
  await page.reload();
  await expect(table).toHaveAttribute("data-density", "normal");
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await dialog.getByLabel(/^密度/).selectOption("inherit");
  await dialog.getByRole("button", { name: "确定", exact: true }).click();
  await expect(table).toHaveAttribute("data-density", "compact");
});
