import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, test } from "vitest";
import { PREFIX } from "../packages/devtools/dist/protocol.js";

// The consumer entry point is the compiled CLI, exactly as published.
const CLI = resolve("packages/devtools/dist/cli.js");
type Json = Record<string, unknown>;

const roots: string[] = [];
const servers: import("node:http").Server[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
  for (const server of servers.splice(0)) server.close();
});

const execFileP = promisify(execFile);

/**
 * Runs the compiled CLI asynchronously: spawnSync would block this test
 * process's event loop, and the fake discovery servers answering the CLI's
 * health checks live in that same loop.
 */
async function rac(args: string[], cwd = tmpdir()) {
  // cwd defaults outside the repo so ambient discovery files never interfere.
  try {
    const { stdout } = await execFileP(process.execPath, [CLI, ...args], {
      cwd,
    });
    return { status: 0, stdout: stdout.trim(), stderr: "" };
  } catch (error) {
    const e = error as { code?: number; stdout?: string; stderr?: string };
    return {
      status: e.code ?? 1,
      stdout: (e.stdout ?? "").trim(),
      stderr: e.stderr ?? "",
    };
  }
}
const json = (value: string) => JSON.parse(value) as Json;

function tempDir() {
  const root = mkdtempSync(join(tmpdir(), "rac-cli-"));
  roots.push(root);
  return root;
}

/** A pid no kernel can issue: above every default pid_max. */
const DEAD_PID = 4194304;

function writeDiscovery(
  dir: string,
  serverId: string,
  url: string,
  token: string,
  overrides: Partial<{ pid: number; name: string; root: string }> = {},
) {
  const path = join(dir, overrides.name ?? `${serverId}.json`);
  writeFileSync(
    path,
    JSON.stringify({
      protocolVersion: 1,
      serverId,
      url,
      token,
      pid: overrides.pid ?? process.pid,
      root: overrides.root ?? "/somewhere",
    }),
  );
  return path;
}

interface FakePage {
  pageId: string;
  title?: string;
  status: "ready" | "offline";
}

/**
 * Fake live agent server: answers /__rac health, pages and inspect from a
 * fixture page list, mirroring the real bridge's page payloads (including
 * connectionId, which the CLI must never echo).
 */
async function fakeServer(
  options: { serverId: string; pages?: FakePage[] },
  handler?: (
    req: IncomingMessage,
    res: ServerResponse,
    pages: () => unknown[],
  ) => void,
): Promise<{ url: string; seen: IncomingMessage[] }> {
  const seen: IncomingMessage[] = [];
  const pages = () =>
    (options.pages ?? []).map((page) => ({
      pageId: page.pageId,
      connectionId: `conn-${page.pageId}`,
      title: page.title ?? `Title ${page.pageId}`,
      url: `http://127.0.0.1:0/${page.pageId}`,
      status: page.status,
    }));
  const server = createServer((req, res) => {
    seen.push(req);
    if (handler?.(req, res, pages)) return;
    res.statusCode = 404;
    res.end(JSON.stringify({ status: "error" }));
  });
  servers.push(server);
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address() as { port: number };
  return { url: `http://127.0.0.1:${address.port}`, seen };
}

const agentRoutes = (
  serverId: string,
  req: IncomingMessage,
  res: ServerResponse,
  pages: () => unknown[],
) => {
  if (req.url?.startsWith(`${PREFIX}/health`)) {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        status: "ready",
        serverId,
        protocolVersion: 1,
        capabilities: ["inspect"],
        pages: pages(),
      }),
    );
    return true;
  }
  if (req.url?.startsWith(`${PREFIX}/pages`)) {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ serverId, pages: pages() }));
    return true;
  }
  if (req.url?.startsWith(`${PREFIX}/inspect`)) {
    const ready = (pages() as { pageId: string; status: string }[]).filter(
      (page) => page.status === "ready",
    );
    if (ready.length > 1) {
      res.statusCode = 409;
      res.end(JSON.stringify({ status: "error", code: "RAC-PAGE-SELECTION" }));
      return true;
    }
    if (ready.length === 0) {
      res.statusCode = 409;
      res.end(JSON.stringify({ status: "error", code: "RAC-PAGE-NONE" }));
      return true;
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        status: "success",
        serverId,
        pageId: ready[0].pageId,
        elements: [],
      }),
    );
    return true;
  }
  return false;
};

