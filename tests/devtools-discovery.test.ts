import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";
// Server discovery and the shared selection rules behind the CLI's
// multi-server behavior. Probes are injected so no real HTTP is needed.
import {
  chooseServer,
  discoveryDirs,
  pageNone,
  parseDiscovery,
  processDead,
  publicSummary,
  scanServers,
  selectionPayload,
  type Probe,
  type ServerSummary,
} from "../packages/devtools/src/discovery";
import { RacError } from "../packages/devtools/src/errors";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});
const tempDir = () => {
  const root = mkdtempSync(join(tmpdir(), "rac-discovery-"));
  roots.push(root);
  return root;
};

/** A pid no kernel can issue: above every default pid_max. */
const DEAD_PID = 4194304;

function writeDiscovery(
  dir: string,
  overrides: Partial<{
    serverId: string;
    url: string;
    token: string;
    pid: number;
    name: string;
    root: string;
  }> = {},
) {
  const entry = {
    protocolVersion: 1,
    serverId: overrides.serverId ?? "s1",
    url: overrides.url ?? "http://127.0.0.1:5173",
    token: overrides.token ?? "secret-token",
    pid: overrides.pid ?? process.pid,
    root: overrides.root ?? "/somewhere",
  };
  const name = overrides.name ?? `${entry.serverId}.json`;
  writeFileSync(join(dir, name), JSON.stringify(entry));
  return { ...entry, file: join(dir, name) };
}

const pages = (...items: { pageId: string; status: "ready" | "offline" }[]) =>
  items.map((item) => ({
    pageId: item.pageId,
    connectionId: "conn-must-not-leak",
    title: `Title ${item.pageId}`,
    url: `http://127.0.0.1:5173/${item.pageId}`,
    status: item.status,
  }));

function summary(overrides: Partial<ServerSummary> = {}): ServerSummary {
  const pages = overrides.pages ?? [];
  return {
    serverId: overrides.serverId ?? "s1",
    url: overrides.url ?? "http://127.0.0.1:5173",
    root: overrides.root ?? "/somewhere",
    token: overrides.token ?? "secret-token",
    file: overrides.file ?? "/tmp/s1.json",
    ready: pages.filter((p) => p.status === "ready").length,
    offline: pages.filter((p) => p.status === "offline").length,
    pages,
    ...overrides,
  };
}

test("parseDiscovery accepts plugin files and rejects everything else", () => {
  const valid = {
    protocolVersion: 1,
    serverId: "s1",
    url: "http://127.0.0.1:5173",
    token: "t",
    pid: 1,
    root: "/r",
  };
  expect(parseDiscovery(valid)).toEqual(valid);
  expect(
    parseDiscovery({ ...valid, url: "http://example.com:5173" }),
  ).toBeNull();
  expect(parseDiscovery({ ...valid, url: "not a url" })).toBeNull();
  expect(parseDiscovery({ ...valid, token: 5 })).toBeNull();
  expect(parseDiscovery({ ...valid, serverId: 5 })).toBeNull();
  expect(parseDiscovery({ ...valid, pid: "5" })).toBeNull();
  expect(parseDiscovery({ ...valid, root: 5 })).toBeNull();
  expect(parseDiscovery(null)).toBeNull();
  expect(parseDiscovery([])).toBeNull();
});

test("processDead only reports provably gone pids", () => {
  expect(processDead(process.pid)).toBe(false);
  expect(processDead(DEAD_PID)).toBe(true);
  expect(processDead(0)).toBe(true);
  expect(processDead(-1)).toBe(true);
  expect(processDead(Number.NaN)).toBe(true);
});

test("discoveryDirs uses the explicit directory or walks up from cwd", () => {
  expect(discoveryDirs("/a/b", "/explicit/dir")).toEqual(["/explicit/dir"]);
  const dirs = discoveryDirs("/a/b/c");
  expect(dirs).toEqual([
    "/a/b/c/.rac/servers",
    "/a/b/.rac/servers",
    "/a/.rac/servers",
    "/.rac/servers",
  ]);
});

