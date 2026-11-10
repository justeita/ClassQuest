import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  // Samakan alias dengan `paths` di tsconfig.json. Tanpa ini, hanya import tipe
  // (`import type`) yang lolos — import nilai lewat "@/..." gagal di Vitest.
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Paket `server-only` melempar error di luar kondisi `react-server`, dan
      // Vitest berjalan di Node biasa. Alihkan ke stub kosong supaya modul
      // server tetap bisa dites. Batas client/server dijaga Next.js saat build
      // dan test regresi `src/server/server-only.test.ts`.
      "server-only": fileURLToPath(
        new URL("./src/test/server-only-stub.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "docs/**/*.test.ts"],
  },
});
