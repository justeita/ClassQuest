import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  // Samakan alias dengan `paths` di tsconfig.json. Tanpa ini, hanya import tipe
  // (`import type`) yang lolos — import nilai lewat "@/..." gagal di Vitest.
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "docs/**/*.test.ts"],
  },
});
