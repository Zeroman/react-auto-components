import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { mockApiPlugin } from "./src/mockApi.ts";
// VITE_API_TARGET=http://remote-test-backend:8080 forwards /remote-api/* to the real backend.
export default defineConfig({
  plugins: [react(), mockApiPlugin()],
  server: {
    port: 4173,
    strictPort: true,
    proxy: process.env.VITE_API_TARGET
      ? {
          "/remote-api": {
            target: process.env.VITE_API_TARGET,
            changeOrigin: true,
          },
        }
      : undefined,
  },
  build: { outDir: "dist" },
});
