import { defineConfig, devices } from "@playwright/test";

/**
 * Stress-demo browser tests. Runs against the Vite dev server on port 4174,
 * which serves the library from the workspace `dist/` build. Build first:
 * `pnpm build` from the repository root.
 */
export default defineConfig({
  testDir: "tests",
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    locale: "en-US",
    baseURL: "http://127.0.0.1:4174",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "pnpm exec vite --host 127.0.0.1 --port 4174 --strictPort --force",
    url: "http://127.0.0.1:4174",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
