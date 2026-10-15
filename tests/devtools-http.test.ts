import { EventEmitter } from "node:events";
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test, vi } from "vitest";
// Consumers run the built plugin: dist/vite.js serves the built browser
// assets that sit beside it. The source TS import would not.
import { reactAutoComponentsDevtools } from "../packages/devtools/dist/vite.js";
import { PREFIX } from "../packages/devtools/dist/protocol.js";

type Json = Record<string, unknown>;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Vite hooks accept a bare function or an { handler } object. */
type HookOf<T extends (...args: never[]) => unknown> = T | { handler: T };
function callHook<T extends (...args: never[]) => unknown>(
  hook: HookOf<T> | undefined,
  ...args: Parameters<T>
): ReturnType<T> | undefined {
  if (!hook) return undefined;
  const fn = typeof hook === "function" ? hook : hook.handler;
  return fn(...args) as ReturnType<T>;
}

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

// ---------------------------------------------------------------------------
// Minimal Vite dev-server harness: the plugin only needs config, httpServer
// and middlewares.use. Everything behind the middleware runs for real.
// ---------------------------------------------------------------------------
interface Reply {
  status: number;
  headers: Record<string, string>;
  body: string;
}
function harness(
  options: Parameters<typeof reactAutoComponentsDevtools>[0],
  existing?: ReturnType<typeof reactAutoComponentsDevtools>,
) {
  const plugin = existing ?? reactAutoComponentsDevtools(options);
  let handler:
    | ((req: unknown, res: unknown, next: () => void) => Promise<void>)
    | undefined;
  const httpServer = new EventEmitter() as EventEmitter & {
    address?: () => { address: string; family: string; port: number };
  };
  const infos: string[] = [];
  callHook(plugin.configureServer, {
    config: {
      root: temp("rac-plugin-root"),
      server: {},
      logger: { info: (m: string) => infos.push(m), error: () => {} },
    },
    httpServer,
    middlewares: { use: (fn: typeof handler) => (handler = fn) },
  } as never);
  const call = async (request: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: Json;
    remote?: string;
  }): Promise<Reply> => {
    const res: {
      statusCode: number;
      headers: Record<string, string>;
      body: string;
      end: (value: string) => void;
      setHeader: (name: string, value: string) => void;
    } = {
      statusCode: 0,
      headers: {},
      body: "",
      end(value: string) {
        this.body = value;
      },
      setHeader(name: string, value: string) {
        this.headers[name] = value;
      },
    };
    const payload = request.body === undefined ? "" : JSON.stringify(request.body);
    await handler!({
      method: request.method,
      url: request.path,
      headers: request.headers ?? {},
      socket: { remoteAddress: request.remote ?? "127.0.0.1" },
      async *[Symbol.asyncIterator]() {
        if (payload) yield payload;
      },
    }, res, () => {
      throw new Error("middleware should always answer /__rac requests");
    });
    return { status: res.statusCode, headers: res.headers, body: res.body };
  };
  return { plugin, httpServer, call, infos };
}

// node:http lowercases header names; the fake harness must do the same, and
// the bridge requires a localhost Host header on every request.
const bearer = (token: string) => ({
  authorization: `Bearer ${token}`,
  host: "127.0.0.1:4174",
});

test("disabled by default and never applied to build or preview", () => {
  vi.stubEnv("RAC_AGENT", "");
  const { plugin } = harness({});
  expect(plugin.apply).toBe("serve");
  expect(
    callHook(plugin.transformIndexHtml, "<html></html>", {
      server: {},
    } as never),
  ).toBe("<html></html>");
});

test("explicitly enabled plugin injects a secret-free bootstrap module", () => {
  const { plugin } = harness({ enabled: true });
  const tags = callHook(plugin.transformIndexHtml, "<html></html>", {
    server: {},
  } as never);
  expect(Array.isArray(tags)).toBe(true);
  const tag = (tags as { children?: string; attrs: Record<string, string> }[])[0];
  expect(tag.attrs.type).toBe("module");
  expect(tag.attrs.src).toBe(`${PREFIX}/bootstrap.js`);
  // No inline script: the served HTML carries no credential at all.
  expect(tag.children).toBeUndefined();
});

