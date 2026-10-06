import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev-only: alias the package to library source so `pnpm dev` hot-reloads
// library edits instantly and never depends on the packed tarball. Swapping
// the tarball under a running dev server used to force vite in-process
// restarts that could deadlock the dep optimizer with a connected tab; the
// source-aliased demo is immune. The packed artifact stays verified by the
// e2e web server (port 4174) and `pnpm --dir test-project dev`.
const lib = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig(({ command }) => ({
  base: "./",
  root: "test-project",
  ...(command === "serve"
    ? {
        resolve: {
          // Dedupe is mandatory with the source alias: library files resolve
          // `react` from the repository root while the demo app resolves it
          // from test-project/node_modules — two React copies crash with
          // "Invalid hook call". Dedupe pins every import to one instance.
          dedupe: ["react", "react-dom"],
          alias: [
            {
              find: "@zeroman.yang/react-auto-components/style.css",
              replacement: lib("src/styles/base.css"),
            },
            {
              find: "@zeroman.yang/react-auto-components/xlsx",
              replacement: lib("src/adapters/xlsx.ts"),
            },
            {
              find: /^@zeroman\.yang\/react-auto-components$/,
              replacement: lib("src/index.ts"),
            },
          ],
        },
      }
    : {}),
  plugins: [react()],
  build: { outDir: "../demo-dist", emptyOutDir: true },
}));
