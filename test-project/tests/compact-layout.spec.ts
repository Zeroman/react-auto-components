import { test, expect, type Locator, type Page } from "@playwright/test";

async function setGlobalLayout(page: Page, layout: "stacked" | "inline") {
  await page.getByRole("button", { name: "打开全局设置" }).click();
  const dialog = page.getByRole("dialog", { name: "全局设置", exact: true });
  await dialog.getByLabel("全局表单布局").selectOption(layout);
  await dialog.getByRole("button", { name: "关闭弹窗" }).click();
}

async function labelBesideControl(field: Locator) {
  const label = await field.locator(":scope > label").boundingBox();
  const control = await field.locator("input").first().boundingBox();
  expect(label!.x + label!.width).toBeLessThanOrEqual(control!.x);
  expect(label!.y).toBeLessThan(control!.y + control!.height);
  expect(label!.y + label!.height).toBeGreaterThan(control!.y);
}

test("table search uses one compact row with visible associated labels and actions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto("/");
  const search = page.locator(".auto-search");
  await labelBesideControl(search.locator('[data-field="name"]'));
  const input = search.getByRole("textbox", { name: "项目名称" });
  const box = await input.boundingBox();
  expect(box!.height).toBeLessThanOrEqual(34);
  const button = await search
    .getByRole("button", { name: "搜索", exact: true })
    .boundingBox();
  expect(Math.abs(button!.y - box!.y)).toBeLessThanOrEqual(2);
  expect((await search.boundingBox())!.height).toBeLessThanOrEqual(80);
  await search.locator('[data-field="name"] > label').click();
  await expect(input).toBeFocused();
  await page.screenshot({
    path: "test-results/compact-search.png",
    fullPage: true,
  });
});

test("compact search wraps at mobile width without losing labels or overflowing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 1000 });
  await page.goto("/");
  await page.getByRole("button", { name: "更多条件" }).click();
  const search = page.locator(".auto-search");
  await labelBesideControl(search.locator('[data-field="name"]'));
  await expect(search.getByRole("combobox", { name: "地区" })).toBeVisible();
  await expect(
    search.getByRole("button", { name: "搜索", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
});

test("form can switch label position and density while keeping errors aligned with controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto("/");
  await setGlobalLayout(page, "stacked");
  await page.getByRole("button", { name: /AutoForm/ }).click();
  const field = page.locator('[data-field="name"]');
  const before = await field.boundingBox();
  await page.getByLabel("表单标签位置").selectOption("left");
  await page.getByLabel("紧凑表单").check();
  await labelBesideControl(field);
  expect((await field.boundingBox())!.height).toBeLessThan(before!.height);
  await page.getByRole("button", { name: "提交", exact: true }).click();
  const input = await field.getByRole("textbox").boundingBox();
  const error = await field.getByRole("alert").boundingBox();
  expect(Math.abs(error!.x - input!.x)).toBeLessThanOrEqual(1);
  expect(error!.y).toBeGreaterThanOrEqual(input!.y + input!.height);
  await page.setViewportSize({ width: 375, height: 1000 });
  await labelBesideControl(field);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
  await page.getByLabel("表单标签位置").selectOption("top");
  const label = await field.locator(":scope > label").boundingBox();
  expect(label!.y + label!.height).toBeLessThanOrEqual(
    (await field.getByRole("textbox").boundingBox())!.y,
  );
});

test("global layout switches table search, forms and dialog fields without clearing values", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  const field = page.locator('.auto-search [data-field="name"]');
  await field.getByRole("textbox").fill("未提交的条件");
  await setGlobalLayout(page, "stacked");
  const label = await field.locator(":scope > label").boundingBox();
  expect(label!.y + label!.height).toBeLessThanOrEqual(
    (await field.getByRole("textbox").boundingBox())!.y,
  );
  await expect(field.getByRole("textbox")).toHaveValue("未提交的条件");
  await setGlobalLayout(page, "inline");
  await labelBesideControl(field);
  await page.getByRole("button", { name: "新增", exact: true }).click();
  await labelBesideControl(
    page.getByRole("dialog").locator('[data-field="name"]'),
  );
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await page.getByRole("button", { name: /AutoForm/ }).click();
  const formField = page.locator('[data-field="name"]');
  await labelBesideControl(formField);
  await setGlobalLayout(page, "stacked");
  const formLabel = await formField.locator(":scope > label").boundingBox();
  expect(formLabel!.y + formLabel!.height).toBeLessThanOrEqual(
    (await formField.getByRole("textbox").boundingBox())!.y,
  );
  await page.getByLabel("表单标签位置").selectOption("left");
  await labelBesideControl(formField);
  await page.getByRole("button", { name: /AutoSearchPanel/ }).click();
  const searchField = page.locator('[data-field="name"]');
  const searchLabel = await searchField.locator(":scope > label").boundingBox();
  expect(searchLabel!.y + searchLabel!.height).toBeLessThanOrEqual(
    (await searchField.getByRole("textbox").boundingBox())!.y,
  );
});

