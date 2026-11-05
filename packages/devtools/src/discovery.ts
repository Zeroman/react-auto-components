import { readFile, readdir, unlink } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { PREFIX, PROTOCOL_VERSION, type Discovery } from "./protocol.js";
import { RacError } from "./errors.js";

/**
 * Server selection shared by the CLI commands. Discovery files are private
 * (they carry the bridge token); every value derived here that is printed by
 * the CLI goes through `publicSummary`, which keeps the credential out.
 */
export interface PageSummary {
  pageId: string;
  title: string;
  url: string;
  status: "ready" | "offline";
}

export interface ServerSummary {
  serverId: string;
  url: string;
  root: string;
  /** Private bridge credential: used for requests, never printed. */
  token: string;
  /** Discovery file this entry came from. */
  file: string;
  ready: number;
  offline: number;
  pages: PageSummary[];
  /**
   * Set when the health probe failed although the owning process stays
   * alive (timeout, restarted token, mismatched identity). Such servers
   * expose no pages and are never auto-selected.
   */
  unreachable?: true;
}

export interface ScannedFile {
  path: string;
  entry: Discovery;
}

export type ProbeResult =
  | { kind: "ready"; pages: unknown[] }
  /** Nothing is listening on the port: the entry can never work again. */
  | { kind: "refused" }
  /** The probe failed without a definitive verdict; keep the file. */
  | { kind: "unreachable" };

export type Probe = (entry: Discovery) => Promise<ProbeResult>;

/** Directories that may hold discovery files: explicit one, or cwd + ancestors. */
export function discoveryDirs(cwd: string, explicit?: string): string[] {
  if (explicit) return [resolve(explicit)];
  const dirs: string[] = [];
  let current = resolve(cwd);
  while (true) {
    dirs.push(join(current, ".rac/servers"));
    const parent = dirname(current);
    if (current === parent) break;
    current = parent;
  }
  return dirs;
}

/** Validates the discovery file shape the plugin writes; anything else is ignored. */
export function parseDiscovery(value: unknown): Discovery | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entry = value as Record<string, unknown>;
  if (
    typeof entry.token !== "string" ||
    typeof entry.serverId !== "string" ||
    typeof entry.pid !== "number" ||
    !Number.isFinite(entry.pid)
  )
    return null;
  try {
    const url = new URL(String(entry.url));
    if (
      !["http:", "https:"].includes(url.protocol) ||
      !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
    )
      return null;
  } catch {
    return null;
  }
  if (entry.root !== undefined && typeof entry.root !== "string") return null;
  return value as Discovery;
}

/** True only when the pid is provably gone (EPERM means alive but foreign). */
export function processDead(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return true;
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ESRCH";
  }
}

/** Only files this tool wrote are eligible for cleanup: `<serverId>.json`. */
function owned(path: string, serverId: string) {
  return (path.split(/[\\/]/).pop() ?? "") === `${serverId}.json`;
}

/** Best-effort removal; concurrent cleaners racing on ENOENT are fine. */
async function remove(path: string) {
  await unlink(path).catch(() => {});
}

/** Default probe: the bridge health route already carries the page list. */
export const httpProbe: Probe = async (entry) => {
  try {
    const response = await fetch(`${entry.url}${PREFIX}/health`, {
      headers: { Authorization: `Bearer ${entry.token}` },
      signal: AbortSignal.timeout(1500),
      redirect: "error",
    });
    if (!response.ok) return { kind: "unreachable" };
    const health = (await response.json()) as {
      serverId?: string;
      protocolVersion?: number;
      pages?: unknown;
    };
    if (
      health.serverId !== entry.serverId ||
      health.protocolVersion !== PROTOCOL_VERSION
    )
      return { kind: "unreachable" };
    return {
      kind: "ready",
      pages: Array.isArray(health.pages) ? health.pages : [],
    };
  } catch (error) {
    const code = (error as { cause?: { code?: string } })?.cause?.code;
    return code === "ECONNREFUSED"
      ? { kind: "refused" }
      : { kind: "unreachable" };
  }
};

function summarizePages(value: unknown): PageSummary[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((page) => {
    if (!page || typeof page !== "object") return [];
    const { pageId, title, url, status } = page as Record<string, unknown>;
    if (
      typeof pageId !== "string" ||
      typeof title !== "string" ||
      typeof url !== "string"
    )
      return [];
    if (status !== "ready" && status !== "offline") return [];
    // connectionId and any queue state stay server-side.
    return [{ pageId, title, url, status }];
  });
}

/**
 * Enumerate discovery directories, drop provably dead entries (their owning
 * process is gone or nothing listens on the port any more) and probe the
 * remaining servers for identity plus a page summary. One bad server never
 * blocks the others, and probes run concurrently so a hanging server cannot
 * serialize the whole scan behind its timeout.
 */
