import { openComponent } from "./helpers/navigation";
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await openComponent(page, "AutoSearch");
});

test("server-side search sends RSQL over HTTP and echoes it back untouched", async ({
  page,
}) => {
  await page.getByRole("tab", { name: "RSQL query" }).click();
  await expect(
    page.getByRole("heading", { name: "Real-time matches (24 items)" }),
  ).toBeVisible();
  const name = page.getByRole("textbox", { name: "Project Name" });
  const responsePromise = page.waitForResponse(
    (candidate) =>
      candidate.url().includes("/api/projects") &&
      candidate.request().method() === "POST",
  );
  await name.fill("Brand");
  const response = await responsePromise;
  const body = response.request().postDataJSON() as {
    filter: Record<string, unknown>;
    pageIndex: number;
    pageSize: number;
    rsql: string;
  };
  expect(body.rsql).toBe('name=like="Brand"');
  expect(body.filter).toMatchObject({
    kind: "group",
    operator: "and",
    children: [
      {
        kind: "condition",
        field: "name",
        operator: "contains",
        value: "Brand",
      },
    ],
  });
  const data = (await response.json()) as {
    total: number;
    echo: { rsql: string };
  };
  expect(data.total).toBe(3);
  expect(data.echo.rsql).toBe('name=like="Brand"');
  await expect(
    page.getByRole("heading", { name: "Real-time matches (3 items)" }),
  ).toBeVisible();
  await expect(page.locator(".search-hit strong")).toHaveText([
    "Brand Website Upgrade",
    "Brand Website Upgrade 10",
    "Brand Website Upgrade 18",
  ]);
});

test("mock API rejects a query tree that fails validation with 400", async ({
  request,
}) => {
  const response = await request.post("/api/projects", {
    data: {
      filter: { kind: "condition", field: "name", operator: "hack", value: 1 },
    },
  });
  expect(response.status()).toBe(400);
  expect(await response.json()).toMatchObject({ error: /valid query tree/ });
});
