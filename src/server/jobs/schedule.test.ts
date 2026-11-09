// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `scheduleJob()` hanya membungkus `runJob()` dengan `after()`. Yang dites:
 * `after()` dipanggil sekali dengan fungsi, dan kegagalan di dalamnya tidak
 * melempar keluar (tidak menjadi unhandled rejection).
 */

const { afterMock, runJobMock } = vi.hoisted(() => ({
  afterMock: vi.fn(),
  runJobMock: vi.fn(),
}));

vi.mock("next/server", () => ({ after: afterMock }));
vi.mock("./run", () => ({ runJob: runJobMock }));

import { scheduleJob } from "./schedule";

const INPUT = {
  jobId: "job_1",
  storyId: "st_1",
  pdf: {
    bytes: new TextEncoder().encode("%PDF-1.4"),
    filename: "materi.pdf",
    sizeBytes: 8,
  },
  tone: "hangat",
};

beforeEach(() => {
  afterMock.mockReset();
  runJobMock.mockReset();
});

describe("scheduleJob", () => {
  it("memanggil after() sekali dengan fungsi", () => {
    scheduleJob(INPUT);

    expect(afterMock).toHaveBeenCalledTimes(1);
    expect(typeof afterMock.mock.calls[0][0]).toBe("function");
  });

  it("menjalankan runJob dengan input yang sama di dalam after()", async () => {
    runJobMock.mockResolvedValue({
      status: "succeeded",
      usedFallback: false,
      version: 1,
    });

    scheduleJob(INPUT);
    const callback = afterMock.mock.calls[0][0] as () => Promise<void>;
    await callback();

    expect(runJobMock).toHaveBeenCalledTimes(1);
    expect(runJobMock.mock.calls[0][0]).toBe(INPUT);
  });

  it("tidak melempar saat runJob gagal di dalam after()", async () => {
    runJobMock.mockRejectedValue(new Error("gagal tak terduga"));

    scheduleJob(INPUT);
    const callback = afterMock.mock.calls[0][0] as () => Promise<void>;

    await expect(callback()).resolves.toBeUndefined();
  });
});
