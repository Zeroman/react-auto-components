import { test, expect } from "@playwright/test";

async function connected(
  request: import("@playwright/test").APIRequestContext,
) {
  const response = await request.get("/__rac/health");
  return ((await response.json()) as { connected: boolean }).connected;
}

test("devtools bridge reports health and live state", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect.poll(() => connected(request)).toBe(true);
  const state = (await (await request.get("/__rac/state")).json()) as {
    path: string[];
    pathString: string;
  };
  expect(state.path[0]).toBe("table");
  expect(state.pathString).toBe("table:local");
});

test("devtools goto drives the visible page", async ({ page, request }) => {
  await page.goto("/");
  await expect.poll(() => connected(request)).toBe(true);
  const result = (await (
    await request.post("/__rac/goto", { data: { target: "search:remote" } })
  ).json()) as { status: string; path: string[] };
  expect(result.status).toBe("success");
  expect(result.path).toEqual(["search", "remote"]);
  await expect(page).toHaveURL(/#\/search:remote/);
  await expect(page.getByTestId("search-example-remote")).toBeVisible();
});

test("devtools cmd eval/dom inspect the live page and console relays", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect.poll(() => connected(request)).toBe(true);
  const command = (cmd: string, payload: Record<string, unknown>) =>
    request
      .post("/__rac/cmd", { data: { cmd, payload } })
      .then((response) => response.json());
  const evaluated = (await command("eval", { code: "location.hash" })) as {
    value: string;
  };
  expect(evaluated.value).toBe("#/table:local");
  const dom = (await command("dom", {
    testid: "rac-table-projects-local",
  })) as {
    found: boolean;
    text: string;
  };
  expect(dom.found).toBe(true);
  expect(dom.text).toContain("All Projects");
  await command("eval", { code: "console.warn('RAC-BRIDGE-SPEC')" });
  const consoleEvents = (await (
    await request.get("/__rac/console?limit=10")
  ).json()) as unknown[];
  expect(JSON.stringify(consoleEvents)).toContain("RAC-BRIDGE-SPEC");
});