test("global settings are isolated in a panel while the current example stays mounted", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("全局表单布局")).toHaveCount(0);
  await page.getByRole("tab", { name: "剩余高度", exact: true }).click();
  await page.getByRole("button", { name: "打开全局设置" }).click();
  const settings = page.getByRole("dialog", { name: "全局设置", exact: true });
  await settings.getByLabel("全局表单密度").selectOption("comfortable");
  await settings.getByLabel("深色主题").check();
  await settings.getByRole("button", { name: "关闭弹窗" }).click();
  await expect(
    page.getByRole("tab", { name: "剩余高度", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("height-frame")).toBeVisible();
  await expect(page.locator(".studio")).toHaveClass(/studio-dark/);
  await expect(page.locator(".auto-search form")).toHaveAttribute(
    "data-density",
    "comfortable",
  );
});

test("label alignment keeps labels before controls and preserves values and focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto("/");
  const searchField = page.locator('.auto-search [data-field="name"]');
  await searchField.getByRole("textbox").fill("保留条件");
  async function setAlign(align: "left" | "right") {
    await page.getByRole("button", { name: "打开全局设置" }).click();
    const dialog = page.getByRole("dialog", { name: "全局设置", exact: true });
    await dialog.getByLabel("全局标签对齐").selectOption(align);
    await dialog.getByRole("button", { name: "关闭弹窗" }).click();
  }
  async function alignedLabel(field: Locator, align: "left" | "right") {
    await labelBesideControl(field);
    const label = field.locator(":scope > label");
    await expect(label).toHaveCSS("text-align", align);
    const gap = await label.evaluate((node, side) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      const text = range.getBoundingClientRect();
      const box = node.getBoundingClientRect();
      return side === "right" ? box.right - text.right : text.left - box.left;
    }, align);
    expect(Math.abs(gap)).toBeLessThanOrEqual(1);
    await label.click();
    await expect(field.getByRole("textbox")).toBeFocused();
  }
  await setAlign("left");
  await alignedLabel(searchField, "left");
  await setAlign("right");
  await alignedLabel(searchField, "right");
  await expect(searchField.getByRole("textbox")).toHaveValue("保留条件");
  await page.getByRole("button", { name: "新增", exact: true }).click();
  await alignedLabel(
    page.getByRole("dialog").locator('[data-field="name"]'),
    "right",
  );
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await page.getByRole("button", { name: /AutoForm/ }).click();
  const field = page.locator('[data-field="name"]').first();
  await alignedLabel(field, "right");
  await page.getByLabel("表单标签对齐").selectOption("left");
  await alignedLabel(field, "left");
  await page.getByLabel("表单标签对齐").selectOption("inherit");
  await alignedLabel(field, "right");
  await page.setViewportSize({ width: 375, height: 1000 });
  await alignedLabel(field, "right");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
});

