import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
});
test("table CRUD search and persisted settings through public package", async ({
  page,
}) => {
  await expect(page.getByRole("heading", { name: "智能表格" })).toBeVisible();
  await page.getByRole("button", { name: "新增", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox", { name: "项目名称" })
    .fill("浏览器验收项目");
  await dialog.getByRole("button", { name: "确定", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("cell", { name: "浏览器验收项目", exact: true }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "项目名称" }).fill("浏览器验收");
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  const row = page.getByRole("row").filter({
    has: page.getByRole("cell", { name: "浏览器验收项目", exact: true }),
  });
  await row.getByRole("button", { name: /编辑行/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "项目名称" })
    .fill("浏览器验收项目更新");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "确定", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "浏览器验收项目更新", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("row")
    .filter({
      has: page.getByRole("cell", { name: "浏览器验收项目更新", exact: true }),
    })
    .getByRole("button", { name: /删除行/ })
    .click();
  await page.getByRole("button", { name: "确认删除", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "浏览器验收项目更新", exact: true }),
  ).toBeHidden();
  await page.getByRole("button", { name: "重置", exact: true }).click();
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page.getByRole("dialog").getByLabel("预算", { exact: true }).uncheck();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "确定", exact: true })
    .click();
  await expect(
    page.getByRole("columnheader").filter({ hasText: "预算" }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("columnheader").filter({ hasText: "预算" }),
  ).toHaveCount(0);
});
test("form failures retain values and successful submission produces typed output", async ({
  page,
}) => {
  await page.getByRole("button", { name: /AutoForm/ }).click();
  await page.getByRole("button", { name: "提交", exact: true }).click();
  await expect(page.getByText("项目名称为必填项")).toBeVisible();
  await page.getByRole("textbox", { name: "项目名称" }).fill("表单验收");
  await page.getByLabel("模拟提交失败").check();
  await page.getByRole("button", { name: "提交", exact: true }).click();
  await expect(
    page.getByText("模拟服务端拒绝，请关闭失败开关后重试"),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "项目名称" })).toHaveValue(
    "表单验收",
  );
  await page.getByLabel("模拟提交失败").uncheck();
  await page.getByRole("button", { name: "提交", exact: true }).click();
  await expect(page.getByTestId("form-result")).toContainText("表单验收");
});
test("dialog draft and focus restoration", async ({ page }) => {
  await page.getByRole("button", { name: /AutoDialog/ }).click();
  const trigger = page.getByRole("button", { name: "打开表单弹窗" });
  await trigger.click();
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "项目名称" })
    .fill("草稿保存");
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(page.getByRole("textbox", { name: "项目名称" })).toHaveValue(
    "草稿保存",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});
