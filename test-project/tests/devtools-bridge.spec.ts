import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

/**
 * Agent bridge E2E against the current protocol:
 * discovery JSON in .rac/servers carries the bearer token (never printed),
 * CLI-style calls use the Authorization header, the page client registers the
 * page under window.__racPageId, and every command names its target page.
 */

interface Discovery {
  protocolVersion: number;
  serverId: string;
  url: string;
  token: string;
  pid: number;
  root: string;
}
interface PageRecord {
  pageId: string;
  connectionId: string;
  title: string;
  url: string;
  status: "ready" | "offline";
}
type Json = Record<string, unknown>;

let cached: Discovery | undefined;

/**
 * Picks the live 4174 server. Killed dev servers leave their discovery file
 * behind (no close hook runs on SIGKILL), so candidates are health-checked
 * exactly like the CLI does. Tokens are never logged.
 */
async function discovery(): Promise<Discovery> {
  if (cached) return cached;
  const dir = join(fileURLToPath(import.meta.url), "..", "..", ".rac", "servers");
  const candidates = readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) =>
      JSON.parse(readFileSync(join(dir, name), "utf8")) as Discovery,
    )
    .filter((entry) => entry.url.includes(":4174"));
  expect(
    candidates.length,
    "at least one discovery file for the 4174 dev server",
  ).toBeGreaterThan(0);
  for (const entry of candidates) {
    try {
      const response = await fetch(`${entry.url}/__rac/health`, {
        headers: { Authorization: `Bearer ${entry.token}` },
        signal: AbortSignal.timeout(2000),
      });
      const health = (await response.json()) as {
        serverId?: string;
        protocolVersion?: number;
      };
      if (
        response.ok &&
        health.serverId === entry.serverId &&
        health.protocolVersion === 1
      ) {
        cached = entry;
        return entry;
      }
    } catch {
      /* stale file from a dead server */
    }
  }
  throw new Error("No live dev server behind the 4174 discovery files.");
}

const auth = async () => ({
  Authorization: `Bearer ${(await discovery()).token}`,
});

async function call(
  request: APIRequestContext,
  method: "GET" | "POST",
  path: string,
  body?: Json,
  headers: Record<string, string> = {},
): Promise<{ status: number; json: Json }> {
  const response = await request.fetch(path, {
    method,
    headers: { ...(await auth()), ...headers },
    ...(body === undefined
      ? {}
      : { data: JSON.stringify(body), "content-type": "application/json" }),
  });
  let json: Json = {};
  try {
    json = (await response.json()) as Json;
  } catch {
    /* binary or empty body */
  }
  return { status: response.status(), json };
}

async function command(
  request: APIRequestContext,
  pageId: string,
  cmd: string,
  payload: Json = {},
): Promise<{ status: number; json: Json }> {
  return call(request, "POST", "/__rac/command", { pageId, cmd, payload });
}

/** Waits for the page client to register this tab with the bridge. */
async function bridgePageId(page: Page): Promise<string> {
  await expect
    .poll(
      () =>
        page.evaluate(
          () => (globalThis as { __racPageId?: string }).__racPageId ?? "",
        ),
      { timeout: 20000 },
    )
    .toBeTruthy();
  return page.evaluate(
    () => (globalThis as { __racPageId?: string }).__racPageId as string,
  );
}

async function newConnectedPage(contextPage: Page): Promise<Page> {
  const extra = await contextPage.context().newPage();
  await extra.goto("/");
  await bridgePageId(extra);
  return extra;
}

async function pages(request: APIRequestContext): Promise<PageRecord[]> {
  const { json } = await call(request, "GET", "/__rac/pages");
  return json.pages as PageRecord[];
}

async function disconnect(
  request: APIRequestContext,
  record: PageRecord,
): Promise<void> {
  await call(request, "POST", "/__rac/disconnect", {
    pageId: record.pageId,
    connectionId: record.connectionId,
  });
}

