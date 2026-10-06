import { test, expect } from "@playwright/test";

async function connected(
  request: import("@playwright/test").APIRequestContext,
) {
  const response = await request.get("/__rac/health");
  return ((await response.json()) as { connected: boolean }).connected;
}

// Parallel workers each own a tab. Relay commands must stay pinned to this
// test's tab instead of racing to whichever tab loaded most recently.
async function pageClientId(page: import("@playwright/test").Page) {
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (globalThis as { __racClientId?: string }).__racClientId ?? "",
        ),
      { timeout: 15000 },
    )
    .toBeTruthy();
  return page.evaluate(
    () => (globalThis as { __racClientId?: string }).__racClientId as string,
  );
}

test("devtools bridge reports health and live state", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect.poll(() => connected(request), { timeout: 30000 }).toBe(true);
  const clientId = await pageClientId(page);
  await expect(async () => {
    const state = (await (
      await request.get(
        `/__rac/state?clientId=${encodeURIComponent(clientId)}`,
      )
    ).json()) as {
      path: string[];
      pathString: string;
    };
    expect(state.path?.[0]).toBe("table");
    expect(state.pathString).toBe("table:local");
  }).toPass({ timeout: 30000 });
});

test("devtools goto drives the visible page", async ({ page, request }) => {
  test.setTimeout(90000);
  await page.goto("/");
  await expect.poll(() => connected(request), { timeout: 30000 }).toBe(true);
  const clientId = await pageClientId(page);
  // The command is pinned to this tab's clientId. A freshly reloading tab may
  // not have registered its bridge yet, so retry (goto is idempotent) and
  // surface the relay error text on failure.
  const gotoOnce = async () => {
    const response = await request.post("/__rac/goto", {
      data: { target: "search:remote", clientId },
    });
    const result = (await response.json()) as {
      status?: string;
      path?: string[];
      error?: string;
    };
    expect(response.ok(), result.error ?? "relay rejected").toBeTruthy();
    expect(result.status).toBe("success");
    expect(result.path).toEqual(["search", "remote"]);
  };
  const gotoAndVerify = async () => {
    await gotoOnce();
    await expect(page).toHaveURL(/#\/search:remote/);
    await expect(page.getByTestId("search-example-remote")).toBeVisible();
  };
  await expect(gotoAndVerify).toPass({ timeout: 30000 });
});

test("devtools cmd eval/dom inspect the live page and console relays", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect.poll(() => connected(request), { timeout: 30000 }).toBe(true);
  const clientId = await pageClientId(page);
  const command = async (cmd: string, payload: Record<string, unknown>) => {
    const response = await request.post("/__rac/cmd", {
      data: { cmd, payload: { ...payload, clientId } },
    });
    const body = (await response.json()) as Record<string, unknown>;
    expect(response.ok(), String(body.error ?? "relay rejected")).toBeTruthy();
    return body;
  };
  await expect(async () => {
    const evaluated = (await command("eval", {
      code: "location.hash",
    })) as { value?: string };
    expect(evaluated.value).toBe("#/table:local");
  }).toPass({ timeout: 30000 });
  await expect(async () => {
    const reEvaluated = (await command("eval", {
      code: "location.hash",
    })) as { value: string };
    expect(reEvaluated.value).toBe("#/table:local");
  }).toPass({ timeout: 30000 });
  await expect(async () => {
    const dom = (await command("dom", {
      testid: "rac-table-projects-local",
    })) as { found: boolean; text: string };
    expect(dom.found).toBe(true);
    expect(dom.text).toContain("All Projects");
  }).toPass({ timeout: 30000 });
  await command("eval", { code: "console.warn('RAC-BRIDGE-SPEC')" });
  await expect(async () => {
    const consoleEvents = (await (
      await request.get("/__rac/console?limit=10")
    ).json()) as unknown[];
    expect(JSON.stringify(consoleEvents)).toContain("RAC-BRIDGE-SPEC");
  }).toPass({ timeout: 30000 });
});
