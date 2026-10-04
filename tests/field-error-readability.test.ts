import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "vitest";

test("Field assignment errors name the broken prop and the fix", () => {
  const root = join(process.cwd(), "node_modules/.cache");
  mkdirSync(root, { recursive: true });
  const dir = mkdtempSync(join(root, "rac-field-"));
  const file = join(dir, "bad.ts");
  writeFileSync(
    file,
    `import type { Field } from "../../../src/core/types.ts";
type Model = { status: string; created: string; amount: number; period: [string, string] };
const selectMissing: Field<Model> = { name: "status", type: "select" };
const rangeScalar: Field<Model> = { name: "created", type: "daterange", defaultValue: "2020-01-01" };
const rangeOk: Field<Model> = { name: "period", type: "daterange", defaultValue: ["2020-01-01", "2020-01-02"] };
const selectOk: Field<Model> = { name: "status", type: "select", options: [{ value: "a", label: "A" }] };
void selectMissing; void rangeScalar; void rangeOk; void selectOk;
`,
  );
  let output = "";
  try {
    execFileSync(
      "pnpm",
      [
        "exec",
        "tsc",
        "--ignoreConfig",
        "--noEmit",
        "--pretty",
        "false",
        "--strict",
        "--target",
        "ES2022",
        "--module",
        "ESNext",
        "--moduleResolution",
        "Bundler",
        "--jsx",
        "react-jsx",
        file,
      ],
      { encoding: "utf8" },
    );
  } catch (error) {
    const failed = error as { stdout?: string; stderr?: string };
    output = `${failed.stdout ?? ""}${failed.stderr ?? ""}`;
  }
  expect(output).toContain("Property 'options' is missing");
  expect(output).toContain("ChoiceField");
  expect(output).toContain("RAC-FIELD-RANGE");
  expect(output).toContain("two-item tuple [start, end]");
  expect(output).not.toContain("type: string");
  expect(output.split("\n").length).toBeLessThan(40);
});
