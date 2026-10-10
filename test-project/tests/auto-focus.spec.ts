import { test, expect, type Page } from "@playwright/test";

async function mount(
  page: Page,
  scenario: "visibility" | "nested" | "eligibility" | "external",
) {
  await page.goto("/");
  await page.evaluate(async (scenario) => {
    const path = "/tests/fixtures/auto-focus.tsx";
    const fixture = await import(/* @vite-ignore */ path);
    fixture.mount(scenario);
  }, scenario);
}

test("last visible entry wins across CSS, responsive, disabled, async and unmount changes", async ({
  page,
}) => {
  await mount(page, "visibility");
  const earlier = page.getByLabel("Earlier", { exact: true });
  const later = page.getByLabel("Later", { exact: true });
  await expect(later).toBeFocused();
  await page.getByRole("button", { name: "Toggle visibility" }).click();
  await expect(earlier).toBeFocused();
  await page.getByRole("button", { name: "Toggle visibility" }).click();
  await expect(later).toBeFocused();
  await page.setViewportSize({ width: 500, height: 700 });
  await expect(earlier).toBeFocused();
  await page.setViewportSize({ width: 1000, height: 700 });
  await expect(later).toBeFocused();
  await page.getByRole("button", { name: "Toggle disabled" }).click();
  await expect(earlier).toBeFocused();
  await page.getByRole("button", { name: "Toggle disabled" }).click();
  await expect(later).toBeFocused();
  await page.getByRole("button", { name: "Toggle target" }).click();
  await expect(earlier).toBeFocused();
  await page.getByRole("button", { name: "Toggle target" }).click();
  await expect(later).toBeFocused();
  await page.getByRole("button", { name: "Toggle mount" }).click();
  await expect(earlier).toBeFocused();
});

test("typing and unrelated DOM updates do not reclaim manually moved focus", async ({
  page,
}) => {
  await mount(page, "visibility");
  await expect(page.getByLabel("Later", { exact: true })).toBeFocused();
  const manual = page.getByLabel("Manual");
  await manual.fill("A manually selected editor");
  await page.evaluate(() => document.body.setAttribute("data-updated", "yes"));
  // Cross the scheduler's frame boundary before checking for unwanted focus.
  await page.evaluate(
    () =>
      new Promise<void>((done) =>
        requestAnimationFrame(() => requestAnimationFrame(() => done())),
      ),
  );
  await expect(manual).toBeFocused();
});

test("nested cached tabs focus their entry on mouse, keyboard and programmatic switches", async ({
  page,
}) => {
  await mount(page, "nested");
  const entry = page.getByLabel("Entry", { exact: true });
  await expect(entry).toBeFocused();
  await entry.fill("Cached draft");
  await page.getByLabel("Other", { exact: true }).fill("Not the entry");
  await page.getByRole("tab", { name: "Outer B", exact: true }).click();
  await expect(page.getByLabel("B entry")).toBeFocused();
  const outerB = page.getByRole("tab", { name: "Outer B", exact: true });
  await outerB.focus();
  await outerB.press("ArrowLeft");
  const outerA = page.getByRole("tab", { name: "Outer A", exact: true });
  await expect(outerA).toBeFocused();
  await expect(outerB).toHaveAttribute("aria-selected", "true");
  await outerA.press("Enter");
  await expect(entry).toBeFocused();
  await expect(entry).toHaveValue("Cached draft");
  await page.getByRole("tab", { name: "Inner next", exact: true }).click();
  await expect(page.getByLabel("Inner next entry")).toBeFocused();
  await page.getByRole("button", { name: "Go B", exact: true }).click();
  await expect(page.getByLabel("B entry")).toBeFocused();
  await page.getByRole("button", { name: "Go A", exact: true }).click();
  // Returning follows the inner group's current selection; it never remembers an editor.
  await expect(page.getByLabel("Inner next entry")).toBeFocused();
});

test("eligibility skips non-focusable matches and keeps offscreen and native media targets", async ({
  page,
}) => {
  await mount(page, "eligibility");
  await expect(page.getByLabel("Usable entry")).toBeFocused();
  await page.getByRole("button", { name: "Enable media entry" }).click();
  await expect(page.getByTestId("media-entry")).toBeFocused();
  await page.getByRole("button", { name: "Enable offscreen entry" }).click();
  await expect(page.getByLabel("Offscreen entry")).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test("independently removing an external ref target activates the remaining entry", async ({
  page,
}) => {
  await mount(page, "external");
  await expect(page.getByRole("link", { name: "External link" })).toBeFocused();
  await page.getByRole("button", { name: "Remove external target" }).click();
  await expect(page.getByLabel("Fallback entry")).toBeFocused();
});
