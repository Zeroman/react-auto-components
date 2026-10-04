import { test, expect } from "@playwright/test";

for (const mode of ["local", "remote"] as const) {
  test(`${mode} sorting hides single-column tags and applies multi-column priority`, async ({
    page,
  }) => {
    // Keep the entire ten-row page mounted while checking its order.
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");
    if (mode === "remote") {
      await page.getByRole("tab", { name: "Mock server", exact: true }).click();
      await page.getByTestId("table-server-query").click();
    }
    const table = page.getByTestId(`rac-table-projects-${mode}`);
    const visibleIds = () =>
      table
        .locator("tbody tr[data-row-id]")
        .evaluateAll((rows) =>
          rows.map((row) => row.getAttribute("data-row-id")),
        );
    const tags = table.locator(".auto-sort-tags");
    await table
      .getByRole("button", { name: "Sort Owner", exact: true })
      .click();
    await expect(tags).toHaveCount(0);
    const owner = table.getByRole("columnheader").filter({ hasText: "Owner" });
    await expect(owner).toHaveAttribute("aria-sort", "ascending");
    await expect(owner.locator(".auto-sort-indicator")).toBeVisible();

    const budget = table.getByRole("button", {
      name: "Sort Budget",
      exact: true,
    });
    await budget.click({ modifiers: ["Shift"] });
    await budget.click({ modifiers: ["Shift"] });
    await expect(tags.getByRole("button")).toHaveText([
      "Owner ↑ ×",
      "Budget ↓ ×",
    ]);
    await expect(
      table.locator("tbody tr[data-row-id]").first(),
    ).toHaveAttribute("data-row-id", "45");
    await expect(table.locator("tbody tr[data-row-id]").nth(1)).toHaveAttribute(
      "data-row-id",
      "41",
    );
    await expect
      .poll(visibleIds)
      .toEqual(["45", "41", "37", "33", "29", "25", "21", "17", "13", "9"]);
    const titleBox = await table.locator(".auto-toolbar strong").boundingBox();
    const tagsBox = await tags.boundingBox();
    expect(titleBox).not.toBeNull();
    expect(tagsBox).not.toBeNull();
    expect(
      Math.abs(
        titleBox!.y + titleBox!.height / 2 - tagsBox!.y - tagsBox!.height / 2,
      ),
    ).toBeLessThan(3);

    await table.getByRole("button", { name: "Next page" }).click();
    await expect(
      table.locator("tbody tr[data-row-id]").first(),
    ).toHaveAttribute("data-row-id", "5");
    await expect
      .poll(visibleIds)
      .toEqual(["5", "1", "48", "44", "40", "36", "32", "28", "24", "20"]);
    await tags.getByRole("button", { name: "Budget ↓ ×" }).click();
    await expect(tags).toHaveCount(0);
    await expect(owner).toHaveAttribute("aria-sort", "ascending");
    await expect(
      table.getByRole("columnheader").filter({ hasText: "Budget" }),
    ).toHaveAttribute("aria-sort", "none");
    await expect(
      table.locator("tbody tr[data-row-id]").first(),
    ).toHaveAttribute("data-row-id", "1");

    // Reverse the primary direction, then add an ascending secondary field.
    await table
      .getByRole("button", { name: "Sort Owner", exact: true })
      .click();
    await budget.click({ modifiers: ["Shift"] });
    await expect(tags.getByRole("button")).toHaveText([
      "Owner ↓ ×",
      "Budget ↑ ×",
    ]);
    await expect
      .poll(visibleIds)
      .toEqual(["3", "7", "11", "15", "19", "23", "27", "31", "35", "39"]);

    // A normal header click replaces the multi-sort with a single sort.
    await budget.click();
    await expect(tags).toHaveCount(0);
    await expect(owner).toHaveAttribute("aria-sort", "none");
    await expect
      .poll(visibleIds)
      .toEqual(["48", "47", "46", "45", "44", "43", "42", "41", "40", "39"]);
    await budget.click();
    await expect
      .poll(visibleIds)
      .toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
  });
}
