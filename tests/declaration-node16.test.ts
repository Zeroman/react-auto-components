import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

// Regression for issue #1: dist/*.d.ts must resolve under
// moduleResolution node16/nodenext, which requires explicit .js extensions and
// /index.js for directory imports. The build rewrites them in
// scripts/finalize-build.mjs because tsconfig.build.json resolves with Bundler,
// and `pnpm check:dist-types` re-checks the emitted files under NodeNext at the
// end of `pnpm build`, so a specifier the rewrite misses fails the build.

const { addDeclarationExtensions, finalizeDeclarations } = (await import(
  "../scripts/finalize-" + "build.mjs"
)) as {
  addDeclarationExtensions: (
    source: string,
    options: { dir: string; directoryOf?: (target: string) => boolean },
  ) => string;
  finalizeDeclarations: (dist?: string) => number;
};

const rewrite = (source: string, directoryOf: (target: string) => boolean) =>
  addDeclarationExtensions(source, { dir: "/dist", directoryOf });

describe("declaration node16/nodenext imports (issue #1)", () => {
  it("adds .js to relative file specifiers", () => {
    expect(rewrite('export * from "./core/types";', () => false)).toBe(
      'export * from "./core/types.js";',
    );
    expect(
      rewrite('import type { Field } from "./components/AutoForm/types";', () => false),
    ).toBe('import type { Field } from "./components/AutoForm/types.js";');
    expect(rewrite('export { X } from "../AutoSearch";', () => false)).toBe(
      'export { X } from "../AutoSearch.js";',
    );
  });

  it("adds /index.js to relative directory specifiers", () => {
    expect(
      rewrite(
        'export * from "./components/AutoForm";',
        (target) => target.endsWith("AutoForm"),
      ),
    ).toBe('export * from "./components/AutoForm/index.js";');
    expect(
      rewrite(
        'export * from "../../core/navigation";',
        (target) => target.endsWith("navigation"),
      ),
    ).toBe('export * from "../../core/navigation/index.js";');
  });

  it("leaves explicit .js and .json specifiers alone", () => {
    expect(rewrite('export * from "./x.js";', () => false)).toBe(
      'export * from "./x.js";',
    );
    expect(rewrite('import data from "./data.json";', () => false)).toBe(
      'import data from "./data.json";',
    );
  });

  it("drops side-effect css imports", () => {
    expect(
      rewrite('import "./popover.css";\nexport * from "./tip";', () => false),
    ).toBe('export * from "./tip.js";');
  });

  it("ignores bare package specifiers", () => {
    expect(rewrite('import { x } from "@scope/pkg";', () => false)).toBe(
      'import { x } from "@scope/pkg";',
    );
  });

  it("rewrites import() types and is idempotent", () => {
    const source =
      'export declare function f(s: import("./types").S): import("../dir").R;';
    const once = rewrite(source, (target) => target.endsWith("/dir"));
    expect(once).toBe(
      'export declare function f(s: import("./types.js").S): import("../dir/index.js").R;',
    );
    expect(rewrite(once, (target) => target.endsWith("/dir"))).toBe(once);
  });
});

// A miniature package with the shapes tsc emits from src/: star re-exports, a
// named re-export, a directory import, import() types and a side-effect css
// import. package.json sets "type": "module" so NodeNext applies the ESM
// rules that break for consumers, exactly like the published package.
const FIXTURE_FILES: Record<string, string> = {
  "package.json": '{ "name": "fixture", "private": true, "type": "module" }\n',
  "tsconfig.json": JSON.stringify({
    compilerOptions: {
      module: "NodeNext",
      moduleResolution: "NodeNext",
      noEmit: true,
      strict: true,
      skipLibCheck: false,
      types: [],
    },
    files: ["index.d.ts"],
  }),
  "index.d.ts": [
    'import "./styles/base.css";',
    'export * from "./core/types";',
    'export { DefaultTip } from "./internal/AutoTip";',
    'export * from "./components/AutoForm";',
    'export type { DataSource } from "./components/AutoTable/export";',
  ].join("\n") + "\n",
  "core/types.d.ts": "export interface Field { name: string }\n",
  "internal/AutoTip.d.ts":
    "export declare const DefaultTip: (props: { content: string }) => string;\n",
  "components/AutoForm/index.d.ts": 'export * from "./types";\n',
  "components/AutoForm/types.d.ts":
    "export interface AutoFormProps { fields: string[] }\n",
  "components/AutoTable/export.d.ts": [
    'import type { DataSource } from "./types";',
    "export declare function fetchRows<T>(source: DataSource<T>): Promise<T[]>;",
    "export type { DataSource };",
  ].join("\n") + "\n",
  "components/AutoTable/types.d.ts": "export type DataSource<T> = T[];\n",
  "index.js": "export const runtime = 1;\n",
};

const fixtures: string[] = [];

afterEach(() => {
  while (fixtures.length) {
    rmSync(fixtures.pop()!, { recursive: true, force: true });
  }
});

function writeFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "rac-declarations-"));
  fixtures.push(root);
  for (const [path, content] of Object.entries(FIXTURE_FILES)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

function typecheck(root: string): { status: number | null; output: string } {
  const result = spawnSync(
    process.execPath,
    [resolve("node_modules/typescript/bin/tsc"), "-p", root],
    { encoding: "utf8" },
  );
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

describe("emitted declarations type-check under NodeNext", () => {
  it("fails before the rewrite for the reasons issue #1 reported", () => {
    const { status, output } = typecheck(writeFixture());
    expect(status).not.toBe(0);
    expect(output).toMatch(/TS2834|TS2835/);
    expect(output).toMatch(/TS2882/);
  }, 60_000);

  it("passes after finalizeDeclarations, which only touches .d.ts files", () => {
    const root = writeFixture();
    expect(finalizeDeclarations(root)).toBe(3);
    expect(finalizeDeclarations(root)).toBe(0);
    expect(readFileSync(join(root, "index.js"), "utf8")).toBe(
      FIXTURE_FILES["index.js"],
    );

    const index = readFileSync(join(root, "index.d.ts"), "utf8");
    expect(index).not.toContain(".css");
    expect(index).toContain('export * from "./core/types.js";');
    expect(index).toContain('export * from "./components/AutoForm/index.js";');
    expect(
      readFileSync(join(root, "components/AutoTable/export.d.ts"), "utf8"),
    ).toContain('from "./types.js";');

    const { status, output } = typecheck(root);
    expect(output).toBe("");
    expect(status).toBe(0);
  }, 60_000);
});

describe("build gate for declaration imports", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts: Record<string, string>;
  };
  const distTsconfig = JSON.parse(
    readFileSync("tsconfig.dist.json", "utf8"),
  ) as { compilerOptions: Record<string, unknown>; include: string[] };

  it("re-checks dist under NodeNext at the end of pnpm build", () => {
    expect(pkg.scripts["check:dist-types"]).toBe("tsc -p tsconfig.dist.json");
    expect(pkg.scripts.build.endsWith("&& pnpm check:dist-types")).toBe(true);
    expect(distTsconfig.compilerOptions).toMatchObject({
      module: "NodeNext",
      moduleResolution: "NodeNext",
      skipLibCheck: false,
      noEmit: true,
    });
    expect(distTsconfig.include).toEqual(["dist"]);
  });
});