test("help --json documents commands, flags and workflow", async () => {
  const result = await rac(["help", "--json"]);
  expect(result.status).toBe(0);
  const help = json(result.stdout);
  expect(help.protocolVersion).toBe(1);
  expect(help.commands).toMatchObject({
    inspect: expect.any(String),
    fill: expect.any(String),
    shot: expect.any(String),
  });
  expect(help.workflow).toEqual(expect.any(Array));
  expect(String(help.enable)).toContain("RAC_AGENT=1");
});

test("unknown commands and wrong arity fail with RAC-DEVTOOLS-INPUT before any discovery", async () => {
  const unknown = await rac(["zap"]);
  expect(unknown.status).toBe(1);
  expect(json(unknown.stdout).code).toBe("RAC-DEVTOOLS-INPUT");
  expect(String(json(unknown.stdout).message)).toContain("Fix:");

  const arity = await rac(["click"]);
  expect(arity.status).toBe(1);
  expect(json(arity.stdout).code).toBe("RAC-DEVTOOLS-INPUT");
});

test("action commands require --page before touching discovery", async () => {
  const result = await rac(["click", "some-ref"]);
  expect(result.status).toBe(1);
  const error = json(result.stdout);
  expect(error.code).toBe("RAC-DEVTOOLS-INPUT");
  expect(String(error.message)).toContain("page ID");
});

test("a stale discovery file yields RAC-SERVER-NONE", async () => {
  const dir = tempDir();
  writeDiscovery(dir, "dead", "http://127.0.0.1:9", randomUUID());
  const result = await rac(["pages", "--discovery-dir", dir]);
  expect(result.status).toBe(1);
  expect(json(result.stdout).code).toBe("RAC-SERVER-NONE");
});

test("discovery files with wrong tokens are skipped, not trusted", async () => {
  const { url, seen } = await fakeServer({ serverId: "liar" }, (req, res) => {
    res.statusCode = 403;
    res.end(JSON.stringify({ status: "error", code: "RAC-DEVTOOLS-AUTH" }));
    void req;
    return true;
  });
  const dir = tempDir();
  writeDiscovery(dir, "liar", url, randomUUID());
  const result = await rac(["pages", "--discovery-dir", dir]);
  expect(result.status).toBe(1);
  expect(json(result.stdout).code).toBe("RAC-SERVER-NONE");
  expect(seen.length).toBeGreaterThanOrEqual(1);
});

test("the only server with a ready page is selected automatically", async () => {
  // Same Vite root, two live dev servers: only one has a connected page.
  const dir = tempDir();
  const idBusy = randomUUID();
  const idIdle = randomUUID();
  const tokenBusy = randomUUID();
  const tokenIdle = randomUUID();
  const busy = await fakeServer(
    {
      serverId: idBusy,
      pages: [{ pageId: "p_ready", title: "Agent Workspace", status: "ready" }],
    },
    (req, res, pages) => agentRoutes(idBusy, req, res, pages),
  );
  const idle = await fakeServer({ serverId: idIdle }, (req, res, pages) =>
    agentRoutes(idIdle, req, res, pages),
  );
  writeDiscovery(dir, idBusy, busy.url, tokenBusy, { root: "/same/root" });
  writeDiscovery(dir, idIdle, idle.url, tokenIdle, { root: "/same/root" });

  const result = await rac(["inspect", "--discovery-dir", dir]);
  expect(result.status).toBe(0);
  const body = json(result.stdout);
  expect(body.status).toBe("success");
  expect(body.serverId).toBe(idBusy);
  expect(body.pageId).toBe("p_ready");
  expect(String(body.note)).toContain("automatically");
  expect(String(body.note)).toContain(idBusy);
  // The idle server was only probed, never inspected.
  expect(idle.seen.every((r) => r.url === `${PREFIX}/health`)).toBe(true);
  expect(busy.seen.some((r) => r.url?.startsWith(`${PREFIX}/inspect`))).toBe(
    true,
  );
  expect(JSON.stringify(body)).not.toContain(tokenBusy);
  expect(JSON.stringify(body)).not.toContain(tokenIdle);
});

test("zero ready pages across servers returns one actionable RAC-PAGE-NONE", async () => {
  const dir = tempDir();
  const ids = [randomUUID(), randomUUID()];
  const urls: string[] = [];
  for (const id of ids) {
    const { url } = await fakeServer(
      {
        serverId: id,
        pages: id === ids[0] ? [{ pageId: "p_old", status: "offline" }] : [],
      },
      (req, res, pages) => agentRoutes(id, req, res, pages),
    );
    urls.push(url);
    writeDiscovery(dir, id, url, randomUUID());
  }

  const result = await rac(["inspect", "--discovery-dir", dir]);
  expect(result.status).toBe(1);
  const error = json(result.stdout);
  expect(error.code).toBe("RAC-PAGE-NONE");
  expect(String(error.problem)).toContain(urls[0]);
  expect(String(error.problem)).toContain(urls[1]);
  expect(String(error.problem)).toContain("ready=0 offline=1");
  expect(String(error.problem)).toContain("ready=0 offline=0");
  const fix = String(error.fix);
  expect(fix).toContain("reverse proxy");
  expect(fix).toContain("RAC_AGENT=1");
  expect(fix).toContain("60 seconds");
});

