import { randomUUID, timingSafeEqual } from "node:crypto";
import { readFile, mkdir, writeFile, unlink } from "node:fs/promises";
import { resolve, join } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin, ViteDevServer } from "vite";
import { PageRegistry } from "./registry.js";
import { DemoRunner } from "./demos.js";
import type { DemoScenario } from "./protocol.js";
import { RacError, failure } from "./errors.js";
import { BrowserController } from "./browser.js";
import { PREFIX, PROTOCOL_VERSION } from "./protocol.js";

export interface DevtoolsOptions {
  enabled?: boolean;
  allowEval?: boolean;
  discoveryDir?: string;
  browserEndpoint?: string;
  demos?: Record<string, DemoScenario>;
}
const commands = new Set([
  "inspect",
  "state",
  "goto",
  "replace",
  "setParams",
  "click",
  "fill",
  "wait",
  "dom",
  "submit",
  "validate",
  "console",
  "eval",
]);
const local = (host: string) =>
  ["localhost", "127.0.0.1", "::1", "[::1]", "::ffff:127.0.0.1"].includes(host);
function input(problem: string): never {
  throw new RacError(
    "RAC-DEVTOOLS-INPUT",
    problem,
    "Run rac help --json and supply the documented command parameters.",
  );
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    input("Expected a JSON object.");
  return value as Record<string, unknown>;
}
const INPUT_LIMIT = 65536;
// Command results flow from the page client, not from the CLI: a large eval
// or big select listing must be acknowledged without tearing the page down.
// The client caps its own result bodies below this bound and answers with a
// small structured error instead, so the limit stays a safety net.
const RESULT_LIMIT = 2 * 1024 * 1024;
async function body(req: IncomingMessage, limit = INPUT_LIMIT) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > limit)
      input(
        limit === INPUT_LIMIT
          ? "Request body exceeds 64 KiB."
          : "Result body exceeds the 2 MiB delivery bound.",
      );
    chunks.push(buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return raw ? object(JSON.parse(raw)) : {};
  } catch (error) {
    if (error instanceof RacError) throw error;
    input("Request body is not valid JSON.");
  }
}
function json(res: ServerResponse, status: number, value: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(value));
}
export function reactAutoComponentsDevtools(
  options: DevtoolsOptions = {},
): Plugin {
  const enabled = options.enabled ?? process.env.RAC_AGENT === "1";
  // The plugin never puts the token into the HTML: served pages stay
  // secret-free even when the dev server binds a LAN address. The bootstrap
  // module is handed out only after the loopback/Host/Origin checks and
  // carries this server generation's credential from the closure below.
  // Only one running dev server may share a plugin instance at a time;
  // sequential reuse after disposal stays supported.
  let current: { dispose: () => Promise<void> } | undefined;
  return {
    name: "react-auto-components-devtools",
    apply: "serve",
    transformIndexHtml(html, context) {
      if (!enabled || !context.server) return html;
      return [
        {
          tag: "script",
          attrs: { type: "module", src: `${PREFIX}/bootstrap.js` },
          injectTo: "head",
        },
      ];
    },
    config(config) {
      if (!enabled) return;
      // Supply the deny patterns before Vite compiles its filesystem matcher.
      const deny = [
        ".env",
        ".env.*",
        "*.{crt,pem,key,p12,pfx,cer,der}",
        ".npmrc",
        ".yarnrc.yml",
        "**/.git/**",
        "**/.rac/**",
      ];
      if (options.discoveryDir)
        deny.push(
          `${resolve(config.root ?? process.cwd(), options.discoveryDir).replaceAll("\\", "/")}/**`,
        );
      return {
        server: { fs: { deny: [...(config.server?.fs?.deny ?? []), ...deny] } },
      };
    },
    configureServer(server: ViteDevServer) {
      if (!enabled) return;
      if (current)
        throw new RacError(
          "RAC-DEVTOOLS-INPUT",
          "This plugin instance is already attached to another running dev server.",
          "Create a fresh reactAutoComponentsDevtools() plugin instance for each running dev server; reusing an instance sequentially after the previous server was disposed stays supported.",
        );
      const token = randomUUID();
      const serverId = randomUUID();
      const registry = new PageRegistry({ staleMs: 60000 });
      const demos = new DemoRunner(registry, options.demos);
      const browser = new BrowserController(options.browserEndpoint);
      let discoveryPath: string | undefined;
      let discoveryWrite: Promise<void> | undefined;
      let serverUrl = "";
      let disposePromise: Promise<void> | undefined;
      function dispose() {
        return (disposePromise ??= (async () => {
          demos.dispose();
          registry.dispose();
          await discoveryWrite;
          if (discoveryPath) await unlink(discoveryPath).catch(() => {});
          await browser.dispose();
          // Keep the generation reachable while cleanup is in flight so a
          // subsequent closeBundle also awaits it before allowing reuse.
          if (current?.dispose === dispose) current = undefined;
        })());
      }
      current = { dispose };
      if (options.browserEndpoint) {
        const endpoint = new URL(options.browserEndpoint);
        if (
          !["http:", "https:", "ws:", "wss:"].includes(endpoint.protocol) ||
          !local(endpoint.hostname)
        )
          input("browserEndpoint must point to a local Chromium CDP endpoint.");
      }
      const directory = resolve(
        server.config.root,
        options.discoveryDir ?? ".rac/servers",
      );
      server.httpServer?.once("listening", () => {
        discoveryWrite = (async () => {
          const address = server.httpServer!.address();
          if (!address || typeof address === "string") return;
          const hostname = address.family === "IPv6" ? "[::1]" : "127.0.0.1";
          serverUrl = `${server.config.server.https ? "https" : "http"}://${hostname}:${address.port}`;
          await mkdir(directory, { recursive: true, mode: 0o700 });
          discoveryPath = join(directory, `${serverId}.json`);
          await writeFile(
            discoveryPath,
            JSON.stringify({
              protocolVersion: PROTOCOL_VERSION,
              serverId,
              url: serverUrl,
              token,
              pid: process.pid,
              root: server.config.root,
            }),
            { mode: 0o600 },
          );
          server.config.logger.info(
            `[React Auto Components DevTools] enabled; run rac inspect (server ${serverId})`,
          );
        })().catch((error) =>
          server.config.logger.error(failure(error).message),
        );
      });
      server.httpServer?.once("close", () => {
        void dispose();
      });
      server.middlewares.use(async (req, res, next) => {
        let url: URL;
        try {
          url = new URL(req.url ?? "/", "http://localhost");
        } catch {
          // Malformed paths such as "//[" get past Vite's parseurl; answer
          // synchronously here instead of rejecting this promise.
          json(
            res,
            400,
            failure(
              new RacError(
                "RAC-DEVTOOLS-INPUT",
                "The request URL is malformed.",
                "Request a documented /__rac route or a valid application path.",
              ),
            ),
          );
          return;
        }
        if (!url.pathname.startsWith(`${PREFIX}/`)) {
          next();
          return;
        }
        try {
          if (!local(req.socket.remoteAddress ?? ""))
            throw new RacError(
              "RAC-DEVTOOLS-AUTH",
              "The bridge accepts loopback connections only.",
              "Run the agent on the development machine and use a localhost URL.",
            );
          let host: URL;
          try {
            host = new URL(
              `${server.config.server.https ? "https" : "http"}://${req.headers.host ?? "invalid"}`,
            );
          } catch {
            throw new RacError(
              "RAC-DEVTOOLS-AUTH",
              "The bridge requires a localhost Host header.",
              "Open the application using its localhost URL.",
            );
          }
          if (!local(host.hostname))
            throw new RacError(
              "RAC-DEVTOOLS-AUTH",
              "The bridge requires a localhost Host header.",
              "Open the application using its localhost URL.",
            );
          if (req.headers.origin) {
            let sameOrigin: boolean;
            try {
              const origin = new URL(req.headers.origin);
              // Malformed and opaque ("null") origins fail closed.
              sameOrigin =
                origin.protocol === host.protocol && origin.host === host.host;
            } catch {
              sameOrigin = false;
            }
            if (!sameOrigin)
              throw new RacError(
                "RAC-DEVTOOLS-AUTH",
                "Cross-origin bridge requests are rejected.",
                "Use the CLI or the application's same-origin page client.",
              );
          }
          const route = url.pathname.slice(PREFIX.length + 1);
          if (req.method === "GET" && route === "bootstrap.js") {
            // Token-free HTML loads this module same-origin; cross-origin
            // module fetches were rejected by the Origin check above.
            res.setHeader("Content-Type", "text/javascript; charset=utf-8");
            res.setHeader("Cache-Control", "no-store");
            res.setHeader("X-Content-Type-Options", "nosniff");
            res.end(
              `import { start } from '${PREFIX}/client.js';\nstart(${JSON.stringify({ token, allowEval: options.allowEval === true, demos: !!options.demos && Object.keys(options.demos).length > 0 })});\n`,
            );
            return;
          }
          if (
            req.method === "GET" &&
            [
              "client.js",
              "demo-client.js",
              "page.js",
              "errors.js",
              "protocol.js",
            ].includes(route)
          ) {
            res.setHeader("Content-Type", "text/javascript");
            res.setHeader("Cache-Control", "no-store");
            res.end(
              await readFile(new URL(`./${route}`, import.meta.url), "utf8"),
            );
            return;
          }
          const data =
            req.method === "POST"
              ? await body(req, route === "result" ? RESULT_LIMIT : INPUT_LIMIT)
              : {};
          const credential =
            req.headers.authorization?.replace(/^Bearer /, "") ?? data.token;
          if (
            typeof credential !== "string" ||
            Buffer.byteLength(credential) !== Buffer.byteLength(token) ||
            !timingSafeEqual(Buffer.from(credential), Buffer.from(token))
          )
            throw new RacError(
              "RAC-DEVTOOLS-AUTH",
              "The bridge session token is missing or invalid.",
              "Use rac from this project to discover the current server credentials.",
            );
          if (route === "demo" && req.method === "POST") {
            if (
              typeof data.pageId !== "string" ||
              !data.pageId ||
              typeof data.connectionId !== "string" ||
              !data.connectionId
            )
              input("Demonstrations require explicit page and connection IDs.");
            const pageId = data.pageId as string,
              connectionId = data.connectionId as string;
            if (data.action === "status")
              json(res, 200, demos.status(pageId, connectionId));
            else if (data.action === "stop")
              json(res, 200, demos.stop(pageId, connectionId));
            else if (data.action === "start") {
              if (typeof data.scenario !== "string")
                input("Select a registered demonstration name.");
              if (
                data.expiresAt !== undefined &&
                (typeof data.expiresAt !== "number" ||
                  !Number.isFinite(data.expiresAt) ||
                  data.expiresAt < Date.now() ||
                  data.expiresAt > Date.now() + 10000)
              )
                input("The demonstration start request has expired.");
              json(
                res,
                200,
                demos.start(pageId, connectionId, data.scenario as string),
              );
            } else input("Unknown demonstration action.");
            return;
          }
          if (route === "health" && req.method === "GET") {
            json(res, 200, {
              status: "ready",
              protocolVersion: PROTOCOL_VERSION,
              serverId,
              capabilities: [...commands].filter(
                (c) => c !== "eval" || options.allowEval,
              ),
              pages: registry.list(),
            });
            return;
          }
          if (route === "connect" && req.method === "POST") {
            if (
              typeof data.title !== "string" ||
              typeof data.url !== "string" ||
              (data.pageId !== undefined && typeof data.pageId !== "string")
            )
              input("Page registration requires title and url strings.");
            json(
              res,
              200,
              registry.connect({
                title: data.title as string,
                url: data.url as string,
                pageId: data.pageId as string | undefined,
                reload: data.reload === true,
              }),
            );
            return;
          }
          if (
            ["poll", "result", "disconnect", "metadata"].includes(route) &&
            req.method === "POST"
          ) {
            if (
              typeof data.pageId !== "string" ||
              typeof data.connectionId !== "string"
            )
              input("Page and connection IDs are required.");
            const pageId = data.pageId as string,
              connectionId = data.connectionId as string;
            if (route === "poll" || route === "metadata") {
              registry.update(pageId, connectionId, {
                title: typeof data.title === "string" ? data.title : undefined,
                url: typeof data.url === "string" ? data.url : undefined,
              });
              if (route === "poll") {
                // A connection torn down mid-poll (tab close, network reset)
                // frees exactly THIS waiter: an older response closing after
                // a newer poll parked must not cancel the current waiter.
                // Commands stay queued for the client's retry and the page
                // lease is untouched — a transient abort never marks the
                // page offline.
                const waiter = registry.beginPoll(pageId, connectionId);
                const onClose = () => waiter.cancel();
                res.once("close", onClose);
                try {
                  json(res, 200, await waiter.promise);
                } finally {
                  res.off?.("close", onClose);
                }
              } else {
                json(res, 200, { ok: true });
              }
            } else {
              if (route === "disconnect")
                registry.disconnect(pageId, connectionId);
              else
                registry.result(
                  pageId,
                  connectionId,
                  object(
                    data.result,
                  ) as unknown as import("./protocol.js").CommandResult,
                );
              json(res, 200, { ok: true });
            }
            return;
          }
          if (route === "pages" && req.method === "GET") {
            json(res, 200, { serverId, pages: registry.list() });
            return;
          }
          if (route === "open" && req.method === "POST") {
            if (!serverUrl) input("The server is not listening yet.");
            const target = new URL(
              typeof data.path === "string" ? data.path : server.config.base,
              serverUrl,
            );
            if (target.origin !== new URL(serverUrl).origin)
              input("Managed pages must use this development server's origin.");
            const pageId = await browser.open(
              target.href,
              data.headless === true,
            );
            json(res, 200, { status: "ready", serverId, pageId });
            return;
          }
          if (
            route === "inspect" &&
            req.method === "GET" &&
            !url.searchParams.get("pageId") &&
            registry.list().filter((p) => p.status === "ready").length > 1
          ) {
            json(res, 200, {
              status: "selection_required",
              serverId,
              pages: registry.list(),
              next: { command: "rac inspect --page <pageId>" },
            });
            return;
          }
          if (route === "shot" && req.method === "GET") {
            if (!url.searchParams.get("pageId"))
              input("Screenshots require an explicit pageId from inspect.");
            const page = registry.select(
              url.searchParams.get("pageId") ?? undefined,
            );
            const image = await browser.shot(
              page.pageId,
              url.searchParams.get("full") === "1",
            );
            res.setHeader("Content-Type", "image/png");
            res.setHeader("Cache-Control", "no-store");
            res.setHeader("X-Rac-Page-Id", page.pageId);
            res.end(image);
            return;
          }
          if (
            (route === "inspect" && req.method === "GET") ||
            (route === "command" && req.method === "POST")
          ) {
            if (
              route === "command" &&
              (typeof data.pageId !== "string" || !data.pageId)
            )
              input("Commands require an explicit pageId from inspect.");
            const page = registry.select(
              route === "inspect"
                ? (url.searchParams.get("pageId") ?? undefined)
                : (data.pageId as string | undefined),
            );
            const cmd = route === "inspect" ? "inspect" : String(data.cmd);
            if (!commands.has(cmd)) input(`Unknown command "${cmd}".`);
            if (cmd === "eval" && !options.allowEval)
              throw new RacError(
                "RAC-DEVTOOLS-EVAL",
                "JavaScript evaluation is disabled.",
                "Explicitly set allowEval: true in the development plugin if evaluation is required.",
              );
            const payload =
              data.payload === undefined ? {} : object(data.payload);
            if (
              payload.timeout !== undefined &&
              (!Number.isFinite(payload.timeout) ||
                Number(payload.timeout) <= 0 ||
                Number(payload.timeout) > 30000)
            )
              input(
                "timeout must be a number between 1 and 30000 milliseconds.",
              );
            const result = await registry.command(
              page.pageId,
              cmd,
              payload,
              cmd === "wait"
                ? Number(payload.timeout ?? 5000) + 1000
                : undefined,
            );
            json(res, 200, {
              status: "success",
              serverId,
              pageId: page.pageId,
              ...(cmd === "inspect" ? object(result) : { data: result }),
            });
            return;
          }
          json(
            res,
            404,
            failure(
              new RacError(
                "RAC-DEVTOOLS-INPUT",
                "Unknown bridge route or method.",
                "Run rac help --json for the supported commands.",
              ),
            ),
          );
        } catch (error) {
          const result = failure(error);
          json(
            res,
            result.code === "RAC-DEVTOOLS-AUTH"
              ? 403
              : result.code === "RAC-DEVTOOLS-INPUT"
                ? 400
                : 409,
            result,
          );
        }
      });
    },
    async closeBundle() {
      await current?.dispose();
    },
  };
}
