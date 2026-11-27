import { describe, expect, it } from "vitest";

// Regression for issue #1: dist/*.d.ts must resolve under
// moduleResolution node16/nodenext, which requires explicit .js extensions and
// /index.js for directory imports. The build rewrites them in
// scripts/finalize-build.mjs because tsconfig.build.json resolves with Bundler.

const { addDeclarationExtensions } = (await import(
  "../scripts/finalize-" + "build.mjs"
)) as {
  addDeclarationExtensions: (
    source: string,
    options: { dir: string; directoryOf?: (target: string) => boolean },
  ) => string;
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
});