test("several ready servers return a selection payload with page summaries", async () => {
  const dir = tempDir();
  const ids = [randomUUID(), randomUUID()];
  const tokens = [randomUUID(), randomUUID()];
  const urls: string[] = [];
  for (let i = 0; i < 2; i += 1) {
    const { url } = await fakeServer(
      {
        serverId: ids[i],
        pages: [
          { pageId: `p_${i}_ready`, title: `Workspace ${i}`, status: "ready" },
          { pageId: `p_${i}_old`, status: "offline" },
        ],
      },
      (req, res, pages) => agentRoutes(ids[i], req, res, pages),
    );
    urls.push(url);
    writeDiscovery(dir, ids[i], url, tokens[i]);
  }

  const ambiguous = await rac(["inspect", "--discovery-dir", dir]);
  expect(ambiguous.status).toBe(1);
  const selection = json(ambiguous.stdout);
  expect(selection.code).toBe("RAC-SERVER-SELECTION");
  expect(selection.next).toEqual({
    command: "rac inspect --server <serverId>",
  });
  const listed = selection.servers as Json[];
  expect(listed).toHaveLength(2);
  expect(listed.map((s) => s.serverId).sort()).toEqual([...ids].sort());
  expect(listed.map((s) => s.url).sort()).toEqual([...urls].sort());
  for (const server of listed) {
    expect(server).toMatchObject({ ready: 1, offline: 1 });
    const pages = server.pages as Json[];
    expect(pages.map((p) => p.status)).toEqual(["ready", "offline"]);
    expect(pages[0]).toMatchObject({
      pageId: expect.any(String),
      title: expect.any(String),
      url: expect.any(String),
    });
  }
  const text = JSON.stringify(selection);
  expect(text).not.toContain(tokens[0]);
  expect(text).not.toContain(tokens[1]);
  expect(text).not.toContain("connectionId");

  const picked = await rac([
    "pages",
    "--discovery-dir",
    dir,
    "--server",
    ids[1],
  ]);
  expect(picked.status).toBe(0);
  expect(json(picked.stdout).serverId).toBe(ids[1]);
});

test("rac pages aggregates every discovered server without --server", async () => {
  const dir = tempDir();
  const idLive = randomUUID();
  const idEmpty = randomUUID();
  const idSilent = randomUUID();
  const live = await fakeServer(
    {
      serverId: idLive,
      pages: [
        { pageId: "p_ready", title: "Agent Workspace", status: "ready" },
        { pageId: "p_old", status: "offline" },
      ],
    },
    (req, res, pages) => agentRoutes(idLive, req, res, pages),
  );
  const empty = await fakeServer({ serverId: idEmpty }, (req, res, pages) =>
    agentRoutes(idEmpty, req, res, pages),
  );
  // Alive process, but the health answer never validates: unreachable.
  const silent = await fakeServer({ serverId: idSilent }, (req, res) => {
    res.statusCode = 200;
    res.end(JSON.stringify({ serverId: "someone-else", protocolVersion: 1 }));
    return true;
  });
  writeDiscovery(dir, idLive, live.url, randomUUID());
  writeDiscovery(dir, idEmpty, empty.url, randomUUID());
  writeDiscovery(dir, idSilent, silent.url, randomUUID());

  const result = await rac(["pages", "--discovery-dir", dir]);
  expect(result.status).toBe(0);
  const body = json(result.stdout);
  expect(body.status).toBe("success");
  const servers = body.servers as Json[];
  expect(servers).toHaveLength(3);
  const byId = new Map(servers.map((s) => [String(s.serverId), s]));
  const liveView = byId.get(idLive)!;
  expect(liveView).toMatchObject({ url: live.url, ready: 1, offline: 1 });
  expect((liveView.pages as Json[]).map((p) => p.pageId)).toEqual([
    "p_ready",
    "p_old",
  ]);
  expect(byId.get(idEmpty)).toMatchObject({ ready: 0, offline: 0, pages: [] });
  expect(byId.get(idSilent)).toMatchObject({ unreachable: true, pages: [] });
  expect(JSON.stringify(body)).not.toContain("connectionId");
});

