// typescript-eslint imports `typescript` for its parser API. TypeScript 7 has
// no JavaScript API, so these packages get the TypeScript 6 compatibility
// build. The root `typescript` dependency stays 7 for `tsc`.
const typescript6 = "npm:@typescript/typescript6@6.0.2";

const needsTypescript6 = new Set([
  "@typescript-eslint/parser",
  "@typescript-eslint/typescript-estree",
  "@typescript-eslint/project-service",
  "@typescript-eslint/tsconfig-utils",
  "ts-api-utils",
]);

function readPackage(pkg) {
  if (!needsTypescript6.has(pkg.name)) return pkg;
  pkg.dependencies = { ...pkg.dependencies, typescript: typescript6 };
  if (pkg.peerDependencies) delete pkg.peerDependencies.typescript;
  return pkg;
}

module.exports = { hooks: { readPackage } };
