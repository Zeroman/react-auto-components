/**
 * Reproducible recorder for docs/assets/devtools.gif.
 *
 * Records a real agent debugging session against the demo dev server:
 * every app action runs through the `rac` CLI (pages / inspect / goto / fill /
 * dom) with explicit --page targeting, and the GIF's terminal strip presents
 * the actual command output. Playwright only opens the two demo tabs, waits
 * for readiness, and takes screenshots — it never pretends to be the agent.
 *
 * FFMPEG_PATH overrides the ffmpeg binary (default: ffmpeg from PATH).
 * Scratch frames/logs stay under data/agent-runs/devtools-readme-media/.
 * Output: docs/assets/devtools.gif (1000x680, one frame per CLI step).
 */
import { execFile, spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const scratch = resolve(root, "data/agent-runs/devtools-readme-media");
const framesDir = resolve(scratch, "frames");
const racCli = resolve(root, "packages/devtools/dist/cli.js");
const gifPath = resolve(root, "docs/assets/devtools.gif");
const racBin = promisify(execFile);
const FFMPEG = process.env.FFMPEG_PATH ?? "ffmpeg";

let discoveryDir;

mkdirSync(scratch, { recursive: true });
rmSync(framesDir, { recursive: true, force: true });
mkdirSync(framesDir, { recursive: true });
rmSync(resolve(scratch, "recorder.log"), { force: true });
const log = (step, message) =>
  writeFileSync(resolve(scratch, "recorder.log"), `[${step}] ${message}\n`, {
    flag: "a",
  });

// Async CLI: the Vite server runs in this process, so spawnSync would
// deadlock its event loop. allowFailure lets discovery polling survive
// RAC-SERVER-NONE while the bridge writes its discovery file.
const racLog = [];
function rac(args, { quiet = false, allowFailure = false } = {}) {
  return racBin(
    process.execPath,
    [racCli, ...args, "--discovery-dir", discoveryDir],
    {
      cwd: resolve(root, "test-project"),
      maxBuffer: 16 * 1024 * 1024,
    },
  )
    .then(({ stdout }) => {
      const parsed = JSON.parse(stdout);
      racLog.push({ args: `rac ${args.join(" ")}`, ok: true, result: parsed });
      if (!quiet)
        writeFileSync(
          resolve(scratch, "rac-session.json"),
          JSON.stringify(racLog, null, 2),
        );
      log("rac", `rac ${args.join(" ")}`);
      return parsed;
    })
    .catch((error) => {
      const stdout = error.stdout ?? "";
      let parsed;
      try {
        parsed = JSON.parse(stdout);
      } catch {
        parsed = { stdout, stderr: error.stderr ?? "" };
      }
      racLog.push({ args: `rac ${args.join(" ")}`, ok: false, result: parsed });
      if (!quiet)
        writeFileSync(
          resolve(scratch, "rac-session.json"),
          JSON.stringify(racLog, null, 2),
        );
      if (!allowFailure)
        throw new Error(
          `rac ${args.join(" ")} failed: ${stdout} ${error.stderr ?? ""}`,
        );
      return parsed;
    });
}

async function waitFor(fn, label, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    let value;
    try {
      value = await fn();
    } catch {
      value = undefined;
    }
    if (value) return value;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

const require_ = (await import("node:module")).createRequire(import.meta.url);

async function main() {
  const build = spawnSync("pnpm", ["build:devtools"], { cwd: root });
  if (build.status !== 0) throw new Error("build:devtools failed");
  log("build", "devtools dist rebuilt");

  const encoder = spawnSync(FFMPEG, ["-version"], { encoding: "utf8" });
  if (encoder.status !== 0)
    throw new Error(
      "Install ffmpeg on PATH or set FFMPEG_PATH before recording.",
    );
  discoveryDir = mkdtempSync(resolve(scratch, "discovery-"));
  let server;
  let browser;
  try {
    const { createServer, loadConfigFromFile } = await import("vite");
    const loaded = await loadConfigFromFile(
      { command: "serve", mode: "development" },
      resolve(root, "vite.demo.config.ts"),
    );
    if (!loaded) throw new Error("Could not load the demo Vite configuration.");
    const { reactAutoComponentsDevtools } =
      await import("../packages/devtools/dist/vite.js");
    // Reuse demo aliases and React plugins, replacing only the bridge with an
    // isolated instance. No other running project's discovery files are read.
    server = await createServer({
      ...loaded.config,
      configFile: false,
      root: resolve(root, "test-project"),
      plugins: [
        ...loaded.config.plugins
          .flat(Infinity)
          .filter((p) => p && p.name !== "react-auto-components-devtools"),
        reactAutoComponentsDevtools({ enabled: true, discoveryDir }),
      ],
      server: { host: "127.0.0.1", port: 0, strictPort: true },
      logLevel: "error",
    });
    await server.listen();
    const base = server.resolvedUrls.local[0];
    log("server", `vite ready at ${base}`);
    const { chromium } = require_("@playwright/test");
    browser = await chromium.launch();
    await record(base, browser);
  } finally {
    try {
      await browser?.close();
    } finally {
      try {
        await server?.close();
      } finally {
        rmSync(discoveryDir, { recursive: true, force: true });
        log("cleanup", "browser, dev server and isolated discovery closed");
      }
    }
  }
}

main().catch((error) => {
  // Cleanup already ran in main's finally.
  console.error(error);
  process.exit(1);
});

async function record(base, browser) {
  const context = await browser.newContext({
    viewport: { width: 1000, height: 500 },
    deviceScaleFactor: 2,
    locale: "en-US",
  });
  // Tab A is the page the agent drives; tab B is the bystander.
  const tabA = await context.newPage();
  // networkidle never settles here: the bridge holds a long poll open.
  await tabA.goto(`${base}?recording=target`, {
    waitUntil: "domcontentloaded",
  });
  await tabA.waitForSelector(".studio");
  await tabA.waitForSelector("tbody tr");
  await tabA.waitForFunction(() => Boolean(globalThis.__racPageId));
  const tabB = await context.newPage();
  await tabB.goto(`${base}?recording=other`, { waitUntil: "domcontentloaded" });
  await tabB.waitForSelector("tbody tr");
  await tabB.waitForFunction(() => Boolean(globalThis.__racPageId));
  log("pages", "two demo pages registered");

  // Discovery: both tabs must be registered before choosing pages.
  let registry;
  await waitFor(async () => {
    registry = await rac(["pages"], { quiet: true, allowFailure: true });
    const ready = registry.pages?.filter((p) => p.status === "ready") ?? [];
    return ready.length === 2 &&
      ready.some((p) => p.url === tabA.url()) &&
      ready.some((p) => p.url === tabB.url())
      ? ready
      : undefined;
  }, "two registered pages");

  // Exact URL matching, uniqueness asserted — no first-page fallback.
  const pick = (url, label) => {
    const matches = registry.pages.filter(
      (p) => p.status === "ready" && p.url === url,
    );
    if (matches.length !== 1)
      throw new Error(
        `Expected exactly one ${label} page, got ${matches.length}: ${JSON.stringify(matches.map((p) => p.url))}`,
      );
    return matches[0];
  };
  const tablePage = pick(tabA.url(), "table");
  const searchPage = pick(tabB.url(), "search");
  if (tablePage.pageId === searchPage.pageId)
    throw new Error("Target and survivor resolved to the same page");
  const alias = { $PAGE: tablePage.pageId, $OTHER: searchPage.pageId };
  log("discovery", JSON.stringify(alias));

  // Set up the other page through the same explicit CLI, before recording.
  await rac(["goto", "search:manual", "--page", searchPage.pageId]);
  await tabB.waitForURL(/search:manual/);
  await tabB.waitForSelector(".auto-search");
  await waitFor(
    async () =>
      (await rac(["pages"], { quiet: true })).pages.some(
        (p) => p.pageId === searchPage.pageId && p.url === tabB.url(),
      ),
    "other page metadata",
  );

  // Capture the bystander's actual baseline BEFORE any target-page actions.
  const beforeB = await rac(["inspect", "--page", searchPage.pageId]);
  const bField = beforeB.elements.find(
    (e) => e.role === "textbox" && e.actions.includes("fill"),
  );
  if (!bField?.ref) throw new Error("No textbox on the bystander page");
  const baselineB = await rac(["dom", bField.ref, "--page", searchPage.pageId]);
  if (typeof baselineB.data?.value !== "string")
    throw new Error("Bystander baseline value is missing");
  const baselineUrl = tabB.url();

  // The composer renders the full-width app screenshot over a terminal strip.
  const composer = await context.newPage();
  await composer.setViewportSize({ width: 1000, height: 680 });
  let frameIndex = 0;
  const lines = [];
  const escape = (text) =>
    text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  async function step(tab, heading, invocation, output, note) {
    lines.push({ kind: "cmd", text: invocation });
    if (note) lines.push({ text: note, tone: "ok" });
    if (output)
      lines.push({
        text: typeof output === "string" ? output : JSON.stringify(output),
      });
    const shot = await tab.screenshot();
    const recent = lines.slice(-3);
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      * { margin: 0; box-sizing: border-box; }
      body { width: 1000px; height: 680px; display: flex; flex-direction: column; background: #0f1512; color: #e8efe9; font: 14px/1.4 "SF Mono", ui-monospace, Menlo, monospace; }
      header { padding: 8px 14px; border-bottom: 1px solid #263229; color: #9fd6b3; font-weight: 600; font-size: 13px; }
      .app { height: 500px; flex-shrink: 0; background: #f4f6f4; display: flex; align-items: center; justify-content: center; overflow: hidden; }
      .app img { max-width: 100%; max-height: 100%; }
      .strip { flex: 1; padding: 8px 14px; overflow: hidden; }
      .cmd { color: #d9e8dc; background: #1a231d; border-left: 3px solid #3f7d55; padding: 2px 8px; margin: 4px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .out { color: #aebfb2; white-space: pre-wrap; overflow-wrap: anywhere; }
      .ok { color: #9fd6b3; }
      footer { padding: 5px 14px; border-top: 1px solid #263229; color: #7d8f82; font-size: 10.5px; white-space: nowrap; overflow: hidden; }
    </style></head><body>
      <header>React Auto Components · agent debugging — ${escape(heading)}</header>
      <div class="app"><img src="data:image/png;base64,${shot.toString("base64")}"></div>
      <div class="strip">${recent
        .map((l) =>
          l.kind === "cmd"
            ? `<div class="cmd">$ ${escape(l.text)}</div>`
            : `<div class="out ${l.tone ?? ""}">${escape(l.text)}</div>`,
        )
        .join("")}</div>
      <footer>Actual rac activity · $PAGE and $OTHER are page IDs returned by discovery · every action targets one page</footer>
    </body></html>`;
    await composer.setContent(html, { waitUntil: "load" });
    await composer.screenshot({
      path: resolve(
        framesDir,
        `frame${String(frameIndex).padStart(2, "0")}.png`,
      ),
    });
    frameIndex += 1;
    log("frame", `${frameIndex - 1}: ${invocation}`);
  }

  // Step 1 · discovery with both pages listed.
  const pagesOut = await rac(["pages"]);
  await step(
    tabA,
    "step 1 · discover",
    "rac pages",
    pagesOut.pages
      .map(
        (p) =>
          `${p.pageId === tablePage.pageId ? "$PAGE" : "$OTHER"}  ${new URL(p.url).hash.slice(2)}  [${p.status}]`,
      )
      .join("\n"),
    "two live pages — the agent must name its target on every command",
  );

  // Step 2 · inspect before acting.
  const inspectA = await rac(["inspect", "--page", tablePage.pageId]);
  if (!inspectA.elements?.length)
    throw new Error("inspect returned no elements");
  await step(
    tabA,
    "step 2 · inspect before acting",
    `rac inspect --page $PAGE`,
    {
      route: new URL(inspectA.url).hash.slice(2),
      controls: inspectA.elements.length,
      navigation: inspectA.navigation?.available,
    },
    "the agent reads refs before touching anything",
  );

  // Step 3 · drive navigation on the chosen page only.
  const gotoOut = await rac([
    "goto",
    "form:component",
    "--page",
    tablePage.pageId,
  ]);
  await tabA.waitForURL(/form:component/, { timeout: 20000 });
  await tabA.waitForSelector("form.auto-form");
  await step(
    tabA,
    "step 3 · drive navigation",
    `rac goto form:component --page $PAGE`,
    { status: gotoOut.status },
    "the chosen page now shows the AutoForm example",
  );

  // Step 4 · fill by ref.
  const inspectForm = await rac(["inspect", "--page", tablePage.pageId]);
  const field = inspectForm.elements.find(
    (e) =>
      e.role === "textbox" && !e.disabled && (e.actions ?? []).includes("fill"),
  );
  if (!field?.ref)
    throw new Error("No fillable textbox found on the form page");
  const fillOut = await rac([
    "fill",
    field.ref,
    "Agent demo project",
    "--page",
    tablePage.pageId,
  ]);
  if (fillOut.data?.executed !== true)
    throw new Error(`fill did not execute: ${JSON.stringify(fillOut)}`);
  await step(
    tabA,
    "step 4 · fill a field by ref",
    `rac fill ${field.ref} "Agent demo project" --page $PAGE`,
    { executed: fillOut.data.executed },
    `ref ${field.ref} (${field.name || field.role}) filled`,
  );

  // Step 5 · verify the outcome on the live page.
  const domOut = await rac(["dom", field.ref, "--page", tablePage.pageId]);
  if (domOut.data?.value !== "Agent demo project")
    throw new Error(
      `Verification failed: field value is ${JSON.stringify(domOut.data)}`,
    );
  await step(
    tabA,
    "step 5 · verify the outcome",
    `rac dom ${field.ref} --page $PAGE`,
    {
      value: domOut.data.value,
      tag: domOut.data.tag,
      visible: domOut.data.visible,
    },
    "value verified on the live page",
  );

  // Step 6 · compare the unselected page with its pre-action baseline.
  const afterB = await rac(["inspect", "--page", searchPage.pageId]);
  const bUrl = await tabB.evaluate(() => location.href);
  const bStillSearch =
    bUrl === baselineUrl &&
    JSON.stringify(afterB.navigation) === JSON.stringify(beforeB.navigation);
  // Inspect resets refs: match the same field by its stable label, then re-read.
  const afterField = afterB.elements.find(
    (e) =>
      e.role === bField.role &&
      e.name === bField.name &&
      e.field === bField.field &&
      (e.actions ?? []).includes("fill"),
  );
  if (!afterField?.ref)
    throw new Error("Bystander field disappeared after re-inspect");
  const afterDom = await rac([
    "dom",
    afterField.ref,
    "--page",
    searchPage.pageId,
  ]);
  const afterValue = afterDom.data?.value;
  if (!bStillSearch) throw new Error(`Bystander route changed: ${bUrl}`);
  if (afterValue !== baselineB.data.value)
    throw new Error(
      `Bystander field changed: expected ${baselineB.data.value}, got ${JSON.stringify(afterValue)}`,
    );
  await step(
    tabB,
    "step 6 · the other page was untouched",
    `rac inspect --page $OTHER`,
    {
      route: bUrl.replace(/^https?:\/\/[^/]+\/?/, ""),
      field: bField.name || bField.role,
      value: afterValue,
    },
    "same route, same field value — explicit --page keeps the agent on target",
  );

  await composer.close();
  composeGif(frameIndex);
  writeFileSync(
    resolve(scratch, "assertions.json"),
    JSON.stringify(
      {
        targetPageId: tablePage.pageId,
        otherPageId: searchPage.pageId,
        targetValue: domOut.data.value,
        otherBefore: baselineB.data.value,
        otherAfter: afterValue,
        otherUrlUnchanged: bUrl === baselineUrl,
        otherNavigationUnchanged: bStillSearch,
        frames: frameIndex,
        actionsThroughRac: true,
      },
      null,
      2,
    ),
  );
}

function composeGif(frameCount) {
  const run = (args) => {
    const result = spawnSync(FFMPEG, args, { encoding: "utf8" });
    if (result.status !== 0)
      throw new Error(`ffmpeg ${args.join(" ")} failed: ${result.stderr}`);
  };
  const palette = resolve(framesDir, "palette.png");
  const stagedGif = resolve(framesDir, "devtools.gif");
  // Each frame holds 2 seconds: 6 steps form a 12-second loop.
  run([
    "-y",
    "-framerate",
    "0.5",
    "-i",
    resolve(framesDir, "frame%02d.png"),
    "-vf",
    "scale=1000:-2:flags=lanczos,palettegen=stats_mode=diff",
    palette,
  ]);
  run([
    "-y",
    "-framerate",
    "0.5",
    "-i",
    resolve(framesDir, "frame%02d.png"),
    "-i",
    palette,
    "-lavfi",
    "scale=1000:-2:flags=lanczos [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=3",
    "-loop",
    "0",
    "-frames:v",
    String(frameCount),
    stagedGif,
  ]);
  renameSync(stagedGif, gifPath);
  log("gif", `${frameCount} frames -> ${gifPath}`);
  console.log(`GIF written to ${gifPath} (${frameCount} frames)`);
}