export async function scanServers(
  dirs: string[],
  probe: Probe = httpProbe,
): Promise<ServerSummary[]> {
  const scanned: ScannedFile[] = [];
  for (const dir of dirs) {
    const names = (await readdir(dir).catch(() => [] as string[]))
      .filter((name) => name.endsWith(".json"))
      .sort();
    for (const name of names) {
      const path = join(dir, name);
      let entry: Discovery | null = null;
      try {
        entry = parseDiscovery(JSON.parse(await readFile(path, "utf8")));
      } catch {
        entry = null;
      }
      if (!entry) continue;
      if (owned(path, entry.serverId) && processDead(entry.pid)) {
        await remove(path);
        continue;
      }
      if (!scanned.some((s) => s.entry.serverId === entry!.serverId))
        scanned.push({ path, entry });
    }
  }
  const probed = await Promise.all(
    scanned.map(async (file) => ({ file, result: await probe(file.entry) })),
  );
  const summaries: ServerSummary[] = [];
  for (const { file, result } of probed) {
    if (result.kind === "refused") {
      if (owned(file.path, file.entry.serverId)) await remove(file.path);
      continue;
    }
    if (summaries.some((s) => s.serverId === file.entry.serverId)) continue;
    const pages = summarizePages(result.kind === "ready" ? result.pages : []);
    summaries.push({
      serverId: file.entry.serverId,
      url: file.entry.url,
      root: file.entry.root,
      token: file.entry.token,
      file: file.path,
      ready: pages.filter((p) => p.status === "ready").length,
      offline: pages.filter((p) => p.status === "offline").length,
      pages,
      ...(result.kind === "unreachable" ? { unreachable: true as const } : {}),
    });
  }
  return summaries;
}

export type ServerChoice =
  | { kind: "selected"; server: ServerSummary; auto: boolean }
  | { kind: "server-none" }
  | { kind: "server-selection" }
  | { kind: "page-none" };

/**
 * Central selection rule set, evaluated in order:
 * 1. exactly one live server has ready pages → select it (no `--server`),
 * 2. none has → one actionable `RAC-PAGE-NONE` across all live servers,
 * 3. several have → `RAC-SERVER-SELECTION` with page summaries.
 * `mode` carves out the exceptions: `health` reports one server's
 * capabilities and keeps requiring `--server` while several are live; `open`
 * creates a page, so it never reports "no pages". An explicit `--server`
 * never drifts, silently or otherwise.
 */
export function chooseServer(
  live: ServerSummary[],
  mode: "page" | "open" | "health",
  explicit?: string,
): ServerChoice {
  if (explicit) {
    const server = live.find((s) => s.serverId === explicit);
    return server
      ? { kind: "selected", server, auto: false }
      : { kind: "server-none" };
  }
  if (!live.length) return { kind: "server-none" };
  if (mode === "health")
    return live.length === 1
      ? { kind: "selected", server: live[0], auto: false }
      : { kind: "server-selection" };
  const withReady = live.filter((s) => s.ready > 0);
  if (mode === "open" && live.length === 1)
    return { kind: "selected", server: live[0], auto: false };
  if (withReady.length === 1)
    return { kind: "selected", server: withReady[0], auto: true };
  if (withReady.length === 0)
    return mode === "open"
      ? { kind: "server-selection" }
      : { kind: "page-none" };
  return { kind: "server-selection" };
}

/** Printable form: pageId/title/url/status only — no token, no connectionId. */
export function publicSummary(server: ServerSummary) {
  return {
    serverId: server.serverId,
    url: server.url,
    root: server.root,
    ready: server.ready,
    offline: server.offline,
    pages: [...server.pages]
      .sort((a, b) =>
        a.status === b.status ? 0 : a.status === "ready" ? -1 : 1,
      )
      .map(({ pageId, title, url, status }) => ({
        pageId,
        title,
        url,
        status,
      })),
    ...(server.unreachable ? { unreachable: true as const } : {}),
  };
}

/** `RAC-SERVER-SELECTION` payload: live servers only, ready first. */
export function selectionPayload(live: ServerSummary[]) {
  return {
    status: "selection_required" as const,
    code: "RAC-SERVER-SELECTION",
    servers: [...live]
      .sort((a, b) => b.ready - a.ready || a.url.localeCompare(b.url))
      .map(publicSummary),
    next: { command: "rac inspect --server <serverId>" },
    fix: "Pass --server <serverId> from this list.",
  };
}

/** One actionable error when no live server has a connected page. */
export function pageNone(live: ServerSummary[]): RacError {
  const detail = live
    .map((s) => `${s.url} ready=${s.ready} offline=${s.offline}`)
    .join("; ");
  return new RacError(
    "RAC-PAGE-NONE",
    `All live development servers report no connected pages: ${detail}.`,
    "Open the app at the server's own localhost URL (pages opened through a reverse proxy or unified entry are cross-origin and cannot register), start the dev server with RAC_AGENT=1 (a plain npm run dev keeps the bridge off), and note that closed tabs or pages silent for 60 seconds count as offline. Run rac open (with --server <serverId> when several are live) to create a page.",
  );
}
