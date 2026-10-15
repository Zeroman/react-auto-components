#!/usr/bin/env node
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { RacError, failure } from "./errors.js";
import { PROTOCOL_VERSION, PREFIX, type Discovery } from "./protocol.js";

const commandHelp = {
  inspect:
    "inspect [--page ID]: discover pages or inspect one page's current refs and capabilities",
  pages:
    "pages: list registered pages with titles, URLs and ready/offline status",
  health: "health: report protocol and server capabilities",
  open: "open [--headless]: create a managed page on this project's development server",
  goto: "goto <route> --page ID: navigate using AutoNavigationProvider",
  replace:
    "replace <route> --page ID: replace the current RAC navigation entry",
  state: "state --page ID: read the RAC navigation state",
  params: "params '<JSON object>' --page ID: update navigation parameters",
  click: "click <ref> --page ID: click one visible, enabled element",
  fill: "fill <ref> <value> --page ID: fill an editable field using native input/change events",
  dom: "dom <ref> --page ID: read current text and visibility",
  wait: "wait <ref> --page ID [--timeout MS]: wait for a known element to become visible",
  submit:
    "submit <form-ref> --page ID: perform native validation and normal form submission",
  validate: "validate <form-ref> --page ID: check native HTML form validity",
  console:
    "console --page ID: read the last 30 warning/error events from this page",
  shot: "shot --page ID [--out FILE] [--full]: capture that exact managed/CDP-connected page",
  eval: "eval <JavaScript> --page ID: opt-in evaluation; requires allowEval: true",
};
function output(value: unknown) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
function invalid(message: string): never {
  throw new RacError(
    "RAC-DEVTOOLS-INPUT",
    message,
    "Run rac help --json and use the documented arguments. Use -- before positional values beginning with a dash.",
  );
}
async function discover(directory?: string): Promise<Discovery[]> {
  const dirs: string[] = [];
  if (directory) dirs.push(resolve(directory));
  else {
    let current = process.cwd();
    while (true) {
      dirs.push(join(current, ".rac/servers"));
      const parent = dirname(current);
      if (current === parent) break;
      current = parent;
    }
  }
  const candidates: Discovery[] = [];
  for (const dir of dirs) {
    const files = await readdir(dir).catch(() => []);
    for (const name of files.filter((name) => name.endsWith(".json"))) {
      try {
        const entry = JSON.parse(
          await readFile(join(dir, name), "utf8"),
        ) as Discovery;
        const url = new URL(entry.url);
        if (
          !["http:", "https:"].includes(url.protocol) ||
          !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
          typeof entry.token !== "string" ||
          typeof entry.serverId !== "string"
        )
          continue;
        const response = await fetch(`${entry.url}${PREFIX}/health`, {
          headers: { Authorization: `Bearer ${entry.token}` },
          signal: AbortSignal.timeout(1500),
          redirect: "error",
        });
        const health = (await response.json()) as {
          serverId?: string;
          protocolVersion?: number;
        };
        if (
          response.ok &&
          health.serverId === entry.serverId &&
          health.protocolVersion === PROTOCOL_VERSION &&
          !candidates.some((c) => c.serverId === entry.serverId)
        )
          candidates.push(entry);
      } catch {
        /* stale or unrelated file */
      }
    }
  }
  return candidates;
}
async function main() {
  let parsed: ReturnType<typeof parseArgs>;
  try {
    parsed = parseArgs({
      allowPositionals: true,
      strict: true,
      options: {
        page: { type: "string" },
        server: { type: "string" },
        "discovery-dir": { type: "string" },
        out: { type: "string" },
        timeout: { type: "string" },
        json: { type: "boolean" },
        headless: { type: "boolean" },
        full: { type: "boolean" },
        help: { type: "boolean" },
      },
    });
  } catch (error) {
    invalid(error instanceof Error ? error.message : String(error));
  }
  const [command = "help", ...args] = parsed.positionals;
  const flags = parsed.values;
  if (command === "help" || flags.help) {
    output({
      name: "React Auto Components DevTools",
      protocolVersion: PROTOCOL_VERSION,
      commands: commandHelp,
      flags: {
        "--page": "Page ID returned by inspect; include on every action",
        "--server": "Select a server when several are discovered",
        "--discovery-dir":
          "Explicit directory containing server discovery JSON files",
      },
      workflow: [
        "Run inspect",
        "Select a page explicitly when several are connected",
        "Use refs from its latest inspection",
        "Verify the result; never automatically retry a timed-out mutation",
      ],
      enable:
        "Install and configure reactAutoComponentsDevtools(), then start with RAC_AGENT=1 pnpm dev.",
    });
    return;
  }
  if (!(command in commandHelp)) invalid(`Unknown command "${command}".`);
  const arity: Record<string, number> = {
    goto: 1,
    replace: 1,
    params: 1,
    click: 1,
    fill: 2,
    dom: 1,
    wait: 1,
    submit: 1,
    validate: 1,
    eval: 1,
  };
  if (args.length !== (arity[command] ?? 0))
    invalid(
      `Invalid arguments for ${command}: ${commandHelp[command as keyof typeof commandHelp]}`,
    );
  if (
    flags.timeout !== undefined &&
    (!Number.isFinite(Number(flags.timeout)) ||
      Number(flags.timeout) <= 0 ||
      Number(flags.timeout) > 30000)
  )
    invalid("--timeout must be between 1 and 30000 milliseconds.");
  if (!["inspect", "pages", "health", "open"].includes(command) && !flags.page)
    invalid(
      "A page ID is required. Run rac inspect, then pass --page <pageId>.",
    );
  const candidates = await discover(
    flags["discovery-dir"] as string | undefined,
  );
  const selected = flags.server
    ? candidates.find((c) => c.serverId === flags.server)
    : candidates.length === 1
      ? candidates[0]
      : undefined;
  if (!selected) {
    if (candidates.length > 1 && !flags.server) {
      output({
        status: "selection_required",
        code: "RAC-SERVER-SELECTION",
        servers: candidates.map(({ serverId, url, root }) => ({
          serverId,
          url,
          root,
        })),
        fix: "Pass --server <serverId> from this list.",
      });
      process.exitCode = 1;
      return;
    }
    throw new RacError(
      "RAC-SERVER-NONE",
      "No matching live agent development server was discovered.",
      "Configure the DevTools Vite plugin and start with RAC_AGENT=1 pnpm dev. Run rac in the Vite project root or pass --discovery-dir <path>.",
    );
  }
  const headers = {
    Authorization: `Bearer ${selected.token}`,
    "Content-Type": "application/json",
  };
  async function call(path: string, data?: unknown) {
    const response = await fetch(`${selected!.url}${PREFIX}/${path}`, {
      method: data === undefined ? "GET" : "POST",
      headers,
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      signal: AbortSignal.timeout(45000),
      redirect: "error",
    });
    if (!response.ok) {
      output(await response.json());
      process.exitCode = 1;
      return;
    }
    return response;
  }
  const pageId = flags.page as string | undefined;
  const query = new URLSearchParams(pageId ? { pageId } : {});
  if (command === "shot") {
    if (flags.full) query.set("full", "1");
    const response = await call(`shot?${query}`);
    if (!response) return;
    const path = resolve(
      (flags.out as string) ?? `.rac-shots/${Date.now()}.png`,
    );
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, Buffer.from(await response.arrayBuffer()));
    output({
      status: "success",
      serverId: selected.serverId,
      pageId: response.headers.get("X-Rac-Page-Id"),
      path,
    });
    return;
  }
  let response: Response | undefined;
  if (["health", "pages", "inspect"].includes(command))
    response = await call(`${command}?${query}`);
  else if (command === "open")
    response = await call("open", { headless: flags.headless === true });
  else {
    const payload: Record<string, unknown> = {};
    if (["goto", "replace"].includes(command)) payload.target = args[0];
    else if (command === "params") {
      try {
        payload.params = JSON.parse(args[0]);
      } catch {
        invalid("params must be valid JSON.");
      }
      if (
        !payload.params ||
        typeof payload.params !== "object" ||
        Array.isArray(payload.params) ||
        Object.values(payload.params).some(
          (v) => v !== null && typeof v !== "string",
        )
      )
        invalid("params must be an object of string or null values.");
    } else if (command === "eval") payload.code = args[0];
    else if (arity[command]) payload.ref = args[0];
    if (command === "fill") payload.value = args[1];
    if (command === "wait") payload.timeout = Number(flags.timeout ?? 5000);
    response = await call("command", {
      pageId,
      cmd: command === "params" ? "setParams" : command,
      payload,
    });
  }
  if (response) output(await response.json());
}
main().catch((error) => {
  output(failure(error));
  process.exitCode = 1;
});
