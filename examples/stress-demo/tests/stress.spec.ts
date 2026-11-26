import { expect, test, type Page } from "@playwright/test";

/**
 * Browser coverage for the stress demo. Each test also fails on unexpected
 * console errors / page exceptions so regressions surface as noise.
 */

const ROUTES: [label: string, id: string, heading: string][] = [
  ["AutoForm", "form", "AutoForm 极限"],
  ["AutoTable", "table", "AutoTable 极限"],
  ["AutoChat", "chat", "AutoChat 极限"],
  ["AutoDialog", "dialog", "AutoDialog 极限"],
  ["AutoMenu", "menu", "AutoMenu 极限"],
  ["AutoTabs", "tabs", "AutoTabs 极限"],
  ["AutoFocus", "focus", "AutoFocus 极限"],
  ["AutoSearch", "search", "AutoSearch 极限"],
];

/** Collect console errors and uncaught exceptions for the lifetime of a test. */
function watch(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

async function open(page: Page, label: string): Promise<void> {
  await page
    .locator(".app-nav")
    .getByRole("link", { name: label, exact: true })
    .click();
  await expect(page.locator("h1")).toHaveText(`${label} 极限`);
}

test("home lists every scenario and the nav reaches each page", async ({
  page,
}) => {
  const errors = watch(page);
  await page.goto("/");
  await expect(page.locator(".brand")).toHaveText("RAC Stress Demo");
  await expect(page.locator(".scenario-card")).toHaveCount(ROUTES.length);

  for (const [label, id, heading] of ROUTES) {
    await page
      .locator(".app-nav")
      .getByRole("link", { name: label, exact: true })
      .click();
    await expect(page.locator("h1")).toHaveText(heading);
    await expect(page).toHaveURL(new RegExp(`#/${id}$`));
  }
  expect(errors).toEqual([]);
});

test("AutoForm renders many fields and switches the field count", async ({
  page,
}) => {
  const errors = watch(page);
  await page.goto("/#/form");
  await expect(page.locator(".metric")).toContainText("当前 500 项");
  await page.getByLabel("字段数").selectOption("2000");
  await expect(page.locator(".metric")).toContainText("当前 2000 项");
  await expect(page.getByTestId("rac-field-f0")).toBeVisible();
  expect(errors).toEqual([]);
});

test("AutoForm cross-field validation blocks a partial submit", async ({
  page,
}) => {
  const errors = watch(page);
  await page.goto("/#/form");
  await page.getByRole("button", { name: "交叉校验" }).click();
  await page.getByTestId("rac-field-a").getByRole("textbox").fill("a");
  await page.getByTestId("rac-submit").click();
  await expect(
    page.getByTestId("rac-field-a").getByRole("alert"),
  ).toContainText("A 要求 B 已填写");
  await page.getByTestId("rac-field-b").getByRole("textbox").fill("b");
  await page.getByTestId("rac-submit").click();
  await expect(page.locator("pre.log")).toContainText("submit ok");
  expect(errors).toEqual([]);
});

test("AutoForm survives a rapid setValue burst and stops cleanly", async ({
  page,
}) => {
  const errors = watch(page);
  await page.goto("/#/form");
  await page.getByRole("button", { name: "超快连打 setValue" }).click();
  await expect(
    page.getByRole("button", { name: "停止连打" }),
  ).toBeVisible();
  await expect(page.locator("pre.log")).toContainText(
    /keys=\d+ f0=burst-/,
    { timeout: 15_000 },
  );
  // 500 fields re-render on every tick, so a full 200-tick run is slow;
  // stop it explicitly and confirm the toolbar returns to its idle label.
  await page.getByRole("button", { name: "停止连打" }).click();
  await expect(
    page.getByRole("button", { name: "超快连打 setValue" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("AutoForm duplicate names surface RAC-FIELD-DUPLICATE via the boundary", async ({
  page,
}) => {
  const errors = watch(page);
  await page.goto("/#/form");
  await page.getByRole("button", { name: "非法重复 name" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "RAC-FIELD-DUPLICATE" }),
  ).toBeVisible();
  expect(
    errors.filter((line) => !line.includes("RAC-FIELD-DUPLICATE")),
  ).toEqual([]);
});

test("AutoTable virtualizes 100k rows and switches edge modes", async ({
  page,
}) => {
  const errors = watch(page);
  await page.goto("/#/table");
  await expect(page.locator(".metric")).toContainText("rows 100,000");
  const table = page.getByTestId("rac-table-stress-table-large");
  await expect(table).toBeVisible();
  expect(
    await table.locator("[data-row-id]").count(),
  ).toBeLessThan(200);

  await page.getByRole("button", { name: "0 行" }).click();
  await expect(page.locator(".metric")).toContainText("rows 0");
  await expect(page.getByTestId("rac-table-stress-table-empty")).toBeVisible();

  await page.getByRole("button", { name: "超宽列" }).click();
  await expect(page.getByTestId("rac-table-stress-table-wide")).toBeVisible();

  await page.getByRole("button", { name: "动态列" }).click();
  await page.getByRole("button", { name: "+列" }).click();
  await expect(page.getByText("额外列 1")).toBeVisible();
  await expect(
    page.getByRole("columnheader").filter({ hasText: "Dyn 1" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "超长单元格" }).click();
  await expect(page.getByTestId("rac-table-stress-table-long")).toBeVisible();
  expect(errors).toEqual([]);
});

test("AutoChat virtualizes a huge conversation and rebuilds at a new size", async ({
  page,
}) => {
  const errors = watch(page);
  await page.goto("/#/chat");
  const metric = page.locator(".metric");
  await expect(metric).toContainText("DOM 消息节点 ≈");
  const mounted = Number((await metric.innerText()).match(/≈\s*(\d+)/)?.[1] ?? "0");
  expect(mounted).toBeGreaterThan(0);
  expect(mounted).toBeLessThan(200);

  await page.getByLabel("规模").selectOption("1000");
  await page.getByRole("button", { name: "重建会话" }).click();
  await expect(page.locator("pre.log")).toContainText("reloaded 1000 messages");

  await page.getByRole("button", { name: "灌入 +500" }).click();
  await expect(page.locator("pre.log")).toContainText("appended 500");

  await page.getByRole("button", { name: "滚到底" }).click();
  await expect(page.locator("pre.log")).toContainText("scrollToBottom()");
  expect(errors).toEqual([]);
});

test("AutoChat streams and interrupts without errors", async ({ page }) => {
  const errors = watch(page);
  await page.goto("/#/chat");
  await page.getByRole("button", { name: "开始流式" }).click();
  await expect(page.getByRole("button", { name: "中断流式" })).toBeVisible();
  await page.getByRole("button", { name: "中断流式" }).click();
  await expect(page.locator("pre.log")).toContainText("stream interrupted");
  expect(errors).toEqual([]);
});

test("AutoDialog stacks nested dialogs and submits a nested form", async ({
  page,
}) => {
  const errors = watch(page);
  await page.goto("/#/dialog");
  await page.getByRole("button", { name: "多层叠开" }).click();
  const layer1 = page.getByTestId("rac-dialog").filter({ hasText: "嵌套深度 1" });
  await expect(layer1).toBeVisible();
  await layer1.getByRole("button", { name: "再开一层" }).click();
  const layer2 = page.getByTestId("rac-dialog").filter({ hasText: "嵌套深度 2" });
  await expect(layer2).toBeVisible();
  await layer2.getByRole("button", { name: "打开表单对话框" }).click();
  const formDialog = page.getByTestId("rac-dialog").filter({ hasText: "表单层" });
  await expect(formDialog).toBeVisible();
  await formDialog
    .getByTestId("rac-field-name")
    .getByRole("textbox")
    .fill("nested");
  await formDialog.getByTestId("rac-ok").click();
  await expect(formDialog).toBeHidden();
  await expect(page.locator("pre.log")).toContainText(
    "nested form submit: nested",
  );
  expect(errors).toEqual([]);
});

test("AutoDialog beforeClose blocks cancel but allows submit", async ({
  page,
}) => {
  const errors = watch(page);
  await page.goto("/#/dialog");
  await page.getByRole("button", { name: "关闭拦截" }).click();
  const dialog = page.getByTestId("rac-dialog").filter({ hasText: "关闭拦截" });
  await expect(dialog).toBeVisible();
  await dialog.getByTestId("rac-cancel").click();
  await expect(dialog).toBeVisible();
  await dialog.getByTestId("rac-ok").click();
  await expect(dialog).toBeHidden();
  await expect(page.locator("pre.log")).toContainText("closed: submit");
  expect(errors).toEqual([]);
});

test("AutoDialog keeps a failed submit's draft", async ({ page }) => {
  const errors = watch(page);
  await page.goto("/#/dialog");
  await page.getByRole("button", { name: "提交失败保留" }).click();
  const dialog = page.getByTestId("rac-dialog").filter({ hasText: "提交失败" });
  await expect(dialog).toBeVisible();
  const name = dialog.getByTestId("rac-field-name").getByRole("textbox");
  await expect(name).toHaveValue("keep-me");
  await dialog.getByTestId("rac-ok").click();
  await expect(dialog).toBeVisible();
  await expect(name).toHaveValue("keep-me");
  expect(errors).toEqual([]);
});

test("AutoDialog declarative rapid toggle settles closed", async ({ page }) => {
  const errors = watch(page);
  await page.goto("/#/dialog");
  await page.getByRole("button", { name: "声明式快速开关" }).click();
  await expect(page.locator("pre.log")).toContainText(
    "rapid toggle finished (40 flips)",
    { timeout: 15_000 },
  );
  await expect(page.getByText("声明式对话框状态：closed")).toBeVisible();
  expect(errors).toEqual([]);
});

test("AutoMenu selects a deep leaf, fits a tiny box, and survives collapse spam", async ({
  page,
}) => {
  const errors = watch(page);
  await page.goto("/#/menu");
  // The selected id is a deep node but ancestors are not auto-expanded,
  // so walk down the tree before choosing a leaf.
  for (const id of [
    "Node n-0",
    "Node n-0-0",
    "Node n-0-0-0",
    "Node n-0-0-0-0",
  ]) {
    await page
      .locator(`button[data-auto-menu-item][aria-label="${id}"]`)
      .click();
  }
  const leaf = page.locator(
    'button[data-auto-menu-item][aria-label="Leaf n-0-0-0-0-1"]',
  );
  await expect(leaf).toBeVisible();
  await leaf.click();
  await expect(page.locator("pre.log")).toContainText(
    "onChange n-0-0-0-0-1",
  );

  await page.getByRole("button", { name: "极小容器" }).click();
  const box = page.locator(".tiny-box");
  await expect(box).toBeVisible();
  const overflow = await box.evaluate(
    (el) => el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth,
  );
  expect(overflow).toBe(true);

  await page.getByRole("button", { name: "快速折叠" }).click();
  await page.getByRole("button", { name: "连折 30 次" }).click();
  await expect(page.locator("pre.log")).toContainText(
    "collapsed toggled 30 times",
  );
  expect(errors).toEqual([]);
});

test("AutoTabs rapid switching keeps mounted drafts and nested pages", async ({
  page,
}) => {
  const errors = watch(page);
  await page.goto("/#/tabs");
  await expect(page.getByRole("tab", { name: "Nested A" }).first()).toBeVisible();

  const scratch = page.getByLabel("scratch-2", { exact: true });
  await page.getByRole("tab", { name: /Tab 02/ }).first().click();
  await scratch.fill("draft-2-edited");
  await page.getByRole("button", { name: "快速切换两轮" }).click();
  await expect(page.locator("pre.log")).toContainText(/rapid switched/);
  await page.getByRole("tab", { name: /Tab 02/ }).first().click();
  await expect(scratch).toHaveValue("draft-2-edited");
  expect(errors).toEqual([]);
});

test("AutoFocus lets the later instance win and follows visibility", async ({
  page,
}) => {
  const errors = watch(page);
  await page.goto("/#/focus");
  await expect(page.locator('[aria-label="focus-b"]')).toBeFocused();
  await page.getByLabel("显示 B").uncheck();
  await expect(page.locator('[aria-label="focus-a"]')).toBeFocused();
  await page.getByLabel("显示 A").uncheck();
  await page.getByLabel("显示 B").check();
  await expect(page.locator('[aria-label="focus-b"]')).toBeFocused();

  await page.getByLabel("极小/零尺寸盒").check();
  await expect(page.locator('[aria-label="focus-zero"]')).not.toBeFocused();

  await page.getByRole("button", { name: "狂切显隐" }).click();
  // The toggle ends with both instances visible again; focus events keep
  // writing the log, so the checkboxes are the reliable completion signal.
  await expect(page.getByLabel("显示 A")).toBeChecked();
  await expect(page.getByLabel("显示 B")).toBeChecked();
  expect(errors).toEqual([]);
});

test("AutoSearch survives controlled bursts, keeps a failed draft, and wraps narrow", async ({
  page,
}) => {
  const errors = watch(page);
  await page.goto("/#/search");
  await page.getByRole("button", { name: "连打受控 value" }).click();
  await expect(page.getByText("burst finished 60 updates")).toBeVisible();

  await page.getByRole("button", { name: "下次搜索失败" }).click();
  const q0 = page.getByTestId("rac-field-q0").getByRole("textbox");
  await q0.fill("keep-draft");
  await expect(
    page.getByRole("alert").filter({ hasText: "模拟搜索失败" }),
  ).toBeVisible();
  await expect(q0).toHaveValue("keep-draft");

  await page.getByLabel("极窄宽度 (220px)").check();
  await expect(page.locator(".panel")).toHaveCSS("width", "220px");
  expect(errors).toEqual([]);
});
