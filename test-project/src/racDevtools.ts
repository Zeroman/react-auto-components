import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin, ViteDevServer } from "vite";

interface PendingCommand {
  resolve: (data: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface BridgeEvent {
  seq: number;
  time: string;
  kind: string;
  pathString?: string;
  params?: unknown;
  [extra: string]: unknown;
}

/**
 * Dev-only bridge between the CLI/AI and the running app.
 * Control commands relay over the vite HMR websocket to the browser tab
 * (racDevtoolsClient.ts); screenshots render in a server-side headless page.
 * Endpoints: GET /__rac/health|state|events|shot, POST /__rac/goto|params.
 */
export function racDevtoolsPlugin(): Plugin {
  let server: ViteDevServer;
  const pending = new Map<string, PendingCommand>();
  const events: BridgeEvent[] = [];
  let seq = 0;
  let commandSerial = 0;
  let lastSeen = 0;
  let lastState: { path?: unknown[]; pathString?: string; params?: unknown } =
    {};

  function log(text: string) {
    server.config.logger.info(`[rac-devtools] ${text}`, { timestamp: true });
  }

  function recordEvent(payload: Record<string, unknown>) {
    // Broadcast commands reach every connected tab (visible + headless); their
    // identical console output is noise, so collapse near-duplicate lines.
    const last = events[events.length - 1];
    if (
      payload.kind === "console" &&
      last?.kind === "console" &&
      last.text === payload.text &&
      Date.parse(new Date().toISOString()) - Date.parse(last.time) < 1000
    )
      return;
    seq += 1;
    const event: BridgeEvent = {
      seq,
      time: new Date().toISOString(),
      kind: String(payload.kind ?? "unknown"),
      ...payload,
    };
    events.push(event);
    if (events.length > 200) events.shift();
    if (event.kind === "state" || event.kind === "ready") {
      log(`${event.kind} ${event.pathString ?? ""}`);
    }
    if (event.kind === "console" && event.level === "error") {
      log(`console.error ${String(event.text ?? "").slice(0, 200)}`);
    }
  }

  function sendCommand(cmd: string, payload: unknown, timeoutMs: number) {
    return new Promise<unknown>((resolve, reject) => {
      const id = `cmd-${++commandSerial}`;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(
          new Error(
            `devtools command "${cmd}" timed out — is a browser tab open on this dev server?`,
          ),
        );
      }, timeoutMs);
      pending.set(id, { resolve, reject, timer });
      // Target the page that loaded most recently (its ready event). Stale
      // tabs ignore commands addressed to another clientId.
      const target = activeClientId
        ? clients.get(activeClientId)
        : undefined;
      // eslint-disable-next-line no-console
      console.log(`[rac-dbg] send cmd=${cmd} activeId=${activeClientId ?? "-"} target=${!!target}`);
      const data = { id, cmd, target: activeClientId, payload };
      if (typeof target?.send === "function")
        target.send({ type: "custom", event: "rac:cmd", data });
      else
        reject(
          new Error(`devtools command "${cmd}" has no live page to target yet.`),
        );
    });
  }

  let activeClientId: string | undefined;
  const clients = new Map<string, { send?: (data: unknown) => void }>();
  let shotBrowser: import("@playwright/test").Browser | undefined;
  let shotPage: import("@playwright/test").Page | undefined;
  let shotHeadless: boolean | undefined;

  async function launchBrowser(
    chromium: (typeof import("@playwright/test"))["chromium"],
    headless: boolean,
  ) {
    if (headless) return chromium.launch({ headless: true });
    try {
      return await chromium.launch({ headless: false });
    } catch (error) {
      log(
        `headed launch failed (${String((error as Error)?.message ?? error).slice(0, 120)}); falling back to headless`,
      );
      return chromium.launch({ headless: true });
    }
  }

