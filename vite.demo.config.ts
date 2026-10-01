import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  base: "./",
  root: "test-project",
  plugins: [react()],
  build: { outDir: "../demo-dist", emptyOutDir: true },
});
