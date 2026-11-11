/**
 * Entry point modul hasil bermain (task 22).
 *
 * Impor dari sini, bukan dari file dalam:
 *
 * ```ts
 * import { savePlayResult } from "@/server/play-results";
 * ```
 */

export {
  MAX_NICKNAME_LENGTH,
  MAX_PLAY_RESULT_JSON_BYTES,
  savePlayResult,
  type SavePlayResultCoreResult,
  type SavePlayResultFailureReason,
  type SavePlayResultInput,
} from "./save";
