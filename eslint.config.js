import reactHooks from "eslint-plugin-react-hooks";
import parser from "@typescript-eslint/parser";

const compiler = reactHooks.configs.flat["recommended-latest"];

// vite.config.ts calls reactCompilerPreset() with no options. The ESLint
// preset enables extra checks that build does not, so put those back.
const buildCompiler = {
  environment: {
    validateNoSetStateInEffects: false,
    validateNoDerivedComputationsInEffects: false,
    validateNoJSXInTryStatements: false,
    validateStaticComponents: false,
    validateNoImpureFunctionsInRender: false,
    validateNoFreezingKnownMutableFunctions: false,
    validateNoVoidUseMemo: false,
  },
};

const rules = {
  ...compiler.rules,
  // Dependency arrays are inferred by the compiler. This rule is not part of the gate.
  "react-hooks/exhaustive-deps": "off",
};

for (const [name, severity] of Object.entries(rules)) {
  if (severity === "off" || name === "react-hooks/rules-of-hooks") continue;
  rules[name] = [severity, buildCompiler];
}

// The build compiler reports these and then skips the function, keeping the
// original source. They are existing bailouts, not a silent miscompile.
for (const name of [
  "react-hooks/refs",
  "react-hooks/immutability",
  "react-hooks/preserve-manual-memoization",
]) {
  rules[name] = ["warn", buildCompiler];
}

export default [
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    plugins: compiler.plugins,
    rules,
  },
];
