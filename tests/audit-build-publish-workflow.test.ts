import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

// Regression for audit 3.1: the publish gate reused whichever "verify"
// check-run existed on the tagged commit. ci.yml runs a chromium-only "verify"
// job on main, so tag pushes silently skipped the Firefox/WebKit release
// matrix. The release workflow must always run its own full verification on
// the tag, while keeping the repository restriction and publish auth.

const workflow = readFileSync(".github/workflows/publish.yml", "utf8");

describe("publish workflow release gate (audit 3.1)", () => {
  it("does not reuse the CI verify check-run", () => {
    expect(workflow).not.toContain("check-runs");
    expect(workflow).not.toContain("needs: gate");
    expect(workflow).not.toContain("outputs");
  });

  it("always runs verification on the tag", () => {
    const verify = workflow.slice(
      workflow.indexOf("\n  verify:"),
      workflow.indexOf("\n  publish:"),
    );
    expect(verify).not.toContain("needs.gate");
    expect(verify).not.toContain("verified");
    expect(verify).toContain("pnpm test:e2e");
  });

  it("publishes only after the full verification succeeds", () => {
    const publish = workflow.slice(workflow.indexOf("\n  publish:"));
    expect(publish).toMatch(/needs:\s*\[?verify/);
    expect(publish).not.toContain("skipped");
  });

  it("keeps the repository restriction and publish auth", () => {
    expect(workflow).toContain(
      "github.repository == 'Zeroman/react-auto-components'",
    );
    expect(workflow).toContain("id-token: write");
    expect(workflow).toContain("registry-url: https://registry.npmjs.org");
    expect(workflow).toContain("npm install -g npm@^11.5.1");
    expect(workflow).toContain("Tag matches package.json");
  });
});