test("global size and density options update tabs, tables and forms across pages", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto("/");

  // Open global settings
  await page.getByRole("button", { name: "打开全局设置" }).click();
  const dialog = page.getByRole("dialog", { name: "全局设置", exact: true });

  // Select small size and compact densities
  await dialog.getByLabel("全局组件尺寸").selectOption("small");
  await dialog.getByLabel("全局表格紧凑度").selectOption("compact");
  await dialog.getByLabel("全局标签紧凑度").selectOption("compact");
  await dialog.getByRole("button", { name: "关闭弹窗" }).click();

  // Verify table has data-size="small" and data-density="compact"
  const table = page.locator(".auto-table").first();
  await expect(table).toHaveAttribute("data-size", "small");
  await expect(table).toHaveAttribute("data-density", "compact");

  // Verify tabs have data-size="small" and data-density="compact"
  const tabs = page.locator(".auto-tabs").first();
  await expect(tabs).toHaveAttribute("data-size", "small");
  await expect(tabs).toHaveAttribute("data-density", "compact");

  const smallTabBox = await tabs.getByRole("tab").first().boundingBox();

  // Switch to large size via global settings
  await page.getByRole("button", { name: "打开全局设置" }).click();
  await dialog.getByLabel("全局组件尺寸").selectOption("large");
  await dialog.getByLabel("全局表格紧凑度").selectOption("comfortable");
  await dialog.getByLabel("全局标签紧凑度").selectOption("comfortable");
  await dialog.getByRole("button", { name: "关闭弹窗" }).click();

  await expect(table).toHaveAttribute("data-size", "large");
  await expect(table).toHaveAttribute("data-density", "comfortable");
  await expect(tabs).toHaveAttribute("data-size", "large");
  await expect(tabs).toHaveAttribute("data-density", "comfortable");

  const largeTabBox = await tabs.getByRole("tab").first().boundingBox();
  expect(largeTabBox!.height).toBeGreaterThan(smallTabBox!.height);

  // Navigate to AutoTabs page and check local override
  await page.getByRole("button", { name: /AutoTabs/ }).click();
  const demoTabs = page.locator(".card > .auto-tabs");
  await expect(demoTabs).toHaveAttribute("data-size", "large");
  await page.getByLabel("局部标签尺寸").selectOption("small");
  await expect(demoTabs).toHaveAttribute("data-size", "small");
});

test("adaptive label width supports auto mode and manual override in search panel and form", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto("/");

  // 1. In search panel, labels hug text: short labels (like "状态") are narrower than "项目名称"
  await page.getByRole("button", { name: "更多条件" }).click();
  const searchNameLabel = page.locator(
    '.auto-search [data-field="name"] > label',
  );
  const searchStatusLabel = page.locator(
    '.auto-search [data-field="status"] > label',
  );
  const nameBox = await searchNameLabel.boundingBox();
  const statusBox = await searchStatusLabel.boundingBox();
  expect(nameBox).toBeTruthy();
  expect(statusBox).toBeTruthy();
  expect(statusBox!.width).toBeLessThan(nameBox!.width);

  // 2. In AutoForm, column controls vertically align
  await page.getByRole("button", { name: /AutoForm/ }).click();
  const form = page.locator(".card form.auto-form").first();
  await expect(form).toHaveAttribute("data-label-width", "auto");

  // In column 2: "状态" (2 chars) and "交付日期" (4 chars) have their controls start at the same X
  const statusControl = form.locator('[data-field="status"] select');
  const dateControl = form.locator('[data-field="date"] input');
  const statusBoxForm = await statusControl.boundingBox();
  const dateBoxForm = await dateControl.boundingBox();
  expect(statusBoxForm).toBeTruthy();
  expect(dateBoxForm).toBeTruthy();
  expect(Math.abs(statusBoxForm!.x - dateBoxForm!.x)).toBeLessThanOrEqual(2);

  // 3. Test local label width override on FormDemo
  await page.getByLabel("表单标签宽度").selectOption("120");
  await expect(form).toHaveAttribute("data-label-width", "120px");
  await page.getByLabel("表单标签宽度").selectOption("auto");
  await expect(form).toHaveAttribute("data-label-width", "auto");

  // 4. Switch global label width via GlobalSettings
  await page.getByRole("button", { name: "打开全局设置" }).click();
  const dialog = page.getByRole("dialog", { name: "全局设置", exact: true });
  await dialog.getByLabel("全局标签宽度自适应").uncheck();
  await dialog.getByRole("button", { name: "关闭弹窗" }).click();

  // Reset local override to follow global
  await page.getByLabel("表单标签宽度").selectOption("inherit");
  await expect(form).toHaveAttribute("data-label-width", "80px");

  // Re-enable auto in GlobalSettings
  await page.getByRole("button", { name: "打开全局设置" }).click();
  await dialog.getByLabel("全局标签宽度自适应").check();
  await dialog.getByRole("button", { name: "关闭弹窗" }).click();
  await expect(form).toHaveAttribute("data-label-width", "auto");
});