test("bridge health, auth and origin enforcement", async ({ request }) => {
  const health = await call(request, "GET", "/__rac/health");
  expect(health.status).toBe(200);
  expect(health.json.protocolVersion).toBe(1);
  expect(health.json.status).toBe("ready");
  expect(Array.isArray(health.json.capabilities)).toBe(true);
  expect(health.json.capabilities as string[]).not.toContain("eval");

  const anonymous = await request.get("/__rac/health");
  expect(anonymous.status()).toBe(403);
  expect(((await anonymous.json()) as Json).code).toBe("RAC-DEVTOOLS-AUTH");

  const foreign = await request.fetch("/__rac/health", {
    headers: { Authorization: "Bearer not-the-real-token" },
  });
  expect(foreign.status()).toBe(403);

  const crossOrigin = await call(
    request,
    "GET",
    "/__rac/health",
    undefined,
    { Origin: "http://evil.example" },
  );
  expect(crossOrigin.status).toBe(403);
  expect(crossOrigin.json.code).toBe("RAC-DEVTOOLS-AUTH");
});

test("inspect of one page exposes elements, components and navigation", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const pageId = await bridgePageId(page);

  const { status, json } = await call(
    request,
    "GET",
    `/__rac/inspect?pageId=${encodeURIComponent(pageId)}`,
  );
  expect(status).toBe(200);
  expect(json.status).toBe("success");
  expect(json.pageId).toBe(pageId);
  const elements = json.elements as Json[];
  expect(elements.length).toBeGreaterThan(0);
  expect(elements[0]).toMatchObject({
    ref: expect.any(String),
    role: expect.any(String),
    actions: expect.any(Array),
  });
  expect(Array.isArray(json.components)).toBe(true);
  expect(json.navigation).toMatchObject({ available: true });
  expect(json.title).toEqual(expect.any(String));
  expect(String(json.url)).toContain("127.0.0.1:4174");
});

test("several pages require explicit selection; goto changes only the target", async ({
  page,
  request,
}) => {
  test.setTimeout(90000);
  await page.goto("/");
  const first = await bridgePageId(page);
  const secondTab = await newConnectedPage(page);
  try {
    const second = await bridgePageId(secondTab);
    expect(second).not.toBe(first);

    // No auto-selection with two ready pages.
    const ambiguous = await call(request, "GET", "/__rac/inspect");
    expect(ambiguous.status).toBe(200);
    expect(ambiguous.json.status).toBe("selection_required");
    expect((ambiguous.json.pages as PageRecord[]).map((p) => p.pageId)).toEqual(
      expect.arrayContaining([first, second]),
    );

    const before = secondTab.url();
    const { status, json } = await command(request, first, "goto", {
      target: "search:remote",
    });
    expect(status, String(JSON.stringify(json))).toBe(200);
    expect(json.status).toBe("success");
    await expect(page).toHaveURL(/search:remote/);
    // Only the targeted tab moves — the survivor keeps its route.
    await expect(secondTab).toHaveURL(before);
    await expect(secondTab).not.toHaveURL(/search:remote/);
  } finally {
    await secondTab.close();
  }
});

test("fill through a current ref drives a controlled React input", async ({
  page,
  request,
}) => {
  test.setTimeout(90000);
  await page.goto("/");
  const pageId = await bridgePageId(page);
  await command(request, pageId, "goto", { target: "form:component" });
  await expect(page).toHaveURL(/form:component/);
  await expect(page.locator("form.auto-form")).toBeVisible();

  const inspect = await command(request, pageId, "inspect");
  expect(inspect.status).toBe(200);
  const elements = inspect.json.elements as Json[];
  const field = elements.find(
    (e) => e.role === "textbox" && !e.disabled && (e.actions as string[]).includes("fill"),
  );
  expect(field, "an editable textbox on the form example").toBeTruthy();
  const ref = field!.ref as string;

  const fill = await command(request, pageId, "fill", {
    ref,
    value: "RAC-BRIDGE-FILL",
  });
  expect(fill.status, String(JSON.stringify(fill.json))).toBe(200);

  const dom = await command(request, pageId, "dom", { ref });
  expect(dom.status).toBe(200);
  const value = (dom.json.data as { value?: string })?.value;
  expect(value).toBe("RAC-BRIDGE-FILL");
  // The controlled value survives re-renders: React owns it now, not a stale
  // DOM write.
  await page.waitForTimeout(300);
  const again = await command(request, pageId, "dom", { ref });
  expect((again.json.data as { value?: string })?.value).toBe(
    "RAC-BRIDGE-FILL",
  );
});

