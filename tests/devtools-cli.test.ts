import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
  for (const server of servers.splice(0))
    server.close();
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
    const { stdout } = await execFileP(process.execPath, [CLI, ...args], { cwd });
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

function writeDiscovery(dir: string, serverId: string, url: string, token: string) {
  writeFileSync(
    join(dir, `${serverId}.json`),
    JSON.stringify({
      protocolVersion: 1,
      serverId,
      url,
      token,
      pid: process.pid,
      root: "/somewhere",
    }),
  );
}

/** Fake live agent server: checks the bearer token on /__rac routes. */
async function fakeServer(
  handler: (req: IncomingMessage, res: ServerResponse) => void,
): Promise<{ url: string; seen: IncomingMessage[] }> {
  const seen: IncomingMessage[] = [];
  const server = createServer((req, res) => {
    seen.push(req);
    handler(req, res);
  });
  servers.push(server);
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address() as { port: number };
  return { url: `http://127.0.0.1:${address.port}`, seen };
}

const health = (res: ServerResponse, serverId: string) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ status: "ready", serverId, protocolVersion: 1 }));
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
  const { url, seen } = await fakeServer((req, res) => {
    res.statusCode = 403;
    res.end(JSON.stringify({ status: "error", code: "RAC-DEVTOOLS-AUTH" }));
    void req;
  });
  const dir = tempDir();
  writeDiscovery(dir, "liar", url, randomUUID());
  const result = await rac(["pages", "--discovery-dir", dir]);
  expect(result.status).toBe(1);
  expect(json(result.stdout).code).toBe("RAC-SERVER-NONE");
  expect(seen.length).toBeGreaterThanOrEqual(1);
});

test("several live servers ask for --server and never print tokens", async () => {
  const dir = tempDir();
  const ids = [randomUUID(), randomUUID()];
  const tokens = [randomUUID(), randomUUID()];
  for (let i = 0; i < 2; i += 1) {
    const { url } = await fakeServer((req, res) => {
      if (req.url === `${PREFIX}/health`) {
        health(res, ids[i]);
        return;
      }
      res.statusCode = 200;
      res.end(JSON.stringify({ serverId: ids[i], pages: [] }));
    });
    writeDiscovery(dir, ids[i], url, tokens[i]);
  }

  const ambiguous = await rac(["pages", "--discovery-dir", dir]);
  expect(ambiguous.status).toBe(1);
  const selection = json(ambiguous.stdout);
  expect(selection.code).toBe("RAC-SERVER-SELECTION");
  const listed = selection.servers as { serverId: string; url: string }[];
  expect(listed).toHaveLength(2);
  expect(JSON.stringify(selection)).not.toContain(tokens[0]);
  expect(JSON.stringify(selection)).not.toContain(tokens[1]);

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

test("a selected server receives the bearer token on page operations", async () => {
  const serverId = randomUUID();
  const token = randomUUID();
  let auth = "";
  const { url } = await fakeServer((req, res) => {
    auth = req.headers.authorization ?? "";
    if (req.url === `${PREFIX}/health`) {
      health(res, serverId);
      return;
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ serverId, pages: [], ok: true }));
  });
  const dir = tempDir();
  writeDiscovery(dir, serverId, url, token);

  const result = await rac(["pages", "--discovery-dir", dir]);
  expect(result.status).toBe(0);
  expect(json(result.stdout).serverId).toBe(serverId);
  expect(auth).toBe(`Bearer ${token}`);
});
