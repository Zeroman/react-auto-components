#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";

const [, , cmd, ...args] = process.argv;
const flag = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const port = flag("--port") ?? process.env.RAC_PORT ?? "4173";
const base = `http://127.0.0.1:${port}/__rac`;

const usage = `rac nav-cli — talk to the running dev app

  node scripts/nav-cli.mjs health
  node scripts/nav-cli.mjs state
  node scripts/nav-cli.mjs goto <target>        e.g. goto search:remote [--replace]
  node scripts/nav-cli.mjs params '<json>'
  node scripts/nav-cli.mjs events [n]
  node scripts/nav-cli.mjs console [n]          browser console/error relay
  node scripts/nav-cli.mjs click <testid>       click an element by data-testid
  node scripts/nav-cli.mjs fill <testid> <val>  set an input/select value
  node scripts/nav-cli.mjs dom <testid>         inspect an element (text/visible)
  node scripts/nav-cli.mjs wait <testid>        wait for an element to appear
  node scripts/nav-cli.mjs eval '<js expr>'     evaluate JS in the live page
  node scripts/nav-cli.mjs crawl                walk all routes, print census JSON [--headless]
  node scripts/nav-cli.mjs shot [testid]       [--path table:local] [--out f.png] [--w 1280] [--h 800] [--full] [--headless]

Devtools browser runs HEADED by default so you can watch the AI drive the app.
Use --headless (or env RAC_DEVTOOLS_HEADLESS=1) for invisible mode.

Environment: RAC_PORT (default 4173) or --port <n>`;

async function main() {
  if (!cmd || cmd === "help" || cmd === "--help") {
    console.log(usage);
    return;
  }
  if (cmd === "health") return print(await get("/health"));
  if (cmd === "state") return print(await get("/state"));
  if (cmd === "events") {
    const limit = Number(args.find((a) => !a.startsWith("--")) ?? 20);
    return print(await get(`/events?limit=${limit}`));
  }
  if (cmd === "goto") {
    const target = args.find((a) => !a.startsWith("--"));
    if (!target)
      throw new Error("goto needs a target, e.g. goto search:remote");
    return print(
      await post("/goto", { target, replace: args.includes("--replace") }),
    );
  }
  if (cmd === "params") {
    const raw = args.find((a) => !a.startsWith("--"));
    const params = raw ? JSON.parse(raw) : {};
    return print(await post("/params", { params }));
  }
  if (cmd === "console") {
    const limit = Number(args.find((a) => !a.startsWith("--")) ?? 30);
    return print(await get(`/console?limit=${limit}`));
  }
  if (cmd === "eval") {
    const code = args.find((a) => !a.startsWith("--"));
    if (!code) throw new Error("eval needs a JS expression");
    return print(await post("/cmd", { cmd: "eval", payload: { code } }));
  }
  if (["click", "dom", "wait"].includes(cmd)) {
    const testid = args.find((a) => !a.startsWith("--"));
    if (!testid) throw new Error(`${cmd} needs a testid`);
    return print(await post("/cmd", { cmd, payload: { testid } }));
  }
  if (cmd === "fill") {
    const [testid, value] = args.filter((a) => !a.startsWith("--"));
    if (!testid || value === undefined)
      throw new Error("fill needs a testid and a value");
    return print(
      await post("/cmd", { cmd: "fill", payload: { testid, value } }),
    );
  }
  if (cmd === "crawl" || cmd === "graph") {
    const params = new URLSearchParams();
    if (args.includes("--headless")) params.set("headless", "1");
    return print(await get(`/crawl${params.size ? `?${params}` : ""}`));
  }
  if (cmd === "shot") {
    const testid = args.find((a) => !a.startsWith("--"));
    const params = new URLSearchParams();
    if (testid) params.set("testid", testid);
    if (flag("--path")) params.set("path", flag("--path"));
    if (flag("--w")) params.set("w", flag("--w"));
    if (flag("--h")) params.set("h", flag("--h"));
    if (flag("--wait")) params.set("wait", flag("--wait"));
    if (args.includes("--full")) params.set("full", "1");
    if (args.includes("--headless")) params.set("headless", "1");
    const response = await fetch(`${base}/shot?${params}`);
    if (!response.ok) throw new Error(await response.text());
    const name =
      flag("--out") ??
      `.rac-shots/${(testid ?? "page").replaceAll(":", "-")}-${Date.now()}.png`;
    mkdirSync(new URL("../.rac-shots/", import.meta.url), { recursive: true });
    writeFileSync(
      new URL(`../${name}`, import.meta.url),
      Buffer.from(await response.arrayBuffer()),
    );
    console.log(`saved ${name}`);
    return;
  }
  throw new Error(`unknown command "${cmd}"\n${usage}`);
}

async function get(path) {
  const response = await fetch(base + path);
  const body = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(body));
  return body;
}

async function post(path, body) {
  const response = await fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(data));
  return data;
}

function print(data) {
  console.log(JSON.stringify(data, null, 2));
}

main().catch((error) => {
  console.error(String(error.message ?? error));
  process.exit(1);
});