describe("chooseServer", () => {
  test("page mode auto-selects the only server with a ready page", () => {
    const ready = summary({ serverId: "a", ready: 1 });
    const idle = summary({ serverId: "b", ready: 0, offline: 2 });
    expect(chooseServer([ready, idle], "page")).toEqual({
      kind: "selected",
      server: ready,
      auto: true,
    });
    // The single-server case keeps working without a note-worthy selection.
    expect(chooseServer([ready], "page").kind).toBe("selected");
  });

  test("page mode with no ready page anywhere asks for a page, not a server", () => {
    const servers = [
      summary({ serverId: "a", url: "http://127.0.0.1:18174", offline: 3 }),
      summary({ serverId: "b", url: "http://127.0.0.1:5174", offline: 1 }),
    ];
    const choice = chooseServer(servers, "page");
    expect(choice).toEqual({ kind: "page-none" });
    const error = pageNone(servers);
    expect(error).toBeInstanceOf(RacError);
    expect(error.code).toBe("RAC-PAGE-NONE");
    expect(error.problem).toContain("http://127.0.0.1:18174 ready=0 offline=3");
    expect(error.problem).toContain("http://127.0.0.1:5174 ready=0 offline=1");
    expect(error.fix).toContain("RAC_AGENT=1");
    expect(error.fix).toContain("60 seconds");
  });

  test("page mode with several ready servers returns server-selection", () => {
    const a = summary({ serverId: "a", ready: 2 });
    const b = summary({ serverId: "b", ready: 1 });
    expect(chooseServer([a, b], "page")).toEqual({ kind: "server-selection" });
  });

  test("explicit --server never drifts, matches or fails cleanly", () => {
    const a = summary({ serverId: "a", ready: 1 });
    const b = summary({ serverId: "b", ready: 3 });
    expect(chooseServer([a, b], "page", "b")).toEqual({
      kind: "selected",
      server: b,
      auto: false,
    });
    // The explicit server is used even when another one has ready pages.
    const pinnedToIdle = chooseServer([a, b], "page", "a");
    expect(pinnedToIdle.kind).toBe("selected");
    if (pinnedToIdle.kind === "selected")
      expect(pinnedToIdle.server.serverId).toBe("a");
    expect(chooseServer([a, b], "page", "missing").kind).toBe("server-none");
    expect(chooseServer([], "page", "missing").kind).toBe("server-none");
  });

  test("health keeps requiring --server while several are live", () => {
    const a = summary({ serverId: "a", ready: 1 });
    const b = summary({ serverId: "b", ready: 0 });
    expect(chooseServer([a, b], "health").kind).toBe("server-selection");
    expect(chooseServer([a], "health")).toEqual({
      kind: "selected",
      server: a,
      auto: false,
    });
  });

  test("open creates pages and never reports page-none", () => {
    const a = summary({ serverId: "a", ready: 0 });
    const b = summary({ serverId: "b", ready: 0 });
    expect(chooseServer([a], "open").kind).toBe("selected");
    expect(chooseServer([a, b], "open").kind).toBe("server-selection");
    expect(chooseServer([], "open").kind).toBe("server-none");
    const ready = summary({ serverId: "c", ready: 1 });
    expect(chooseServer([ready, b], "open")).toEqual({
      kind: "selected",
      server: ready,
      auto: true,
    });
  });
});

test("selectionPayload lists live servers ready-first with safe page summaries", () => {
  const payload = selectionPayload([
    summary({
      serverId: "idle",
      url: "http://127.0.0.1:18174",
      ready: 0,
      offline: 2,
      pages: pages({ pageId: "p_off", status: "offline" }),
    }),
    summary({
      serverId: "busy",
      url: "http://127.0.0.1:5174",
      token: "top-secret-token",
      ready: 1,
      pages: [
        ...pages({ pageId: "p_off2", status: "offline" }),
        ...pages({ pageId: "p_ready", status: "ready" }),
      ],
    }),
  ]);
  expect(payload.status).toBe("selection_required");
  expect(payload.code).toBe("RAC-SERVER-SELECTION");
  expect(payload.next).toEqual({ command: "rac inspect --server <serverId>" });
  expect(payload.servers.map((s: { serverId: string }) => s.serverId)).toEqual([
    "busy",
    "idle",
  ]);
  const busy = payload.servers[0];
  expect(busy).toMatchObject({ ready: 1, offline: 1 });
  // Ready pages first, and no private fields anywhere.
  expect(busy.pages.map((p: { pageId: string }) => p.pageId)).toEqual([
    "p_ready",
    "p_off2",
  ]);
  const text = JSON.stringify(payload);
  expect(text).not.toContain("top-secret-token");
  expect(text).not.toContain("connectionId");
});

test("publicSummary flags unreachable servers and keeps their counts", () => {
  const view = publicSummary(
    summary({ unreachable: true, serverId: "u", ready: 0, offline: 0 }),
  );
  expect(view.unreachable).toBe(true);
  expect(view.pages).toEqual([]);
  expect(publicSummary(summary({ serverId: "v" })).unreachable).toBeUndefined();
});

