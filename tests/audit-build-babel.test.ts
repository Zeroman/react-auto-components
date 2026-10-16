import { describe, expect, it } from "vitest";
import { transformSync } from "@babel/core";
import reactCompiler from "babel-plugin-react-compiler";

// Regression for audit 1.1: under @babel/core 8.x, babel-plugin-react-compiler
// bails out on components whose props are destructured with defaults
// (BuildHIR::lowerAssignment calls NodePath.isLVal(), which no longer accepts
// AssignmentPattern in Babel 8). The build stays green but silently skips the
// component. The library must compile such components with CompileSuccess.

type CompilerEvent = { kind?: string; detail?: unknown };

function compile(source: string): { events: CompilerEvent[] } {
  const events: CompilerEvent[] = [];
  transformSync(source, {
    filename: "Fixture.tsx",
    parserOpts: { plugins: ["jsx", "typescript"] },
    presets: [],
    plugins: [
      [
        reactCompiler,
        {
          logger: {
            logEvent(_filename: string, event: CompilerEvent) {
              events.push(event);
            },
          },
        },
      ],
    ],
  });
  return { events };
}

const FIXTURE = `
function Fixture({ label = "default", items = [] }) {
  const doubled = items.length * 2;
  return (
    <div data-label={label} data-doubled={doubled}>
      {label}
    </div>
  );
}
`;

describe("react compiler under project @babel/core (audit 1.1)", () => {
  it("compiles destructuring defaults with CompileSuccess and no CompileError", () => {
    const { events } = compile(FIXTURE);
    const kinds = events.map((event) => event.kind);
    expect(kinds).toContain("CompileSuccess");
    expect(kinds).not.toContain("CompileError");
  });
});
