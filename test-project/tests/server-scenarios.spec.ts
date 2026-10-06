import { openComponent } from "./helpers/navigation";
import { test, expect } from "@playwright/test";

const components = [
  "AutoTable",
  "AutoForm",
  "AutoSearch",
  "AutoDialog",
  "AutoTabs",
  "AutoMenu",
  "AutoChat",
];

for (const component of components) {
  test(`${component}: server scenarios load, change permissions, empty and recover`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await openComponent(page, component);
    await page
      .getByRole("tab", {
        name: "Server-driven Mock",
        exact: true,
      })
      .click();
    const demo = page.getByTestId("server-driven-demo");
    await expect(demo.getByRole("status").first()).toBeVisible();
    const response = demo.locator(".mock-response");
    await expect(response).toBeVisible();
    const normal = await response.locator("pre").textContent();
    expect(() => JSON.parse(normal!)).not.toThrow();

    await demo.getByLabel("Server response").selectOption("restricted");
    await expect(response).toBeVisible();
    await expect
      .poll(() => response.locator("pre").textContent())
      .not.toBe(normal);
    await demo.getByLabel("Server response").selectOption("empty");
    await expect(response).toBeVisible();
    await expect
      .poll(() => response.locator("pre").textContent())
      .not.toBe(normal);

    await demo.getByLabel("Server response").selectOption("error");
    await expect(demo.getByRole("alert")).toContainText(
      "The mock server could not complete this request.",
    );
    await expect(response).toHaveCount(0);
    await demo.getByRole("button", { name: "Retry" }).click();
    await expect(demo.getByLabel("Server response")).toHaveValue("normal");
    await expect(response).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("server scenario changes cancel stale responses and fit mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await openComponent(page, "AutoMenu");
  await page
    .getByRole("tab", { name: "Server-driven Mock", exact: true })
    .click();
  const demo = page.getByTestId("server-driven-demo");
  const scenario = demo.getByLabel("Server response");
  await scenario.selectOption("error");
  await scenario.selectOption("restricted");
  await expect(demo.locator(".mock-response")).toBeVisible();
  await expect(demo.getByRole("alert")).toHaveCount(0);
  await expect(scenario).toHaveValue("restricted");
  const width = await page.evaluate(() => ({
    actual: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));
  expect(width.actual).toBeLessThanOrEqual(width.viewport);
});
