/**
 * Stub untuk paket `server-only` di Vitest.
 *
 * Paket `server-only` sengaja melempar error saat diimpor di luar kondisi
 * `react-server` (lihat `node_modules/server-only/index.js`). Vitest berjalan di
 * Node biasa, jadi modul server yang memakai `import "server-only"` akan gagal
 * dimuat di test.
 *
 * `vitest.config.mjs` mengalihkan specifier `server-only` ke file kosong ini.
 * Yang diuji tetap perilaku modulnya; batas client/server dijaga oleh Next.js
 * saat build dan oleh test regresi `src/server/server-only.test.ts`.
 *
 * File ini sengaja tidak mengekspor apa pun.
 */

export {};
