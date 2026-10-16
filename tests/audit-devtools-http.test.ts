import { EventEmitter } from "node:events";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test, vi } from "vitest";
// HTTP-contract audit regressions, run against the built plugin like
// devtools-http.test.ts.
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

type Handler = (
  req: unknown,
  res: unknown,
  next: () => void,
) => Promise<void> | void;
interface ViteMiddlewares {
  use: (fn: Handler) => void;
}

interface FakeResponse extends EventEmitter {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  end: (value?: string) => void;
  setHeader: (name: string, value: string) => void;
}

function makeResponse(): FakeResponse {
  const res = new EventEmitter() as FakeResponse;
  res.statusCode = 0;
  res.headers = {};
  res.body = "";
  res.end = (value?: string) => {
    res.body = value ?? "";
    res.emit("finish");
  };
  res.setHeader = (name: string, value: string) => {
    res.headers[name] = value;
  };
  return res;
}

function harness(options: Parameters<typeof reactAutoComponentsDevtools>[0]) {
  const plugin = reactAutoComponentsDevtools(options);
  let handler: Handler | undefined;
  const httpServer = new EventEmitter() as EventEmitter & {
    address?: () => { address: string; family: string; port: number };
  };
  const hook = plugin.configureServer as
    ((context: unknown) => void) | { handler: (context: unknown) => void };
  const configure = typeof hook === "function" ? hook : hook.handler;
  configure({
    config: {
      root: temp("rac-audit-root"),
      server: {},
      logger: { info: () => {}, error: () => {} },
    },
    httpServer,
    middlewares: { use: (fn: Handler) => (handler = fn) } as ViteMiddlewares,
  });
  // Every response is kept so tests can emit socket-level events on it.
  const responses: FakeResponse[] = [];
  const call = async (request: {
    method: string;
    path: string;
    headers?: Record<string, string>;
    body?: Json | string;
  }): Promise<Reply> => {
    const res = makeResponse();
    responses.push(res);
    const raw =
      request.body === undefined
        ? ""
        : typeof request.body === "string"
          ? request.body
          : JSON.stringify(request.body);
    const done = new Promise<void>((resolve) => {
      res.once("finish", () => resolve());
      // A torn-down connection never reaches finish; still settle the call.
      res.once("close", () => resolve());
    });
    await handler!(
      {
        method: request.method,
        url: request.path,
        headers: request.headers ?? {},
        socket: { remoteAddress: "127.0.0.1" },
        async *[Symbol.asyncIterator]() {
          if (raw) yield raw;
        },
      } as never,
      res as never,
      () => {
        throw new Error("middleware should always answer /__rac requests");
      },
    );
    await done;
    return { status: res.statusCode, body: res.body };
  };
  return { plugin, httpServer, call, responses };
}

interface Reply {
  status: number;
  body: string;
}

/** Boots an enabled plugin and returns authenticated calls + live responses. */
async function session() {
  const discoveryDir = temp("rac-audit-discovery");
  const { httpServer, call, responses } = harness({
    enabled: true,
    discoveryDir,
  });
  httpServer.address = () => ({
    address: "127.0.0.1",
    family: "IPv4",
    port: 4174,
  });
  httpServer.emit("listening");
  await vi.waitFor(() => expect(readdirSync(discoveryDir)).toHaveLength(1));
  const discovery = JSON.parse(
    readFileSync(join(discoveryDir, readdirSync(discoveryDir)[0]), "utf8"),
  ) as { token: string };
  const headers = {
    authorization: `Bearer ${discovery.token}`,
    host: "127.0.0.1:4174",
  };
  return { call, headers, responses };
}

async function connectPage(
  call: ReturnType<typeof harness>["call"],
  headers: Record<string, string>,
  title: string,
) {
  const connected = await call({
    method: "POST",
    path: `${PREFIX}/connect`,
    headers,
    body: { title, url: "http://127.0.0.1:4174/" },
  });
  expect(connected.status).toBe(200);
  return JSON.parse(connected.body) as {
    pageId: string;
    connectionId: string;
  };
}

test("command results larger than the CLI input bound are accepted", async () => {
  const { call, headers } = await session();
  const page = await connectPage(call, headers, "Audit");

  // The command stays pending while the page polls and answers.
  const issued = call({
    method: "POST",
    path: `${PREFIX}/command`,
    headers,
    body: { pageId: page.pageId, cmd: "console", payload: {} },
  });

  const parked = await call({
    method: "POST",
    path: `${PREFIX}/poll`,
    headers,
    body: { pageId: page.pageId, connectionId: page.connectionId },
  });
  const commandId = (JSON.parse(parked.body) as { id: string }).id;
  expect(commandId).toBeTruthy();

  // A 200 KiB result: above the 64 KiB CLI input bound, below the result bound.
  const delivered = await call({
    method: "POST",
    path: `${PREFIX}/result`,
    headers,
    body: {
      pageId: page.pageId,
      connectionId: page.connectionId,
      result: { id: commandId, ok: true, data: "x".repeat(200 * 1024) },
    },
  });
  expect(delivered.status, delivered.body).toBe(200);
  await expect(issued).resolves.toMatchObject({ status: 200 });
});

test("an aborted long poll frees its waiter and later commands still deliver", async () => {
  const { call, headers, responses } = await session();
  const page = await connectPage(call, headers, "Audit2");

  // Park a long poll whose response can be torn down like a real socket.
  const parked = call({
    method: "POST",
    path: `${PREFIX}/poll`,
    headers,
    body: { pageId: page.pageId, connectionId: page.connectionId },
  });
  // Give the handler time to reach the parked registry poll.
  await new Promise((resolve) => setTimeout(resolve, 100));
  const pollResponse = responses[responses.length - 1];

  // Simulate the client's connection dropping mid-poll.
  pollResponse.emit("close");

  // The waiter resolves promptly instead of hanging for the 20s deadline.
  await expect(
    Promise.race([
      parked.then((r) => JSON.parse(r.body) as Json),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("poll not freed after close")), 1000),
      ),
    ]),
  ).resolves.toBeNull();

  // The page lease survives the transient abort.
  const pages = await call({
    method: "GET",
    path: `${PREFIX}/pages`,
    headers,
  });
  expect(
    (JSON.parse(pages.body) as { pages: { pageId: string; status: string }[] })
      .pages,
  ).toEqual([
    expect.objectContaining({ pageId: page.pageId, status: "ready" }),
  ]);

  // A command issued while the client is between polls is delivered on the
  // next poll instead of being written into the closed response.
  const pending = call({
    method: "POST",
    path: `${PREFIX}/command`,
    headers,
    body: { pageId: page.pageId, cmd: "console", payload: {} },
  });
  const next = await call({
    method: "POST",
    path: `${PREFIX}/poll`,
    headers,
    body: { pageId: page.pageId, connectionId: page.connectionId },
  });
  const delivered = JSON.parse(next.body) as { id: string; cmd: string };
  expect(delivered.cmd).toBe("console");
  const ack = await call({
    method: "POST",
    path: `${PREFIX}/result`,
    headers,
    body: {
      pageId: page.pageId,
      connectionId: page.connectionId,
      result: { id: delivered.id, ok: true, data: null },
    },
  });
  expect(ack.status).toBe(200);
  const pendingReply = await pending;
  expect(pendingReply, pendingReply.body).toMatchObject({ status: 200 });
});
