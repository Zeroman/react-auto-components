import { openComponent } from "./helpers/navigation";
import { test, expect } from "@playwright/test";

test.use({ locale: "en-US" });
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await openComponent(page, "AutoChat");
});

test("menu follows AutoMenu and the demo renders all six formats", async ({
  page,
}) => {
  const names = await page
    .locator("aside > .auto-menu > .auto-menu-list > li > button")
    .allTextContents();
  expect(names.findIndex((name) => name.includes("AutoChat"))).toBe(
    names.findIndex((name) => name.includes("AutoMenu")) + 1,
  );
  for (const format of [
    "markdown",
    "code",
    "json",
    "table",
    "image",
    "component",
  ]) {
    await page
      .getByRole("combobox", { name: "Message examples", exact: true })
      .selectOption(format);
    await page
      .getByRole("button", { name: "Insert example", exact: true })
      .click();
  }
  const log = page.getByRole("log");
  await expect(log.locator("h2")).toHaveText("A richer conversation");
  await expect(log.locator(".chat-render-markdown table")).toHaveCount(1);
  await expect(
    log.locator(".chat-render-markdown input[type=checkbox]"),
  ).toHaveCount(3);
  await expect(log.locator(".chat-render-code code")).toContainText(
    "type Message",
  );
  await expect(log.locator(".chat-render-json code")).toContainText(
    '"ok": true',
  );
  await expect(log.locator(".chat-render-table tbody tr")).toHaveCount(3);
  const image = log.getByRole("img", {
    name: "Three connected stages in a workflow",
  });
  await image.scrollIntoViewIfNeeded();
  await expect
    .poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0);
  const card = page.getByTestId("chat-task-card");
  await card.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(card.getByRole("status")).toHaveText("Approved");
  await expect(
    card.getByRole("button", { name: "Decline", exact: true }),
  ).toBeDisabled();
  await page.locator(".auto-chat textarea").fill("Draft preserves card state");
  await expect(card.getByRole("status")).toHaveText("Approved");
});

test("markdown escapes raw HTML and rejects javascript links", async ({
  page,
}) => {
  await page
    .locator(".auto-chat textarea")
    .fill(
      '[unsafe](javascript:alert(1))\n\n<img src=x onerror="window.__chatExecuted=true">\n\n**Safe text**',
    );
  await page.getByRole("button", { name: "Send", exact: true }).click();
  const user = page.locator('.auto-chat-message[data-role="user"]').last();
  await expect(user.locator("strong").last()).toHaveText("Safe text");
  await expect(user.locator("img")).toHaveCount(0);
  expect(await user.locator("a").getAttribute("href")).not.toMatch(
    /^javascript:/i,
  );
  expect(
    await page.evaluate(
      () => (window as Window & { __chatExecuted?: boolean }).__chatExecuted,
    ),
  ).toBeUndefined();
  await page.getByRole("button", { name: "Stop", exact: true }).click();
});

test("10000 and 50000 variable-height messages keep DOM bounded and support jumps", async ({
  page,
}) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // WebKit's smooth-scroll settles later; the paused-viewport contract is the
  // same but its pixel tolerance needs the wider bound.
  const viewportTolerance = test.info().project.name === "webkit" ? 48 : 4;
  await page.getByRole("tab", { name: "Large history", exact: true }).click();
  for (const count of [10000, 50000]) {
    if (count !== 10000) {
      await page
        .getByRole("combobox", { name: "Message count", exact: true })
        .selectOption(String(count));
      await page
        .getByRole("button", { name: "Load data", exact: true })
        .click();
    }
    await expect(page.getByTestId("chat-message-count")).toHaveText(
      String(count),
    );
    await expect
      .poll(() => page.locator("[data-chat-id]").count())
      .toBeGreaterThan(0);
    expect(await page.locator("[data-chat-id]").count()).toBeLessThan(100);
    await page
      .getByRole("button", { name: "Jump to first", exact: true })
      .click();
    await expect(page.locator('[data-chat-id="history-0"]')).toBeInViewport();
    await page
      .getByRole("button", { name: "Jump to latest", exact: true })
      .click();
    await expect(
      page.locator(`[data-chat-id="history-${count - 1}"]`),
    ).toBeInViewport();
    await expect
      .poll(() =>
        page
          .getByRole("log")
          .evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight),
      )
      .toBeLessThan(4);
    expect(await page.locator("[data-chat-id]").count()).toBeLessThan(100);
  }
  expect(errors).toEqual([]);
});

test("large history preserves a paused viewport on append and supports streamed height changes", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.getByRole("tab", { name: "Large history", exact: true }).click();
  const log = page.getByRole("log");
  await page
    .getByRole("button", { name: "Jump to first", exact: true })
    .click();
  const first = page.locator('[data-chat-id="history-0"]');
  await expect(first).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "Back to latest" }),
  ).toBeVisible();
  const before = (await first.boundingBox())!.y;
  await page
    .getByRole("button", { name: "Load earlier messages", exact: true })
    .click();
  await expect(page.getByTestId("chat-message-count")).toHaveText("10100");
  await expect
    .poll(async () => Math.abs((await first.boundingBox())!.y - before), {
      timeout: 15000,
    })
    .toBeLessThan(viewportTolerance);

  await page
    .getByRole("button", { name: "Append 100 messages", exact: true })
    .click();
  await expect(page.getByTestId("chat-message-count")).toHaveText("10200");
  await expect
    .poll(async () => Math.abs((await first.boundingBox())!.y - before), {
      timeout: 15000,
    })
    .toBeLessThan(viewportTolerance);
  await page
    .getByRole("button", { name: "Jump to latest", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Stream a reply", exact: true })
    .click();
  await expect(page.locator('[data-chat-id="stream-1"]')).toContainText(
    "simulated response",
  );
  await expect
    .poll(() =>
      log.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight),
    )
    .toBeLessThan(viewportTolerance);
  await page
    .getByRole("button", { name: "Jump to first", exact: true })
    .click();
  const oldest = page.locator('[data-chat-id="history--100"]');
  await expect(oldest).toBeInViewport();
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(oldest).toBeInViewport();
  expect(errors).toEqual([]);
});

test("mobile format controls and large-data toolbar stay inside the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(
    page.getByRole("combobox", { name: "Message examples", exact: true }),
  ).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "Send", exact: true }),
  ).toBeInViewport();
  await page
    .getByRole("combobox", { name: "Message examples", exact: true })
    .selectOption("component");
  await page
    .getByRole("button", { name: "Insert example", exact: true })
    .click();
  await expect(page.getByTestId("chat-task-card")).toBeVisible();
  await page.getByRole("tab", { name: "Large history", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Jump to latest", exact: true }),
  ).toBeInViewport();
  expect(
    await page.getByRole("log").evaluate((el) => el.clientHeight),
  ).toBeGreaterThan(120);
  expect(
    await page.locator(".chat-performance-toolbar").evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return (
        rect.right <= innerWidth &&
        rect.left >= 0 &&
        el.scrollWidth <= el.clientWidth + 1
      );
    }),
  ).toBe(true);

  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= innerWidth &&
        document.documentElement.scrollHeight <= innerHeight,
    ),
  ).toBe(true);
});