  async function ensureShotPage(port: number, headless: boolean) {
    const { chromium } = await import("@playwright/test");
    const forceHeadless = process.env.RAC_DEVTOOLS_HEADLESS === "1";
    const mode = forceHeadless || headless;
    if (!shotBrowser || shotHeadless !== mode || !shotBrowser.isConnected()) {
      await shotBrowser?.close().catch(() => {});
      shotBrowser = await launchBrowser(chromium, mode);
      shotHeadless = mode;
      shotPage = undefined;
      log(
        mode
          ? "devtools browser launched (headless)"
          : "devtools browser launched (HEADED — watch it drive the app)",
      );
    }
    if (!shotPage || shotPage.isClosed())
      shotPage = await shotBrowser.newPage();
    return { page: shotPage, port };
  }

  async function readBody(req: IncomingMessage): Promise<string> {
    let raw = "";
    for await (const chunk of req) raw += chunk as string;
    return raw;
  }

  /**
   * Route census: drive the app with the headless page, click every nav entry
   * and tab once, and record each reachable route. The fog-of-war map for AI.
   */
  async function crawl(port: number, headless: boolean) {
    const { page } = await ensureShotPage(port, headless);
    const visited: { path: string; title: string }[] = [];
    const seen = new Set<string>();
    const visit = async () => {
      await page.waitForTimeout(350);
      const hash = await page.evaluate(() => location.hash);
      if (seen.has(hash)) return;
      seen.add(hash);
      visited.push({
        path: hash.replace(/^#\/?/, ""),
        title: await page.evaluate(
          () =>
            document.querySelector("main h1")?.textContent?.trim() ??
            document.title,
        ),
      });
    };
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`http://127.0.0.1:${port}/`);
    await visit();
    const visitTabs = async () => {
      const tabs = page.locator('main [role="tab"]:visible');
      const tabCount = Math.min(await tabs.count(), 30);
      for (let j = 0; j < tabCount; j++) {
        try {
          await tabs.nth(j).click({ timeout: 2000 });
        } catch {
          continue;
        }
        await visit();
      }
    };
    const sections = page.locator("aside nav > ul > li");
    const sectionCount = await sections.count();
    for (let i = 0; i < sectionCount; i++) {
      const section = sections.nth(i);
      await section.locator("> button").click();
      await page.waitForTimeout(300);
      await visit();
      const children = section.locator("ul button");
      const childCount = await children.count();
      for (let j = 0; j < childCount; j++) {
        await children.nth(j).click();
        await page.waitForTimeout(300);
        await visit();
        await visitTabs();
      }
      await visitTabs();
    }
    log(`crawl discovered ${visited.length} routes`);
    return { routes: visited, crawledAt: new Date().toISOString() };
  }