test("dead discovery files are cleaned up while live ones survive", async () => {
  const dir = tempDir();
  const id = randomUUID();
  const { url } = await fakeServer({ serverId: id }, (req, res, pages) =>
    agentRoutes(id, req, res, pages),
  );
  const liveFile = writeDiscovery(dir, id, url, randomUUID());
  const deadFiles = [
    writeDiscovery(dir, randomUUID(), "http://127.0.0.1:9", randomUUID(), {
      pid: DEAD_PID,
    }),
    writeDiscovery(dir, randomUUID(), "http://127.0.0.1:10", randomUUID(), {
      pid: DEAD_PID,
    }),
  ];
  const unrelated = join(dir, "notes.json");
  writeFileSync(unrelated, '{"keep": true}');

  const result = await rac(["pages", "--discovery-dir", dir]);
  expect(result.status).toBe(0);
  expect(json(result.stdout).servers).toHaveLength(1);
  expect(existsSync(liveFile)).toBe(true);
  for (const file of deadFiles) expect(existsSync(file)).toBe(false);
  expect(existsSync(unrelated)).toBe(true);
  expect(readdirSync(dir)).toHaveLength(2);
});

test("a selected server receives the bearer token on page operations", async () => {
  const serverId = randomUUID();
  const token = randomUUID();
  let auth = "";
  const { url } = await fakeServer({ serverId }, (req, res, pages) => {
    auth = req.headers.authorization ?? "";
    return agentRoutes(serverId, req, res, pages);
  });
  const dir = tempDir();
  writeDiscovery(dir, serverId, url, token);

  const result = await rac(["pages", "--discovery-dir", dir]);
  expect(result.status).toBe(0);
  const body = json(result.stdout);
  expect(body.status).toBe("success");
  expect((body.servers as Json[])[0].serverId).toBe(serverId);
  expect(auth).toBe(`Bearer ${token}`);
});

test("explicit --server never drifts to another server", async () => {
  const dir = tempDir();
  const idReady = randomUUID();
  const idIdle = randomUUID();
  const ready = await fakeServer(
    { serverId: idReady, pages: [{ pageId: "p_ready", status: "ready" }] },
    (req, res, pages) => agentRoutes(idReady, req, res, pages),
  );
  const idle = await fakeServer({ serverId: idIdle }, (req, res, pages) =>
    agentRoutes(idIdle, req, res, pages),
  );
  writeDiscovery(dir, idReady, ready.url, randomUUID());
  writeDiscovery(dir, idIdle, idle.url, randomUUID());

  // Pinning the idle server keeps its zero-page result; no silent switch.
  const pinned = await rac([
    "inspect",
    "--discovery-dir",
    dir,
    "--server",
    idIdle,
  ]);
  expect(pinned.status).toBe(1);
  expect(json(pinned.stdout).code).toBe("RAC-PAGE-NONE");
  expect(ready.seen.every((r) => r.url === `${PREFIX}/health`)).toBe(true);
  expect(idle.seen.some((r) => r.url?.startsWith(`${PREFIX}/inspect`))).toBe(
    true,
  );

  const unknown = await rac([
    "inspect",
    "--discovery-dir",
    dir,
    "--server",
    "no-such-server",
  ]);
  expect(unknown.status).toBe(1);
  expect(json(unknown.stdout).code).toBe("RAC-SERVER-NONE");
});

test("health still requires --server while several servers are live", async () => {
  const dir = tempDir();
  const idReady = randomUUID();
  const idIdle = randomUUID();
  const ready = await fakeServer(
    { serverId: idReady, pages: [{ pageId: "p_ready", status: "ready" }] },
    (req, res, pages) => agentRoutes(idReady, req, res, pages),
  );
  const idle = await fakeServer({ serverId: idIdle }, (req, res, pages) =>
    agentRoutes(idIdle, req, res, pages),
  );
  writeDiscovery(dir, idReady, ready.url, randomUUID());
  writeDiscovery(dir, idIdle, idle.url, randomUUID());

  const result = await rac(["health", "--discovery-dir", dir]);
  expect(result.status).toBe(1);
  const selection = json(result.stdout);
  expect(selection.code).toBe("RAC-SERVER-SELECTION");
  expect(selection.servers as Json[]).toHaveLength(2);

  const pinned = await rac([
    "health",
    "--discovery-dir",
    dir,
    "--server",
    idReady,
  ]);
  expect(pinned.status).toBe(0);
  expect(json(pinned.stdout).serverId).toBe(idReady);
});
