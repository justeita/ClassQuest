import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Story } from "@/story/schema";

import { StoryEditor } from "./StoryEditor";

/**
 * Perilaku editor cerita yang dilihat guru.
 *
 * Yang dijaga di sini adalah janji `docs/05-frontend/story-editor.md` yang tidak
 * bisa dilindungi typecheck:
 *
 * 1. Guru melihat form, bukan JSON.
 * 2. Tombol simpan mati sampai ada perubahan, lalu memanggil `saveStoryDraft`
 *    dengan versi yang dibuka.
 * 3. Undo mengembalikan perubahan tanpa menyentuh server.
 * 4. Hasil validasi muncul dalam bahasa manusia (lokasi + pesan), dan error
 *    memblokir publish.
 * 5. Konflik versi tidak menimpa diam-diam.
 *
 * Cerita uji memakai `docs/02-data-model/story.example.json`, sumber yang sama
 * dengan tes validator.
 */

const saveStoryDraft = vi.fn();
const refresh = vi.fn();
const router = { refresh, push: vi.fn(), replace: vi.fn() };

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("@/app/guru/actions", () => ({
  saveStoryDraft: (input: unknown) => saveStoryDraft(input),
}));

const loadExample = (): Story =>
  JSON.parse(
    readFileSync(
      join(process.cwd(), "docs/02-data-model/story.example.json"),
      "utf8",
    ),
  ) as Story;

/** Editor memvalidasi dengan debounce 300 ms; tes menunggu hasilnya. */
const VALIDATION_WAIT = 1500;

