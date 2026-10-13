import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    pool: "threads",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    preserveSymlinks: process.env.CODEX_LOCAL_PREVIEW === "1",
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
});
