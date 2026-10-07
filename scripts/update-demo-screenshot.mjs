import { preview } from "vite";
import { chromium } from "@playwright/test";
import { mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const demoDist = resolve(root, "demo-dist");
const outputDir = resolve(root, "docs/assets");
const outputPath = resolve(outputDir, "demo.png");

// Ensure demo is built
if (!existsSync(resolve(demoDist, "index.html"))) {
  console.log("Building demo first...");
  const res = spawnSync("pnpm", ["build:demo"], { cwd: root, stdio: "inherit" });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

mkdirSync(outputDir, { recursive: true });

const server = await preview({
  root,
  build: { outDir: "demo-dist" },
  preview: { port: 4178, strictPort: false },
});

const url = server.resolvedUrls?.local?.[0] || "http://localhost:4178/";
console.log(`Preview server running at ${url}`);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 960 },
  deviceScaleFactor: 2,
  locale: "en-US",
});

try {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector(".studio");
  await page.waitForSelector("tbody tr");
  // Showcase the single-line toolbar: compact inline layout, status pills on,
  // and the More-filters popover open.
  await page.getByRole("button", { name: "Compact Inline" }).click();
  await page
    .getByRole("checkbox", { name: "Status pills" })
    .check();
  await page.getByTestId("rac-more-filters").click();
  await page.waitForTimeout(400);

  await page.screenshot({
    path: outputPath,
    fullPage: false,
  });
  console.log(`Screenshot saved to ${outputPath}`);
} finally {
  await browser.close();
  await server.close();
}