beforeEach(() => {
  saveStoryDraft.mockReset();
  refresh.mockClear();
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const renderEditor = (
  overrides: Partial<Parameters<typeof StoryEditor>[0]> = {},
) => {
  const story = overrides.initialStory ?? loadExample();

  return render(
    <StoryEditor
      storyId="st_siklus_air"
      initialStory={story}
      initialVersion={3}
      status="draft"
      {...overrides}
    />,
  );
};

/** Tombol simpan di kepala editor. */
const saveButton = () => screen.getByRole("button", { name: /simpan draft/i });

/** Buka panel "Pengaturan cerita" (judul, sinopsis, mode). */
const openMeta = () =>
  fireEvent.click(screen.getByRole("button", { name: /pengaturan cerita/i }));

describe("StoryEditor", () => {
  it("menampilkan form cerita, bukan JSON", async () => {
    renderEditor();

    expect(screen.getByTestId("story-editor")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: /struktur cerita/i }),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('"chapters":');
    expect(document.body.textContent).not.toContain("assetUsage");

    // Panel validasi terisi setelah pemeriksaan selesai.
    await waitFor(
      () => expect(screen.getByText(/error/i)).toBeInTheDocument(),
      { timeout: VALIDATION_WAIT },
    );
  });

  it("tombol simpan baru aktif setelah ada perubahan", async () => {
    renderEditor();

    expect(saveButton()).toBeDisabled();

    openMeta();
    const title = screen.getByLabelText(/judul cerita/i);
    fireEvent.change(title, { target: { value: "Siklus Air (revisi)" } });

    expect(saveButton()).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent(/belum disimpan/i);
  });

  it("menyimpan memanggil saveStoryDraft dengan versi yang dibuka", async () => {
    saveStoryDraft.mockResolvedValue({
      ok: true,
      version: 4,
      warnings: [],
    });

    renderEditor();
    openMeta();

    fireEvent.change(screen.getByLabelText(/judul cerita/i), {
      target: { value: "Siklus Air (revisi)" },
    });
    fireEvent.click(saveButton());

    await waitFor(() => expect(saveStoryDraft).toHaveBeenCalledTimes(1));

    const input = saveStoryDraft.mock.calls[0]![0] as {
      storyId: string;
      baseVersion: number;
      story: Story;
    };
    expect(input.storyId).toBe("st_siklus_air");
    expect(input.baseVersion).toBe(3);
    expect(input.story.meta.title).toBe("Siklus Air (revisi)");

    // Setelah tersimpan, tidak ada lagi perubahan yang tertunda.
    await waitFor(() => expect(saveButton()).toBeDisabled());
    expect(refresh).toHaveBeenCalled();
  });

  it("urungkan mengembalikan perubahan tanpa memanggil server", async () => {
    renderEditor();

    openMeta();
    const title = screen.getByLabelText(/judul cerita/i);
    const original = (title as HTMLInputElement).value;
    fireEvent.change(title, { target: { value: "Judul sementara" } });
    expect(title).toHaveValue("Judul sementara");

    fireEvent.click(screen.getByRole("button", { name: /urungkan/i }));

    expect(screen.getByLabelText(/judul cerita/i)).toHaveValue(original);
    expect(saveStoryDraft).not.toHaveBeenCalled();
  });

  it("hasil validasi memakai lokasi bahasa manusia dan memblokir publish", async () => {
    const story = loadExample();
    // Teks beat pertama dibuat terlalu panjang supaya validator pasti menolak.
    const firstBeat = story.chapters[0]!.scenes[0]!.beats[0]!;
    if (firstBeat.type === "narration") firstBeat.text = "x".repeat(400);

    renderEditor({ initialStory: story });

    const panel = screen.getByRole("region", { name: /pemeriksaan cerita/i });

    await waitFor(() => expect(panel.textContent).toMatch(/1 error/), {
      timeout: VALIDATION_WAIT,
    });

    // Lokasi masalah memakai bahasa manusia, bukan path JSON. Pesan dari
    // validator boleh menyebut path, tetapi baris lokasi tidak.
    const firstItem = within(panel).getAllByRole("button")[0]!;
    const label = firstItem.querySelector("span.block");
    expect(label?.textContent).toContain("Chapter 1");
    expect(label?.textContent).toContain("beat 1");
    expect(label?.textContent).not.toContain("chapters[");
    expect(screen.getByText(/publish akan diblokir/i)).toBeInTheDocument();
  });

  it("konflik versi tidak menimpa diam-diam", async () => {
    saveStoryDraft.mockResolvedValue({
      ok: false,
      conflict: true,
      latestVersion: 9,
    });

    renderEditor();
    openMeta();

    fireEvent.change(screen.getByLabelText(/judul cerita/i), {
      target: { value: "Judul tab ini" },
    });
    fireEvent.click(saveButton());

    const dialog = await screen.findByRole("heading", {
      name: /sudah berubah di tempat lain/i,
    });
    expect(dialog).toBeInTheDocument();
    // Nomor versi terbaru disebut di badan dialog (terpotong elemen <strong>).
    expect(dialog.parentElement?.textContent).toContain("9");

    // Menimpa versi terbaru memakai nomor versi dari server.
    saveStoryDraft.mockResolvedValue({ ok: true, version: 10, warnings: [] });
    fireEvent.click(
      screen.getByRole("button", { name: /timpa dengan versi saya/i }),
    );

    await waitFor(() => expect(saveStoryDraft).toHaveBeenCalledTimes(2));
    expect(
      (saveStoryDraft.mock.calls[1]![0] as { baseVersion: number }).baseVersion,
    ).toBe(9);
  });

  it("isi cerita bisa disunting lewat panel scene", async () => {
    renderEditor();

    const navigation = screen.getByRole("navigation", {
      name: /struktur cerita/i,
    });
    // Scene kedua chapter pertama dibuka lewat pohon struktur.
    const sceneButtons = within(navigation).getAllByRole("button");
    fireEvent.click(sceneButtons[2]!);

    const beats = screen.getAllByTestId("beat-card");
    expect(beats.length).toBeGreaterThan(0);

    const firstBeat = beats[0]!;
    const textarea = firstBeat.querySelector("textarea");
    expect(textarea).not.toBeNull();

    await act(async () => {
      fireEvent.change(textarea!, { target: { value: "Narasi baru." } });
    });

    expect(saveButton()).toBeEnabled();
    expect((textarea as HTMLTextAreaElement).value).toBe("Narasi baru.");
  });
});
