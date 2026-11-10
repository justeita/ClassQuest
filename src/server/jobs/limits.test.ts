// @vitest-environment node

import { describe, expect, it } from "vitest";

import { maxDuration } from "@/app/api/upload/route";

import { JOB_STALE_AFTER_SECONDS } from "./limits";

/**
 * `maxDuration` route upload harus tetap **literal** supaya bisa dianalisis
 * Next, jadi route itu tidak boleh mengimpor `JOB_STALE_AFTER_SECONDS`. Tes ini
 * yang menjaga hubungan keduanya: job hanya boleh dianggap basi setelah route
 * upload pasti sudah kehabisan waktu.
 */
describe("JOB_STALE_AFTER_SECONDS", () => {
  it("lebih besar dari maxDuration route upload (detik)", () => {
    expect(JOB_STALE_AFTER_SECONDS).toBeGreaterThan(maxDuration);
  });

  it("memberi margin 30 detik di atas maxDuration", () => {
    expect(JOB_STALE_AFTER_SECONDS - maxDuration).toBe(30);
  });
});