test("refs expire at the next inspect and stale refs are rejected", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const pageId = await bridgePageId(page);
  await command(request, pageId, "goto", { target: "form:component" });
  await expect(page.locator("form.auto-form")).toBeVisible();

  const first = (await command(request, pageId, "inspect")).json;
  const ref = (first.elements as Json[]).find(
    (e) => e.role === "textbox",
  )!.ref as string;
  // A second inspection resets the ref map; the old ref is now stale.
  await command(request, pageId, "inspect");
  const stale = await command(request, pageId, "dom", { ref });
  expect(stale.status).toBe(409);
  expect(stale.json.code).toBe("RAC-PAGE-REF");
  expect(String(stale.json.fix)).toContain("inspect");
});

test("product evaluation stays disabled", async ({ page, request }) => {
  await page.goto("/");
  const pageId = await bridgePageId(page);
  const result = await command(request, pageId, "eval", { code: "1+1" });
  expect(result.status).toBe(409);
  expect(result.json.code).toBe("RAC-DEVTOOLS-EVAL");
  expect(String(result.json.fix)).toContain("allowEval");
});

test("one aborted poll is retried without replaying actions", async ({
  page,
  request,
}) => {
  test.setTimeout(90000);
  // Install before goto so the very first poll is deterministically aborted
  // (a poll parked in flight would miss the route).
  let aborted = false;
  await page.route("**/__rac/poll", async (route) => {
    if (!aborted) {
      aborted = true;
      await route.abort("connectionreset");
      return;
    }
    await route.continue();
  });
  await page.goto("/");
  const pageId = await bridgePageId(page);
  await expect
    .poll(() => aborted, { timeout: 20000 })
    .toBe(true);

  // Replay probe: a visible button counting its own clicks in the DOM. After
  // the poll abort and retry, one click command must click it exactly once.
  await page.evaluate(() => {
    const probe = document.createElement("button");
    probe.id = "rac-replay-probe";
    probe.setAttribute("data-testid", "rac-replay-probe");
    probe.setAttribute("aria-label", "RAC-REPLAY-PROBE");
    probe.dataset.clicks = "0";
    probe.textContent = "probe";
    probe.addEventListener("click", () => {
      probe.dataset.clicks = String(Number(probe.dataset.clicks ?? "0") + 1);
    });
    document.body.appendChild(probe);
  });

  const inspect = await command(request, pageId, "inspect");
  expect(inspect.status).toBe(200);
  const probe = (inspect.json.elements as Json[]).find(
    (e) => e.testid === "rac-replay-probe",
  );
  expect(probe, "the injected probe button appears in inspect").toBeTruthy();

  const click = await command(request, pageId, "click", {
    ref: probe!.ref,
  });
  expect(click.status, String(JSON.stringify(click.json))).toBe(200);

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .querySelector("#rac-replay-probe")
            ?.getAttribute("data-clicks") ?? "missing",
      ),
    )
    .toBe("1");
});

test("reload keeps the pageId under a fresh connection", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const pageId = await bridgePageId(page);
  const before = (await pages(request)).find((p) => p.pageId === pageId);
  expect(before?.status).toBe("ready");

  await page.reload();
  await expect
    .poll(
      () =>
        page.evaluate(
          () => (globalThis as { __racPageId?: string }).__racPageId ?? "",
        ),
      { timeout: 20000 },
    )
    .toBe(pageId);
  const after = (await pages(request)).find((p) => p.pageId === pageId);
  expect(after?.status).toBe("ready");
  expect(after?.connectionId).not.toBe(before?.connectionId);

  // The replaced connection is rejected instead of silently answered.
  const old = await call(request, "POST", "/__rac/poll", {
    pageId,
    connectionId: before!.connectionId,
  });
  expect(old.status).toBe(409);
  expect(old.json.code).toBe("RAC-PAGE-DISCONNECTED");
});

