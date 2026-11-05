#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { parseArgs } from "node:util";
import { RacError, failure } from "./errors.js";
import { PREFIX, PROTOCOL_VERSION } from "./protocol.js";
import {
  chooseServer,
  discoveryDirs,
  pageNone,
  publicSummary,
  scanServers,
  selectionPayload,
  type ServerSummary,
} from "./discovery.js";

const commandHelp = {
  inspect:
    "inspect [--page ID]: discover pages or inspect one page's current refs and capabilities",
  pages:
    "pages: list registered pages across servers, or one server's with --server",
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
        "--server":
          "Select one server explicitly; by default the only server with a ready page is used",
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
  // Scanning also prunes discovery files whose owning process is gone, so
  // dead files never turn into permanent multi-server noise.
  const summaries = await scanServers(
    discoveryDirs(process.cwd(), flags["discovery-dir"] as string | undefined),
  );
  const live = summaries.filter((server) => !server.unreachable);
  const serverNone = () =>
    new RacError(
      "RAC-SERVER-NONE",
      "No matching live agent development server was discovered.",
      "Configure the DevTools Vite plugin and start with RAC_AGENT=1 pnpm dev. Run rac in the Vite project root or pass --discovery-dir <path>.",
    );
  if (command === "pages" && !flags.server) {
    // `rac pages` aggregates every discovered server, ready or not.
    if (!live.length) throw serverNone();
    output({ status: "success", servers: summaries.map(publicSummary) });
    return;
  }
  const choice = chooseServer(
    live,
    command === "health" ? "health" : command === "open" ? "open" : "page",
    flags.server as string | undefined,
  );
  if (choice.kind === "server-none") throw serverNone();
  if (choice.kind === "server-selection") {
    output(selectionPayload(live));
    process.exitCode = 1;
    return;
  }
  if (choice.kind === "page-none") throw pageNone(live);
  const selected: ServerSummary = choice.server;
  const note =
    choice.auto && live.length > 1
      ? `Server ${selected.serverId} was selected automatically: it is the only live server with a ready page. Pass --server <serverId> to pin a specific server.`
      : undefined;
  const headers = {
    Authorization: `Bearer ${selected.token}`,
    "Content-Type": "application/json",
  };
  async function call(path: string, data?: unknown) {
    const response = await fetch(`${selected.url}${PREFIX}/${path}`, {
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
      ...(note ? { note } : {}),
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
  if (response) {
    const body: unknown = await response.json();
    // Additive hint on success when a server was picked automatically.
    output(
      note && body && typeof body === "object" && !Array.isArray(body)
        ? { ...(body as Record<string, unknown>), note }
        : body,
    );
  }
}
main().catch((error) => {
  output(failure(error));
  process.exitCode = 1;
});
