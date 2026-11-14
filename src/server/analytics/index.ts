/**
 * Modul analytics kelas (`/guru/analitik`).
 *
 * Impor dari sini, bukan dari file dalam:
 *
 * ```ts
 * import { getClassroomAnalytics } from "@/server/analytics";
 * ```
 */

export {
  getClassroomAnalytics,
  MAX_ANALYTICS_ROWS,
  type GetClassroomAnalyticsInput,
} from "./core";
