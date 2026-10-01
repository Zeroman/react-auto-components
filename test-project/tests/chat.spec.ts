import { test, expect } from "@playwright/test";

test.use({ locale: "en-US" });
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "AutoChat", exact: true })
    .click();
});

test("chat sends, streams, stops and retains failed drafts", async ({
  page,
}) => {
  const input = page.getByRole("textbox", { name: "Message", exact: true });
  await input.fill("A local message");
  await input.press("Enter");
  await expect(input).toHaveValue("");
  await expect(
    page.locator('.auto-chat-message[data-role="user"]').last(),
  ).toContainText("A local message");
  await expect(
    page.getByRole("button", { name: "Stop", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(
    page.locator('.auto-chat-message[aria-busy="true"]'),
  ).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Fail next send" }).check();
  await input.fill("Keep this draft");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("could not be sent");
  await expect(input).toHaveValue("Keep this draft");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(input).toHaveValue("");
  await page.getByRole("button", { name: "Stop", exact: true }).click();
});

test("history prepends preserve the visible message and streams respect paused reading", async ({
  page,
}) => {
  const log = page.getByRole("log");
  // Establish overflowing history first. A short log cannot preserve an anchor
  // beyond its maximum scroll offset when earlier rows are inserted.
  await page.getByRole("button", { name: "Load earlier messages" }).click();
  await expect(page.locator(".auto-chat-message")).toHaveCount(19);
  const original = page.locator('[data-chat-id="history-1-0"]');
  await log.evaluate((el) => {
    el.scrollTop = 0;
  });
  const before = (await original.boundingBox())!.y;
  await page.getByRole("button", { name: "Load earlier messages" }).click();
  await expect(page.locator(".auto-chat-message")).toHaveCount(34);
  await expect
    .poll(async () => Math.abs((await original.boundingBox())!.y - before))
    .toBeLessThan(3);
  await log.evaluate((el) => {
    el.scrollTop = 150;
  });
  await expect(
    page.getByRole("button", { name: "Back to latest" }),
  ).toBeVisible();
  const top = await log.evaluate((el) => el.scrollTop);
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("A new question while reading history");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    page.locator('.auto-chat-message[data-role="assistant"]').last(),
  ).toContainText("simulated response");
  expect(
    Math.abs((await log.evaluate((el) => el.scrollTop)) - top),
  ).toBeLessThan(3);
  await page.getByRole("button", { name: "Back to latest" }).click();
  await expect
    .poll(() =>
      log.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight),
    )
    .toBeLessThan(3);
  await page.getByRole("button", { name: "Stop", exact: true }).click();
});

test("mobile chat keeps composer in view and supports source viewing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(
    page.getByRole("textbox", { name: "Message", exact: true }),
  ).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "Send", exact: true }),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= innerWidth &&
        document.documentElement.scrollHeight <= innerHeight,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "View code" }).click();
  await expect(page.getByRole("dialog").locator("pre")).toContainText(
    "export function ChatDemo",
  );
});

test("changing language translates chat controls without losing a draft", async ({
  page,
}) => {
  const input = page.getByRole("textbox", { name: "Message", exact: true });
  await input.fill("Keep my draft");
  await page
    .locator(".topbar")
    .getByTestId("language-picker")
    .selectOption("zh-CN");
  await expect(
    page.getByRole("button", { name: "发送", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".auto-chat textarea")).toHaveValue(
    "Keep my draft",
  );
  await expect(page.locator("h1")).toHaveText("聊天");
});