describe("scanServers", () => {
  type Behavior = "refused" | "unreachable" | { pages: unknown[] };
  const probeFor =
    (behavior: Record<string, Behavior>): Probe =>
    async (entry) => {
      const action = behavior[entry.serverId] ?? "unreachable";
      if (action === "refused") return { kind: "refused" };
      if (action === "unreachable") return { kind: "unreachable" };
      return { kind: "ready", pages: action.pages };
    };

  test("deletes only owned discovery files of dead processes", async () => {
    const dir = tempDir();
    const live = writeDiscovery(dir, { serverId: "live" });
    writeDiscovery(dir, { serverId: "dead1", pid: DEAD_PID });
    writeDiscovery(dir, { serverId: "dead2", pid: DEAD_PID });
    // Wrong file name: not provably written by this tool, so it stays.
    writeDiscovery(dir, {
      serverId: "odd",
      pid: DEAD_PID,
      name: "not-a-serverid.json",
    });
    // Unrelated JSON content is ignored untouched.
    writeFileSync(join(dir, "notes.json"), '{"hello": 1}');

    const summaries = await scanServers(
      [dir],
      probeFor({ live: { pages: [] }, odd: "unreachable" }),
    );
    // The unowned file is not deleted, but it is still probed and reported
    // as unreachable rather than silently trusted.
    expect(summaries.map((s) => s.serverId).sort()).toEqual(["live", "odd"]);
    expect(summaries.find((s) => s.serverId === "odd")!.unreachable).toBe(true);
    expect(existsSync(live.file)).toBe(true);
    expect(existsSync(join(dir, "dead1.json"))).toBe(false);
    expect(existsSync(join(dir, "dead2.json"))).toBe(false);
    expect(existsSync(join(dir, "not-a-serverid.json"))).toBe(true);
    expect(existsSync(join(dir, "notes.json"))).toBe(true);
  });

  test("removes entries whose port refuses connections, marks others unreachable", async () => {
    const dir = tempDir();
    const refused = writeDiscovery(dir, {
      serverId: "refused",
      url: "http://127.0.0.1:9",
    });
    const hung = writeDiscovery(dir, { serverId: "hung" });
    const ok = writeDiscovery(dir, {
      serverId: "ok",
      url: "http://127.0.0.1:5174",
    });
    const summaries = await scanServers(
      [dir],
      probeFor({
        refused: "refused",
        hung: "unreachable",
        ok: { pages: pages({ pageId: "p1", status: "ready" }) },
      }),
    );
    expect(existsSync(refused.file)).toBe(false);
    expect(existsSync(hung.file)).toBe(true);
    expect(summaries).toHaveLength(2);
    const unreachable = summaries.find((s) => s.serverId === "hung")!;
    expect(unreachable.unreachable).toBe(true);
    expect(unreachable.ready).toBe(0);
    const reachable = summaries.find((s) => s.serverId === "ok")!;
    expect(reachable.ready).toBe(1);
    // connectionId never crosses into the summary.
    expect(JSON.stringify(reachable.pages)).not.toContain("conn-must-not-leak");
    expect(existsSync(ok.file)).toBe(true);
  });

  test("missing directories and unreadable files are skipped", async () => {
    const dir = tempDir();
    const summaries = await scanServers([join(dir, "nope")], probeFor({}));
    expect(summaries).toEqual([]);
    const dir2 = tempDir();
    writeFileSync(join(dir2, "broken.json"), "{ not json");
    writeFileSync(
      join(dir2, "hostile.json"),
      JSON.stringify({ url: "http://127.0.0.1:1" }),
    );
    expect(await scanServers([dir2], probeFor({}))).toEqual([]);
    expect(readdirSync(dir2)).toHaveLength(2);
  });

  test("deduplicates the same serverId across directories", async () => {
    const dirA = tempDir();
    const dirB = tempDir();
    writeDiscovery(dirA, { serverId: "dup", url: "http://127.0.0.1:1" });
    writeDiscovery(dirB, { serverId: "dup", url: "http://127.0.0.1:1" });
    const seen: string[] = [];
    const summaries = await scanServers([dirA, dirB], async (entry) => {
      seen.push(entry.serverId);
      return { kind: "ready", pages: [] };
    });
    expect(summaries).toHaveLength(1);
    expect(seen).toEqual(["dup"]);
    // Both files survive: only the scan view deduplicates.
    expect(readdirSync(dirA)).toHaveLength(1);
    expect(readdirSync(dirB)).toHaveLength(1);
    expect(readFileSync(summaries[0].file, "utf8")).toContain('"dup"');
  });
});