test("health answers with the protocol contract for a valid bearer token", async () => {
  const discoveryDir = temp("rac-discovery");
  const { httpServer, call, infos } = harness({
    enabled: true,
    discoveryDir,
  });
  expect(infos).toHaveLength(0); // nothing before listening
  const denied = await call({ method: "GET", path: `${PREFIX}/health` });
  expect(denied.status).toBe(403);
  expect(JSON.parse(denied.body).code).toBe("RAC-DEVTOOLS-AUTH");

  // Listening writes discovery; the harness reads its own token from there.
  httpServer.address = () => ({ address: "127.0.0.1", family: "IPv4", port: 4174 });
  httpServer.emit("listening");
  await vi.waitFor(() => {
    expect(readdirSync(discoveryDir)).toHaveLength(1);
  });
  const file = join(discoveryDir, readdirSync(discoveryDir)[0]);
  const discovery = JSON.parse(
    readFileSync(file, "utf8"),
  ) as Json & { token: string; url: string; serverId: string; pid: number };
  expect(discovery.protocolVersion).toBe(1);
  expect(discovery.url).toBe("http://127.0.0.1:4174");
  expect(discovery.pid).toBe(process.pid);
  expect(statSync(file).mode & 0o777).toBe(0o600);
  expect(discovery.serverId).toBeTruthy();

  const reply = await call({
    method: "GET",
    path: `${PREFIX}/health`,
    headers: bearer(discovery.token),
  });
  expect(reply.status).toBe(200);
  const health = JSON.parse(reply.body) as Json;
  expect(health.status).toBe("ready");
  expect(health.protocolVersion).toBe(1);
  expect(health.serverId).toBe(discovery.serverId);
  expect(health.pages).toEqual([]);
  expect(health.capabilities).not.toContain("eval");
});

test("health exposes eval only with allowEval", async () => {
  const discoveryDir = temp("rac-discovery");
  const { httpServer, call } = harness({
    enabled: true,
    allowEval: true,
    discoveryDir,
  });
  httpServer.address = () => ({ address: "127.0.0.1", family: "IPv4", port: 4174 });
  httpServer.emit("listening");
  await vi.waitFor(() => expect(readdirSync(discoveryDir)).toHaveLength(1));
  const discovery = JSON.parse(
    readFileSync(join(discoveryDir, readdirSync(discoveryDir)[0]), "utf8"),
  ) as { token: string };
  const reply = await call({
    method: "GET",
    path: `${PREFIX}/health`,
    headers: bearer(discovery.token),
  });
  expect(JSON.parse(reply.body).capabilities).toContain("eval");
});

test("bridge rejects bad tokens, foreign origins, foreign hosts and remote peers", async () => {
  const discoveryDir = temp("rac-discovery");
  const { httpServer, call } = harness({ enabled: true, discoveryDir });
  httpServer.address = () => ({ address: "127.0.0.1", family: "IPv4", port: 4174 });
  httpServer.emit("listening");
  await vi.waitFor(() => expect(readdirSync(discoveryDir)).toHaveLength(1));
  const discovery = JSON.parse(
    readFileSync(join(discoveryDir, readdirSync(discoveryDir)[0]), "utf8"),
  ) as { token: string };

  const wrong = await call({
    method: "GET",
    path: `${PREFIX}/health`,
    headers: bearer("not-the-token"),
  });
  expect(wrong.status).toBe(403);
  expect(JSON.parse(wrong.body).code).toBe("RAC-DEVTOOLS-AUTH");

  const foreignOrigin = await call({
    method: "GET",
    path: `${PREFIX}/health`,
    headers: { ...bearer(discovery.token), origin: "http://evil.example" },
  });
  expect(foreignOrigin.status).toBe(403);
  expect(JSON.parse(foreignOrigin.body).code).toBe("RAC-DEVTOOLS-AUTH");

  const foreignHost = await call({
    method: "GET",
    path: `${PREFIX}/health`,
    headers: { authorization: `Bearer ${discovery.token}`, host: "evil.example" },
  });
  expect(foreignHost.status).toBe(403);

  const remote = await call({
    method: "GET",
    path: `${PREFIX}/health`,
    headers: bearer(discovery.token),
    remote: "10.1.2.3",
  });
  expect(remote.status).toBe(403);
});

test("commands and screenshots require an explicit pageId", async () => {
  const discoveryDir = temp("rac-discovery");
  const { httpServer, call } = harness({ enabled: true, discoveryDir });
  httpServer.address = () => ({ address: "127.0.0.1", family: "IPv4", port: 4174 });
  httpServer.emit("listening");
  await vi.waitFor(() => expect(readdirSync(discoveryDir)).toHaveLength(1));
  const discovery = JSON.parse(
    readFileSync(join(discoveryDir, readdirSync(discoveryDir)[0]), "utf8"),
  ) as { token: string };
  const headers = bearer(discovery.token);

  const noPage = await call({
    method: "POST",
    path: `${PREFIX}/command`,
    headers,
    body: { cmd: "click", payload: { ref: "r1" } },
  });
  expect(noPage.status).toBe(400);
  expect(JSON.parse(noPage.body).code).toBe("RAC-DEVTOOLS-INPUT");

  const unknownPage = await call({
    method: "POST",
    path: `${PREFIX}/command`,
    headers,
    body: { pageId: "missing", cmd: "click", payload: { ref: "r1" } },
  });
  expect(unknownPage.status).toBe(409);
  expect(JSON.parse(unknownPage.body).code).toBe("RAC-PAGE-DISCONNECTED");

  const shot = await call({
    method: "GET",
    path: `${PREFIX}/shot`,
    headers,
  });
  expect(shot.status).toBe(400);
  expect(JSON.parse(shot.body).code).toBe("RAC-DEVTOOLS-INPUT");
});

