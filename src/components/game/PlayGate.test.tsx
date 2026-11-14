import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";

import { DEMO_STORY } from "@/game/demoStory";
import type { JoinGame, JoinOutcome, PlayClassroom } from "@/server/contracts";

/**
 * Gerbang siswa `/play` (`PlayGate`).
 *
 * Yang dijaga (ADR 0041): kolom **kode kelas di atas** kolom **NIS**, kode +
 * NIS dikirim ke Server Action `masukKelas` tanpa nama, NIS yang tidak
 * terdaftar dijawab "NIS tidak ada" dan siswa **tidak** masuk, NIS yang cocok
 * berhenti di **konfirmasi nama lengkap** sebelum `GameShell` dipasang, guru
 * dengan beberapa game menampilkan pilihan dulu, dan tautan demo tetap ke
 * `/demo`.
 *
 * `GameShell` di-mock: Phaser tidak hidup di jsdom, dan yang diuji di sini
 * adalah kontrak gerbang → konfirmasi → shell (`pemainAwal` terisi).
 */

const mocks = vi.hoisted(() => ({ masukKelas: vi.fn() }));

vi.mock("@/app/play/join-actions", () => ({
  masukKelas: mocks.masukKelas,
}));

vi.mock("@/components/game/GameShell", () => ({
  GameShell: ({ pemainAwal }: { pemainAwal: unknown }) =>
    createElement("div", {
      "data-testid": "game-shell",
      "data-pemain": JSON.stringify(pemainAwal),
    }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", { href, ...rest }, children),
}));

const { PlayGate } = await import("./PlayGate");

const CLASSROOM: PlayClassroom = {
  id: "cls_5a",
  name: "Kelas 5A",
  code: "QST-7K3M",
};

const GAMES: JoinGame[] = [
  {
    storyId: "st_air",
    title: "Siklus Air",
    subject: "IPA",
    gradeLevel: "Kelas 5",
  },
  {
    storyId: "st_cahaya",
    title: "Sifat Cahaya",
    subject: "IPA",
    gradeLevel: "Kelas 5",
  },
];

const mainOutcome = (): JoinOutcome => ({
  ok: true,
  jenis: "main",
  story: DEMO_STORY,
  classroom: CLASSROOM,
  students: [{ id: "stu_andi", name: "Andi Pratama", nis: "1001" }],
  pemain: { studentId: "stu_andi", name: "Andi Pratama" },
});

const isiForm = (kode = CLASSROOM.code, nis = "1001") => {
  fireEvent.change(screen.getByLabelText(/kode kelas/i), {
    target: { value: kode },
  });
  fireEvent.change(screen.getByLabelText(/^nis$/i), {
    target: { value: nis },
  });
  fireEvent.click(screen.getByRole("button", { name: /masuk ke cerita/i }));
};

beforeEach(() => {
  mocks.masukKelas.mockReset();
});

afterEach(cleanup);

describe("PlayGate — form", () => {
  it("menempatkan kolom kode kelas di atas kolom NIS", () => {
    render(<PlayGate />);

    const kode = screen.getByLabelText(/kode kelas/i);
    const nis = screen.getByLabelText(/^nis$/i);

    expect(
      kode.compareDocumentPosition(nis) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // Nama/username tidak lagi diminta di gerbang.
    expect(
      screen.queryByLabelText(/nama atau username/i),
    ).not.toBeInTheDocument();
  });

  it("menautkan demo ke /demo tanpa meminta kode kelas", () => {
    render(<PlayGate />);

    expect(
      screen.getByRole("link", { name: /coba demo tanpa kode kelas/i }),
    ).toHaveAttribute("href", "/demo");
  });

  it("kode kosong dijawab lokal, tanpa memanggil server", () => {
    render(<PlayGate />);

    fireEvent.change(screen.getByLabelText(/^nis$/i), {
      target: { value: "1001" },
    });
    fireEvent.click(screen.getByRole("button", { name: /masuk ke cerita/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/QST-XXXX/);
    expect(mocks.masukKelas).not.toHaveBeenCalled();
  });

  it("NIS kosong dijawab lokal setelah kode diisi", () => {
    render(<PlayGate />);

    fireEvent.change(screen.getByLabelText(/kode kelas/i), {
      target: { value: CLASSROOM.code },
    });
    fireEvent.click(screen.getByRole("button", { name: /masuk ke cerita/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/isi nis/i);
    expect(mocks.masukKelas).not.toHaveBeenCalled();
  });
});

describe("PlayGate — jalan masuk", () => {
  it("kode + NIS yang sah berhenti di konfirmasi nama lengkap", async () => {
    mocks.masukKelas.mockResolvedValue(mainOutcome());
    render(<PlayGate />);

    isiForm(CLASSROOM.code, "  1001 ");

    // Nama lengkap datang dari server, bukan dari input siswa.
    expect(await screen.findByText(/ini kamu, benar\?/i)).toBeInTheDocument();
    expect(screen.getByText("Andi Pratama")).toBeInTheDocument();
    expect(mocks.masukKelas).toHaveBeenCalledTimes(1);
    expect(mocks.masukKelas).toHaveBeenCalledWith({
      kode: CLASSROOM.code,
      nis: "1001",
    });
    // Belum masuk game sebelum siswa mengonfirmasi.
    expect(screen.queryByTestId("game-shell")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /benar, lanjut main/i }),
    );

    const shell = await screen.findByTestId("game-shell");
    expect(JSON.parse(shell.dataset.pemain ?? "null")).toEqual({
      studentId: "stu_andi",
      name: "Andi Pratama",
    });
    // Tidak ada layar NIS kedua: form sudah tidak ada.
    expect(screen.queryByLabelText(/kode kelas/i)).not.toBeInTheDocument();
  });

  it("NIS yang tidak ada di daftar guru tidak bisa masuk", async () => {
    mocks.masukKelas.mockResolvedValue({
      ok: false,
      reason: "nis_not_found",
    });
    render(<PlayGate />);

    isiForm(CLASSROOM.code, "9999");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /nis itu tidak ada di daftar murid/i,
    );
    // Tetap di form, tanpa konfirmasi dan tanpa game.
    expect(screen.queryByTestId("game-shell")).not.toBeInTheDocument();
    expect(screen.queryByText(/ini kamu, benar\?/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^nis$/i)).toBeInTheDocument();
  });

  it("tombol 'bukan saya' kembali ke kolom NIS yang kosong", async () => {
    mocks.masukKelas.mockResolvedValue(mainOutcome());
    render(<PlayGate />);

    isiForm();
    await screen.findByText(/ini kamu, benar\?/i);

    fireEvent.click(screen.getByRole("button", { name: /bukan saya/i }));

    expect(await screen.findByLabelText(/^nis$/i)).toHaveValue("");
    expect(screen.queryByTestId("game-shell")).not.toBeInTheDocument();
  });

  it("NIS yang mirip lebih dari satu murid menampilkan pilihan NIS", async () => {
    mocks.masukKelas.mockResolvedValueOnce({
      ok: false,
      reason: "nis_ambiguous",
      candidates: [
        { studentId: "stu_a", name: "Andi Pratama", nis: "2026.001" },
        { studentId: "stu_b", name: "Budi Santoso", nis: "2026001" },
      ],
    });
    render(<PlayGate />);

    isiForm(CLASSROOM.code, "2026001");

    expect(
      await screen.findByText(/beberapa murid dengan nis yang mirip/i),
    ).toBeInTheDocument();

    mocks.masukKelas.mockResolvedValueOnce(mainOutcome());
    fireEvent.click(screen.getByRole("button", { name: /2026\.001/i }));

    await screen.findByText(/ini kamu, benar\?/i);
    expect(mocks.masukKelas).toHaveBeenLastCalledWith({
      kode: CLASSROOM.code,
      nis: "2026.001",
    });
  });

  it("beberapa game menampilkan pilihan lalu mengirim storyId", async () => {
    mocks.masukKelas.mockResolvedValue({
      ok: true,
      jenis: "pilih",
      classroom: CLASSROOM,
      games: GAMES,
    });
    render(<PlayGate />);

    isiForm();

    expect(
      await screen.findByRole("button", { name: /Siklus Air/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Sifat Cahaya/ }),
    ).toBeInTheDocument();

    mocks.masukKelas.mockResolvedValue(mainOutcome());
    fireEvent.click(screen.getByRole("button", { name: /Sifat Cahaya/ }));

    await screen.findByText(/ini kamu, benar\?/i);
    expect(mocks.masukKelas).toHaveBeenLastCalledWith({
      kode: CLASSROOM.code,
      nis: "1001",
      storyId: "st_cahaya",
    });
  });

  it("menampilkan pesan penolakan server di form", async () => {
    mocks.masukKelas.mockResolvedValue({ ok: false, reason: "not_found" });
    render(<PlayGate />);

    isiForm("QST-0000");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /tidak dikenali/i,
    );
    expect(screen.queryByTestId("game-shell")).not.toBeInTheDocument();
  });

  it("batas percobaan dijelaskan tanpa membocorkan apa pun", async () => {
    mocks.masukKelas.mockResolvedValue({ ok: false, reason: "rate_limited" });
    render(<PlayGate />);

    isiForm();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /terlalu banyak percobaan/i,
    );
  });

  it("kegagalan jaringan dijawab pesan ramah, bukan error mentah", async () => {
    mocks.masukKelas.mockRejectedValue(new Error("koneksi putus"));
    render(<PlayGate />);

    isiForm();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /tidak bisa menghubungi server/i,
    );
  });
});

describe("PlayGate — ganti kelas", () => {
  it("tombol ganti kelas mengembalikan ke form kode yang kosong", async () => {
    mocks.masukKelas.mockResolvedValue(mainOutcome());
    render(<PlayGate />);

    isiForm();
    await screen.findByText(/ini kamu, benar\?/i);
    fireEvent.click(
      screen.getByRole("button", { name: /benar, lanjut main/i }),
    );
    await screen.findByTestId("game-shell");

    fireEvent.click(screen.getByRole("button", { name: /ganti kelas/i }));

    const kode = await screen.findByLabelText(/kode kelas/i);
    expect(kode).toHaveValue("");
    expect(screen.getByLabelText(/^nis$/i)).toHaveValue("");
    expect(screen.queryByTestId("game-shell")).not.toBeInTheDocument();
  });
});