  function respondJson(res: ServerResponse, status: number, body: unknown) {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(body));
  }

  return {
    name: "rac-devtools",
    configureServer(devServer) {
      server = devServer;
      // Track the newest live tab: every heartbeat refreshes the active client
      // so targeted commands never land on stale or reloading pages.
      type HotClient = { send?: (data: unknown) => void };
      const hot = server.hot as unknown as {
        on?: (
          event: string,
          listener: (
            socket: {
              on?: (event: string, listener: (raw: unknown) => void) => void;
              send?: (data: string) => void;
            },
            client: HotClient,
          ) => void,
        ) => void;
      };
      if (typeof hot.on === "function") {
        // The newest connection wins and stays targeted. Heartbeat-based
        // tracking would flip back to a dying tab during the overlap window
        // between two test pages.
        hot.on("connection", (socket, client) => {
          // vite 8's connection `client` carries no send; target tabs through
          // the raw socket with the full custom-event envelope instead.
          const outlet = {
            send: (data: unknown) =>
              socket.send?.(
                JSON.stringify({ type: "custom", event: "rac:cmd", data }),
              ),
          };
          socket.on?.("message", (raw: unknown) => {
            try {
              const msg = JSON.parse(String(raw)) as {
                event?: string;
                data?: {
                  clientId?: string;
                  kind?: string;
                  id?: string;
                  ok?: boolean;
                  error?: string;
                };
              };
              const clientId = msg?.data?.clientId;
              if (clientId) clients.set(clientId, outlet);
              if (msg?.event === "rac:event" && msg.data?.kind === "ready")
                activeClientId = clientId;
              if (msg?.event === "rac:result") {
                lastSeen = Date.now();
                const result = msg.data as {
                  id?: string;
                  ok?: boolean;
                  data?: unknown;
                  error?: string;
                };
                const entry = result?.id
                  ? pending.get(result.id)
                  : undefined;
                if (entry) {
                  clearTimeout(entry.timer);
                  pending.delete(result.id!);
                  if (result.ok) entry.resolve(result.data);
                  else
                    entry.reject(new Error(result.error ?? "command failed"));
                }
              }
            } catch {
              /* non-json frames are vite internals */
            }
          });
          socket.on?.("close", () => {
            for (const [id, c] of clients)
              if (c === outlet) clients.delete(id);
          });
        });
      }
      server.ws.on("rac:event", (payload: Record<string, unknown>) => {
        lastSeen = Date.now();
        if (payload?.kind === "ping") return;
        if (payload?.kind === "state" || payload?.kind === "ready") {
          lastState = payload as typeof lastState;
        }
        recordEvent(payload ?? {});
      });

      server.middlewares.use(
        async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          const url = new URL(req.url ?? "/", "http://localhost");
          if (!url.pathname.startsWith("/__rac/")) {
            next();
            return;
          }
          const route = url.pathname.slice("/__rac/".length);
          try {
            if (route === "health" && req.method === "GET") {
              respondJson(res, 200, {
                ok: true,
                connected: Date.now() - lastSeen < 5000,
                lastSeenMsAgo: Date.now() - lastSeen,
                eventCount: events.length,
              });
              return;
            }
            if (route === "cmd" && req.method === "POST") {
              const body = JSON.parse((await readBody(req)) || "{}");
              respondJson(
                res,
                200,
                await sendCommand(body.cmd, body.payload, 10000),
              );
              return;
            }
            if (route === "console" && req.method === "GET") {
              const limit = Number(url.searchParams.get("limit") ?? 30);
              respondJson(
                res,
                200,
                events
                  .filter((event) => event.kind === "console")
                  .slice(-limit),
              );
              return;
            }
            if (route === "crawl" && req.method === "GET") {
              const port = Number(server.config.server.port ?? 4173);
              const headless = url.searchParams.get("headless") === "1";
              respondJson(res, 200, await crawl(port, headless));
              return;
            }
            if (route === "state" && req.method === "GET") {
              respondJson(res, 200, await sendCommand("state", null, 5000));
              return;
            }
            if (route === "events" && req.method === "GET") {
              const limit = Number(url.searchParams.get("limit") ?? 50);
              respondJson(res, 200, events.slice(-limit));
              return;
            }
            if (route === "goto" && req.method === "POST") {
              const body = JSON.parse((await readBody(req)) || "{}");
              respondJson(
                res,
                200,
                await sendCommand(
                  body.replace ? "replace" : "goto",
                  body,
                  10000,
                ),
              );
              return;
            }
            if (route === "params" && req.method === "POST") {
              const body = JSON.parse((await readBody(req)) || "{}");
              respondJson(res, 200, await sendCommand("setParams", body, 5000));
              return;
            }
            if (route === "shot" && req.method === "GET") {
              const port = Number(server.config.server.port ?? 4173);
              const { page } = await ensureShotPage(
                port,
                url.searchParams.get("headless") === "1",
              );
              const query = url.searchParams;
              const width = Number(query.get("w") ?? 1280);
              const height = Number(query.get("h") ?? 800);
              const targetPath =
                query.get("path") ?? lastState.pathString ?? "";
              const testid = query.get("testid");
              const settle = Number(query.get("wait") ?? 500);
              await page.setViewportSize({ width, height });
              await page.goto(`http://127.0.0.1:${port}/#${targetPath}`);
              await page.waitForTimeout(settle);
              const image = testid
                ? await page.getByTestId(testid).screenshot()
                : await page.screenshot({
                    fullPage: query.get("full") === "1",
                  });
              log(
                `shot ${testid ?? "page"} @${targetPath || "/"} (${image.length} bytes)`,
              );
              res.statusCode = 200;
              res.setHeader("Content-Type", "image/png");
              res.end(image);
              return;
            }
            respondJson(res, 404, {
              error: `unknown devtools route "${route}".`,
            });
          } catch (error) {
            respondJson(res, 500, {
              error: String((error as Error)?.message ?? error),
            });
          }
        },
      );
    },
  };
}
