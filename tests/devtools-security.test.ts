import { EventEmitter } from "node:events";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test, vi } from "vitest";
// The served HTML must stay secret-free: the credential is handed out only by
// the bootstrap module behind the loopback/Host/Origin checks. Consumers run
// the built plugin; the source TS import would not serve the real assets.
import { reactAutoComponentsDevtools } from "../packages/devtools/dist/vite.js";
import { PREFIX } from "../packages/devtools/dist/protocol.js";

type Json = Record<string, unknown>;

const roots: string[] = [];
const temp = (prefix: string) => {
  const root = mkdtempSync(join(tmpdir(), prefix));
  roots.push(root);
  return root;
};
afterEach(() => {
  vi.unstubAllEnvs();
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

type HookOf<T extends (...args: never[]) => unknown> = T | { handler: T };
function callHook<T extends (...args: never[]) => unknown>(
  hook: HookOf<T> | undefined,
  ...args: Parameters<T>
): ReturnType<T> | undefined {
  if (!hook) return undefined;
  const fn = typeof hook === "function" ? hook : hook.handler;
  return fn(...args) as ReturnType<T>;
}

interface Reply {
  status: number;
  headers: Record<string, string>;
  body: string;
}
function harness(
  options: Parameters<typeof reactAutoComponentsDevtools>[0],
  existing?: ReturnType<typeof reactAutoComponentsDevtools>,
) {
  const discoveryDir = temp("rac-security-discovery");
  const plugin =
    existing ??
    reactAutoComponentsDevtools({ ...options, discoveryDir });
  let handler:
    | ((
        req: unknown,
        res: unknown,
        next: () => void,
      ) => Promise<void> | void)
    | undefined;
  const httpServer = new EventEmitter() as EventEmitter & {
    address?: () => { address: string; family: string; port: number };
  };
  callHook(plugin.configureServer, {
    config: {
      root: temp("rac-security-root"),
      server: {},
      logger: { info: () => {}, error: () => {} },
    },
    httpServer,
    middlewares: { use: (fn: typeof handler) => (handler = fn) },
  } as never);
  const call = async (request: {
    method: string;
    /** Sent verbatim; use this to exercise raw malformed request targets. */
    path: string;
    headers?: Record<string, string>;
    remote?: string;
    /** When false, an unanswered request must call next() instead. */
    bridge?: boolean;
  }): Promise<Reply> => {
    const res: {
      statusCode: number;
      headers: Record<string, string>;
      body: string;
      end: (value: string) => void;
      setHeader: (name: string, value: string) => void;
    } = {
      // node:http responses default to 200 until changed.
      statusCode: 200,
      headers: {},
      body: "",
      end(value: string) {
        this.body = value;
      },
      setHeader(name: string, value: string) {
        this.headers[name] = value;
      },
    };
    let forwarded = false;
    await handler!({
      method: request.method,
      url: request.path,
      headers: request.headers ?? {},
      socket: { remoteAddress: request.remote ?? "127.0.0.1" },
    }, res, () => {
      forwarded = true;
    });
    if (request.bridge === false) expect(forwarded).toBe(true);
    else expect(forwarded).toBe(false);
    return { status: res.statusCode, headers: res.headers, body: res.body };
  };
  const listen = async (dir: string = discoveryDir) => {
    httpServer.address = () => ({
      address: "127.0.0.1",
      family: "IPv4",
      port: 4174,
    });
    httpServer.emit("listening");
    await vi.waitFor(() => expect(readdirSync(dir)).toHaveLength(1));
    const discovery = JSON.parse(
      readFileSync(join(dir, readdirSync(dir)[0]), "utf8"),
    ) as { token: string; serverId: string };
    return discovery;
  };
  const harnessState = { plugin, httpServer, call, listen, discoveryDir };
  return harnessState;
}

const host = { host: "127.0.0.1:4174" };

test("served HTML is secret-free and the bootstrap module carries the credential", async () => {
  const session = harness({ enabled: true });
  const tags = callHook(session.plugin.transformIndexHtml, "<html></html>", {
    server: {},
  } as never) as { attrs: Record<string, string>; children?: string }[];
  expect(tags[0].attrs.src).toBe(`${PREFIX}/bootstrap.js`);
  expect(tags[0].children).toBeUndefined();

  const discovery = await session.listen();
  // The injected markup never embeds the token, even by reference.
  expect(JSON.stringify(tags).includes(discovery.token)).toBe(false);

  const reply = await session.call({
    method: "GET",
    path: `${PREFIX}/bootstrap.js`,
    headers: { ...host },
  });
  expect(reply.status).toBe(200);
  expect(reply.headers["Content-Type"]).toContain("text/javascript");
  expect(reply.headers["Cache-Control"]).toBe("no-store");
  expect(reply.headers["X-Content-Type-Options"]).toBe("nosniff");
  // Same credential the discovery file holds — compared, never logged.
  expect(reply.body.includes(JSON.stringify(discovery.token))).toBe(true);
  expect(reply.body).toContain("start(");
});

test("bootstrap stays denied for remote peers, foreign hosts and cross-origin fetches", async () => {
  const session = harness({ enabled: true });
  await session.listen();

  const remote = await session.call({
    method: "GET",
    path: `${PREFIX}/bootstrap.js`,
    headers: { ...host },
    remote: "192.0.2.10",
  });
  expect(remote.status).toBe(403);

  const foreignHost = await session.call({
    method: "GET",
    path: `${PREFIX}/bootstrap.js`,
    headers: { host: "192.0.2.10:4174" },
  });
  expect(foreignHost.status).toBe(403);

  const crossOrigin = await session.call({
    method: "GET",
    path: `${PREFIX}/bootstrap.js`,
    headers: { ...host, origin: "http://evil.example" },
  });
  expect(crossOrigin.status).toBe(403);
});

test("origin checks compare scheme as well as host and fail closed", async () => {
  const session = harness({ enabled: true });
  await session.listen();

  const schemeMismatch = await session.call({
    method: "GET",
    path: `${PREFIX}/bootstrap.js`,
    headers: { ...host, origin: "https://127.0.0.1:4174" },
  });
  expect(schemeMismatch.status).toBe(403);

  const opaque = await session.call({
    method: "GET",
    path: `${PREFIX}/bootstrap.js`,
    headers: { ...host, origin: "null" },
  });
  expect(opaque.status).toBe(403);
  expect(JSON.parse(opaque.body).code).toBe("RAC-DEVTOOLS-AUTH");
});

test("malformed request targets are answered 400 instead of rejecting; clean paths forward", async () => {
  const session = harness({ enabled: true });
  await session.listen();

  // Raw node:http target that survives Vite's parseurl but defeats URL
  // parsing; the middleware must answer synchronously, never throw.
  const malformed = await session.call({ method: "GET", path: "//[" });
  expect(malformed.status).toBe(400);
  const problem = JSON.parse(malformed.body) as Json;
  expect(problem.code).toBe("RAC-DEVTOOLS-INPUT");
  expect(String(problem.fix)).toContain("/__rac");

  // Regular application paths are still forwarded untouched.
  await session.call({ method: "GET", path: "/app", bridge: false });
});

test("a plugin instance rejects a second concurrent server but allows sequential reuse", async () => {
  const first = harness({ enabled: true });
  await first.listen();

  let rejected: unknown;
  try {
    // Same plugin object, second live server — must fail loudly.
    harness({ enabled: true }, first.plugin);
  } catch (error) {
    rejected = error;
  }
  expect(rejected).toBeInstanceOf(Error);
  const problem = rejected as Error & { code: string; fix: string };
  expect(problem.code).toBe("RAC-DEVTOOLS-INPUT");
  expect(problem.fix).toContain("fresh reactAutoComponentsDevtools()");

  // Disposal clears the guard so restart-style sequential reuse works. The
  // reused plugin keeps its original discovery directory.
  await callHook(first.plugin.closeBundle);
  const second = harness({ enabled: true }, first.plugin);
  const discovery = await second.listen(first.discoveryDir);
  const health = await second.call({
    method: "GET",
    path: `${PREFIX}/health`,
    headers: { ...host, authorization: `Bearer ${discovery.token}` },
  });
  expect(health.status).toBe(200);
});

// Vite can emit HTTP close before invoking closeBundle. The hook must still
// await the in-progress disposal rather than return while credentials remain.
test("closeBundle awaits cleanup already started by HTTP close", async () => {
  const session = harness({ enabled: true });
  await session.listen();
  session.httpServer.emit("close");
  await callHook(session.plugin.closeBundle);
  expect(readdirSync(session.discoveryDir)).toHaveLength(0);
});