test("commands never fall back after the chosen page closes", async ({
  page,
  request,
}) => {
  // The offline marker usually arrives via the client's pagehide beacon, but
  // browsers may drop it (Firefox does on programmatic close). The registry's
  // supported fallback is natural lease expiry: the plugin builds its
  // registry with staleMs 60000 and list() expires the stale entry lazily.
  // Wait out the full lease; beacons that do deliver end the wait early.
  test.setTimeout(90000);
  await page.goto("/");
  const chosen = await bridgePageId(page);
  const otherTab = await newConnectedPage(page);
  try {
    const other = await bridgePageId(otherTab);
    const otherUrl = otherTab.url();
    await page.close();

    await expect
      .poll(
        async () => {
          const record = (await pages(request)).find(
            (p) => p.pageId === chosen,
          );
          return record?.status;
        },
        { timeout: 70000, intervals: [1000, 5000] },
      )
      .toBe("offline");

    // The closed page is rejected; nothing is rerouted to the survivor.
    const result = await command(request, chosen, "dom", { ref: "x" });
    expect(result.status).toBe(409);
    expect(result.json.code).toBe("RAC-PAGE-DISCONNECTED");
    // The survivor's own browser session was never touched.
    expect(otherTab.url()).toBe(otherUrl);
    // The survivor stays fully usable.
    const survivor = await command(request, other, "inspect");
    expect(survivor.json.pageId).toBe(other);
  } finally {
    await otherTab.close();
  }
});

test("screenshots of unmanaged pages fail without opening a substitute", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const pageId = await bridgePageId(page);
  const count = (await pages(request)).length;

  const shot = await request.fetch(
    `/__rac/shot?pageId=${encodeURIComponent(pageId)}`,
    { headers: await auth() },
  );
  expect(shot.status()).toBe(409);
  expect(((await shot.json()) as Json).code).toBe("RAC-DEVTOOLS-SCREENSHOT");
  // No substitute page was created behind the caller's back.
  expect((await pages(request)).length).toBe(count);
});

test("managed pages open headless and shot the exact page with its state", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  await page.goto("/");
  await bridgePageId(page);

  const opened = await call(request, "POST", "/__rac/open", {
    headless: true,
  });
  expect(opened.status, String(JSON.stringify(opened.json))).toBe(200);
  const managedId = opened.json.pageId as string;
  expect(managedId).toBeTruthy();

  await command(request, managedId, "goto", { target: "form:component" });
  const inspect = await command(request, managedId, "inspect");
  const field = (inspect.json.elements as Json[]).find(
    (e) => e.role === "textbox" && !e.disabled && (e.actions as string[]).includes("fill"),
  );
  expect(field, "an editable textbox on the managed page").toBeTruthy();
  const ref = field!.ref as string;

  const fill = await command(request, managedId, "fill", {
    ref,
    value: "RAC-SHOT-STATE",
  });
  expect(fill.status, String(JSON.stringify(fill.json))).toBe(200);

  const shot = await request.fetch(
    `/__rac/shot?pageId=${encodeURIComponent(managedId)}`,
    { headers: await auth() },
  );
  expect(shot.status()).toBe(200);
  expect(shot.headers()["content-type"]).toBe("image/png");
  expect(shot.headers()["x-rac-page-id"]).toBe(managedId);
  const body = await shot.body();
  expect(body.subarray(0, 4).toString("binary")).toBe("\u0089PNG");

  // The exact page kept its temporary input state across the capture.
  const dom = await command(request, managedId, "dom", { ref });
  expect((dom.json.data as { value?: string })?.value).toBe("RAC-SHOT-STATE");

  // Disconnect so the extra ready page cannot leak into later expectations.
  const record = (await pages(request)).find((p) => p.pageId === managedId);
  if (record) await disconnect(request, record);
});