test("connect registers a page; eval stays denied without allowEval", async () => {
  const discoveryDir = temp("rac-discovery");
  const { httpServer, call } = harness({ enabled: true, discoveryDir });
  httpServer.address = () => ({ address: "127.0.0.1", family: "IPv4", port: 4174 });
  httpServer.emit("listening");
  await vi.waitFor(() => expect(readdirSync(discoveryDir)).toHaveLength(1));
  const discovery = JSON.parse(
    readFileSync(join(discoveryDir, readdirSync(discoveryDir)[0]), "utf8"),
  ) as { token: string };
  const headers = bearer(discovery.token);

  const connected = await call({
    method: "POST",
    path: `${PREFIX}/connect`,
    headers,
    body: { title: "Unit", url: "http://127.0.0.1:4174/" },
  });
  expect(connected.status).toBe(200);
  const page = JSON.parse(connected.body) as { pageId: string };
  expect(page.pageId).toBeTruthy();

  const pages = await call({ method: "GET", path: `${PREFIX}/pages`, headers });
  expect(
    (JSON.parse(pages.body) as { pages: { pageId: string }[] }).pages,
  ).toEqual([expect.objectContaining({ pageId: page.pageId, status: "ready" })]);

  const evalDenied = await call({
    method: "POST",
    path: `${PREFIX}/command`,
    headers,
    body: { pageId: page.pageId, cmd: "eval", payload: { code: "1" } },
  });
  expect(evalDenied.status).toBe(409);
  expect(JSON.parse(evalDenied.body).code).toBe("RAC-DEVTOOLS-EVAL");

  const unknown = await call({
    method: "POST",
    path: `${PREFIX}/command`,
    headers,
    body: { pageId: page.pageId, cmd: "zap", payload: {} },
  });
  expect(unknown.status).toBe(400);
  expect(JSON.parse(unknown.body).code).toBe("RAC-DEVTOOLS-INPUT");
});

test("server close removes the discovery file", async () => {
  const discoveryDir = temp("rac-discovery");
  const { httpServer } = harness({ enabled: true, discoveryDir });
  httpServer.address = () => ({ address: "127.0.0.1", family: "IPv4", port: 4174 });
  httpServer.emit("listening");
  await vi.waitFor(() => expect(readdirSync(discoveryDir)).toHaveLength(1));
  httpServer.emit("close");
  await vi.waitFor(() => expect(readdirSync(discoveryDir)).toHaveLength(0));
});

test("closing immediately after listening leaves no discovery file behind", async () => {
  const discoveryDir = temp("rac-discovery");
  const { httpServer } = harness({ enabled: true, discoveryDir });
  httpServer.address = () => ({ address: "127.0.0.1", family: "IPv4", port: 4174 });
  httpServer.emit("listening");
  // Close races the discovery write; cleanup must await it and still unlink.
  httpServer.emit("close");
  await vi.waitFor(() => expect(readdirSync(discoveryDir)).toHaveLength(0));
  await sleep(250);
  expect(readdirSync(discoveryDir)).toHaveLength(0);
});

test("a reused plugin instance serves a fresh session after closeBundle", async () => {
  const discoveryDir = temp("rac-discovery");
  const options = { enabled: true, discoveryDir } as const;
  const first = harness(options);
  first.httpServer.address = () => ({
    address: "127.0.0.1",
    family: "IPv4",
    port: 4174,
  });
  first.httpServer.emit("listening");
  await vi.waitFor(() => expect(readdirSync(discoveryDir)).toHaveLength(1));
  const firstDiscovery = JSON.parse(
    readFileSync(join(discoveryDir, readdirSync(discoveryDir)[0]), "utf8"),
  ) as { token: string; serverId: string };
  const connected = await first.call({
    method: "POST",
    path: `${PREFIX}/connect`,
    headers: bearer(firstDiscovery.token),
    body: { title: "One", url: "http://127.0.0.1:4174/" },
  });
  expect(connected.status).toBe(200);

  await callHook(first.plugin.closeBundle);
  await vi.waitFor(() => expect(readdirSync(discoveryDir)).toHaveLength(0));

  // A restarted dev server reuses the same plugin object but must get fresh
  // registry, token and discovery state.
  const second = harness(options, first.plugin);
  second.httpServer.address = first.httpServer.address;
  second.httpServer.emit("listening");
  await vi.waitFor(() => expect(readdirSync(discoveryDir)).toHaveLength(1));
  const secondDiscovery = JSON.parse(
    readFileSync(join(discoveryDir, readdirSync(discoveryDir)[0]), "utf8"),
  ) as { token: string; serverId: string };
  expect(secondDiscovery.serverId).not.toBe(firstDiscovery.serverId);
  const reconnected = await second.call({
    method: "POST",
    path: `${PREFIX}/connect`,
    headers: bearer(secondDiscovery.token),
    body: { title: "Two", url: "http://127.0.0.1:4174/" },
  });
  expect(reconnected.status).toBe(200);
  // The old session's token no longer opens the new one.
  const stale = await second.call({
    method: "GET",
    path: `${PREFIX}/health`,
    headers: bearer(firstDiscovery.token),
  });
  expect(stale.status).toBe(403);
});