test("popover dismiss and nested tabs preserve state", async ({ page }) => {
  await page.getByRole("button", { name: /AutoPopover/ }).click();
  await page.getByRole("button", { name: "right", exact: true }).click();
  await expect(page.getByText("right 浮层")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText("right 浮层")).toBeHidden();
  await page.getByRole("button", { name: /AutoTabs/ }).click();
  await page.getByLabel("标签草稿").fill("保留内容");
  await page.getByRole("tab", { name: "配置", exact: true }).click();
  await page.getByRole("tab", { name: "权限", exact: true }).click();
  await expect(page.getByText("权限配置内容")).toBeVisible();
  await page.getByRole("tab", { name: "概览", exact: true }).click();
  await expect(page.getByLabel("标签草稿")).toHaveValue("保留内容");
});
test("ten thousand virtual rows use bounded DOM and jump to target", async ({
  page,
}) => {
  await page.getByRole("button", { name: /AutoScroll/ }).click();
  await expect(page.getByTestId("virtual-row").first()).toBeVisible();
  expect(await page.getByTestId("virtual-row").count()).toBeLessThan(40);
  await page.getByRole("button", { name: "跳到第 9000 行" }).click();
  await expect(
    page
      .getByTestId("virtual-row")
      .filter({ has: page.getByText("9000", { exact: true }) }),
  ).toBeVisible();
  await page.getByLabel("动态行高").check();
  await page.getByRole("button", { name: "跳到第 9000 行" }).click();
  await expect(
    page
      .getByTestId("virtual-row")
      .filter({ has: page.getByText("9000", { exact: true }) }),
  ).toBeVisible();
});
test("server mode and large table have no runtime errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.getByRole("tab", { name: "服务端", exact: true }).click();
  await expect(page.getByText("48 条记录")).toBeVisible();
  await page.getByRole("button", { name: "下一页" }).click();
  await expect(page.getByText("第 2 / 5 页")).toBeVisible();
  await page.getByRole("tab", { name: "万行数据" }).click();
  await expect(page.getByText("10,000 条记录")).toBeVisible();
  expect(await page.getByRole("row").count()).toBeLessThan(40);
  expect(errors).toEqual([]);
});
test("search panel preserves manual mode and handles more conditions", async ({
  page,
}) => {
  await page.getByRole("button", { name: /AutoSearchPanel/ }).click();
  await page.getByRole("textbox", { name: "项目名称" }).fill("客户");
  await expect(page.getByTestId("query-result")).not.toContainText("客户");
  await page.getByRole("button", { name: "搜索", exact: true }).click();
  await expect(page.getByTestId("query-result")).toContainText("客户");
  await page.getByRole("button", { name: "更多条件" }).click();
  await expect(page.getByRole("combobox", { name: "地区" })).toBeVisible();
});
test("mobile navigation and actions remain reachable", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(
    page.getByRole("button", { name: "新增", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "新增", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(375);
});

test("dynamic table expansion, column resizing and export work in the browser", async ({
  page,
}) => {
  await page.getByRole("tab", { name: "树形与展开", exact: true }).click();
  await page.getByRole("button", { name: "展开行 1", exact: true }).click();
  await expect(page.getByTestId("expanded-detail").first()).toBeVisible();
  const child = page.locator('tr[data-row-id="1-child"]');
  await expect(child).toBeVisible();
  const detailBox = await page
    .getByTestId("expanded-detail")
    .first()
    .boundingBox();
  const childBox = await child.boundingBox();
  expect(childBox!.y).toBeGreaterThanOrEqual(detailBox!.y + detailBox!.height);
  await page.getByRole("tab", { name: "本地数据", exact: true }).click();
  const separator = page.getByRole("separator", { name: "调整 项目名称 列宽" });
  const header = page.getByRole("columnheader").filter({ has: separator });
  const before = await header.boundingBox();
  await separator.focus();
  await page.keyboard.press("ArrowRight");
  const after = await header.boundingBox();
  expect(after!.width).toBeGreaterThan(before!.width);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出", exact: true }).click();
  expect((await downloadPromise).suggestedFilename()).toMatch(/\.csv$/);
});
test("visual capture", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.screenshot({
    path: "test-results/studio-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.screenshot({
    path: "test-results/studio-mobile.png",
    fullPage: true,
  });
});

test("dialog traps focus, drags, toggles fullscreen and honors close guard", async ({
  page,
}) => {
  await page.getByRole("button", { name: /AutoDialog/ }).click();
  await page.getByRole("button", { name: "打开表单弹窗" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "确定", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(dialog).toContainText("新建项目");
  expect(
    await dialog.evaluate((el) => el.contains(document.activeElement)),
  ).toBe(true);
  const title = dialog.getByRole("heading", { name: "新建项目" });
  const before = await dialog.boundingBox();
  const titleBox = await title.boundingBox();
  await page.mouse.move(titleBox!.x + 20, titleBox!.y + 10);
  await page.mouse.down();
  await page.mouse.move(titleBox!.x + 70, titleBox!.y + 40);
  await page.mouse.up();
  const moved = await dialog.boundingBox();
  expect(moved!.x).toBeGreaterThan(before!.x + 30);
  await dialog.getByRole("button", { name: "切换全屏" }).click();
  const full = await dialog.boundingBox();
  expect(full!.width).toBeGreaterThan(moved!.width);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "测试关闭拦截" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "确定", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
});
