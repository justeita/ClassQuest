/**
 * `GET /api/health` — cek hidup + versi build.
 *
 * Bentuk respons mengikuti `docs/06-backend/api-contract.md`: `ok`, `version`,
 * `commit`, dan `time`. Jangan menambahkan status dependency internal di sini,
 * karena itu membocorkan infrastruktur.
 */

/**
 * Versi build. `VERCEL_GIT_COMMIT_SHA` dipakai saat deploy, selain itu jatuh ke
 * placeholder tetap supaya field-nya tidak pernah hilang dan handler tidak
 * pernah gagal hanya karena git tidak tersedia (mis. di lingkungan test).
 */
const FALLBACK_VERSION = "0.0.0";
const FALLBACK_COMMIT = "unknown";

const VERSION = process.env.npm_package_version ?? FALLBACK_VERSION;
const COMMIT =
  (process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT)?.slice(0, 7) ||
  FALLBACK_COMMIT;

export function GET(): Response {
  return Response.json({
    ok: true,
    version: VERSION,
    commit: COMMIT,
    time: new Date().toISOString(),
  });
}
