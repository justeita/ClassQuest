import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { KUNCI_PENGATURAN } from "@/game/audioSettings";

import { MainMenu } from "./MainMenu";

/**
 * Menu utama `/demo`.
 *
 * Yang dijaga: menu bisa dijalankan penuh dengan keyboard (panah/W-S memilih,
 * Enter menjalankan, Esc menutup dialog), "Mulai" benar-benar menyerahkan
 * kontrol ke shell, dan dialog Pengaturan menulis volume ke `localStorage`
 * dengan kunci yang sama seperti modul audio game.
 */

// `next/image` hanya dipakai untuk latar dekoratif; di jsdom cukup `<img>`.
vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    createElement("img", { src, alt }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    createElement("a", { href, ...rest }, children),
}));

/** Tekan tombol di badan halaman (bukan di tombol yang sedang fokus). */
function tekan(key: string) {
  fireEvent.keyDown(document.body, { key });
}

function tombol(nama: RegExp) {
  return screen.getByRole("button", { name: nama });
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(cleanup);

describe("MainMenu", () => {
  it("menyorot Mulai sejak awal dan tidak menyalakan apa pun", () => {
    const onMulai = vi.fn();
    render(<MainMenu onMulai={onMulai} />);

    expect(tombol(/^mulai$/i)).toHaveAttribute("aria-current", "true");
    expect(tombol(/^pengaturan$/i)).toHaveAttribute("aria-current", "false");
    expect(onMulai).not.toHaveBeenCalled();
  });

  it("menampilkan keempat pilihan berbahasa Indonesia", () => {
    render(<MainMenu onMulai={vi.fn()} />);

    for (const label of [
      /^mulai$/i,
      /^pengaturan$/i,
      /^kredit$/i,
      /^keluar$/i,
    ]) {
      expect(tombol(label)).toBeInTheDocument();
    }
    // Tidak ada "Lanjutkan": progres belum pernah disimpan.
    expect(
      screen.queryByRole("button", { name: /lanjut/i }),
    ).not.toBeInTheDocument();
  });

  it("panah bawah dan atas memindahkan sorotan, termasuk memutar ujung", () => {
    render(<MainMenu onMulai={vi.fn()} />);

    tekan("ArrowDown");
    expect(tombol(/^pengaturan$/i)).toHaveAttribute("aria-current", "true");
    expect(tombol(/^pengaturan$/i)).toHaveFocus();

    tekan("ArrowDown");
    tekan("ArrowDown");
    expect(tombol(/^keluar$/i)).toHaveAttribute("aria-current", "true");

    // Melewati pilihan terakhir kembali ke pilihan pertama.
    tekan("ArrowDown");
    expect(tombol(/^mulai$/i)).toHaveAttribute("aria-current", "true");

    tekan("ArrowUp");
    expect(tombol(/^keluar$/i)).toHaveAttribute("aria-current", "true");
  });

  it("W dan S juga memindahkan sorotan", () => {
    render(<MainMenu onMulai={vi.fn()} />);

    tekan("s");
    expect(tombol(/^pengaturan$/i)).toHaveAttribute("aria-current", "true");

    tekan("w");
    expect(tombol(/^mulai$/i)).toHaveAttribute("aria-current", "true");
  });

  it("Enter menjalankan pilihan yang tersorot", () => {
    const onMulai = vi.fn();
    render(<MainMenu onMulai={onMulai} />);

    tekan("Enter");
    expect(onMulai).toHaveBeenCalledTimes(1);
  });

  it("klik Mulai menyerahkan kontrol ke shell", () => {
    const onMulai = vi.fn();
    render(<MainMenu onMulai={onMulai} />);

    fireEvent.click(tombol(/^mulai$/i));
    expect(onMulai).toHaveBeenCalledTimes(1);
  });

  it("dengan progres menampilkan Lanjutkan dan mengganti Mulai jadi Mulai ulang", () => {
    const onMulai = vi.fn();
    const onLanjut = vi.fn();
    render(<MainMenu onMulai={onMulai} adaProgres onLanjut={onLanjut} />);

    expect(
      screen.queryByRole("button", { name: /^mulai$/i }),
    ).not.toBeInTheDocument();
    expect(tombol(/^lanjutkan$/i)).toHaveAttribute("aria-current", "true");

    // Enter pada sorotan pertama menjalankan "Lanjutkan", bukan "Mulai ulang".
    tekan("Enter");
    expect(onLanjut).toHaveBeenCalledTimes(1);
    expect(onMulai).not.toHaveBeenCalled();

    // "Mulai ulang" tetap tersedia satu langkah di bawahnya.
    tekan("ArrowDown");
    tekan("Enter");
    expect(onMulai).toHaveBeenCalledTimes(1);
  });

  it("panah bawah dengan progres membungkus lima pilihan", () => {
    render(<MainMenu onMulai={vi.fn()} adaProgres onLanjut={vi.fn()} />);

    tekan("ArrowUp");
    expect(tombol(/^keluar$/i)).toHaveAttribute("aria-current", "true");

    tekan("ArrowDown");
    expect(tombol(/^lanjutkan$/i)).toHaveAttribute("aria-current", "true");
  });

  it("Pengaturan membuka dialog dan menyimpan volume ke localStorage", () => {
    render(<MainMenu onMulai={vi.fn()} />);

    fireEvent.click(tombol(/^pengaturan$/i));
    const dialog = screen.getByRole("dialog", { name: "Pengaturan" });
    expect(dialog).toBeInTheDocument();

    // Slider pertama otomatis fokus: dialog bisa dijalankan tanpa klik.
    expect(screen.getByLabelText("Musik")).toHaveFocus();

    fireEvent.change(screen.getByLabelText("Musik"), {
      target: { value: "40" },
    });
    fireEvent.change(screen.getByLabelText("Efek suara"), {
      target: { value: "70" },
    });
    fireEvent.click(tombol(/^simpan$/i));

    expect(
      JSON.parse(window.localStorage.getItem(KUNCI_PENGATURAN) ?? "null"),
    ).toEqual({ music: 0.4, sfx: 0.7 });
    expect(
      screen.queryByRole("dialog", { name: "Pengaturan" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Volume disimpan.");
  });

  it("Pengaturan menampilkan volume yang sudah tersimpan", () => {
    window.localStorage.setItem(
      KUNCI_PENGATURAN,
      JSON.stringify({ music: 0.2, sfx: 0.6 }),
    );
    render(<MainMenu onMulai={vi.fn()} />);

    fireEvent.click(tombol(/^pengaturan$/i));

    expect(screen.getByLabelText("Musik")).toHaveValue("20");
    expect(screen.getByLabelText("Efek suara")).toHaveValue("60");
  });

  it("Esc menutup dialog dan mengembalikan fokus ke pilihannya", () => {
    render(<MainMenu onMulai={vi.fn()} />);

    fireEvent.click(tombol(/^pengaturan$/i));
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Pengaturan" }), {
      key: "Escape",
    });

    expect(
      screen.queryByRole("dialog", { name: "Pengaturan" }),
    ).not.toBeInTheDocument();
    expect(tombol(/^pengaturan$/i)).toHaveFocus();
  });

  it("tombol Tutup di dialog Kredit menutup dialog", () => {
    render(<MainMenu onMulai={vi.fn()} />);

    fireEvent.click(tombol(/^kredit$/i));
    expect(screen.getByRole("dialog", { name: "Kredit" })).toBeInTheDocument();

    fireEvent.click(tombol(/^tutup$/i));
    expect(
      screen.queryByRole("dialog", { name: "Kredit" }),
    ).not.toBeInTheDocument();
  });

  it("Kredit mencantumkan tim penyusun beserta tautan GitHub", () => {
    render(<MainMenu onMulai={vi.fn()} />);

    fireEvent.click(tombol(/^kredit$/i));
    const dialog = screen.getByRole("dialog", { name: "Kredit" });

    // Panel yang bisa digulir memakai scrollbar bertema, bukan bawaan peramban.
    expect(dialog).toHaveClass("scrollbar-tema");

    // Keempat anggota tim tampil dengan nama dan perannya.
    const daftar = within(dialog);
    expect(daftar.getByText("Marson Arya Bagas Prasetyo")).toBeInTheDocument();
    expect(
      daftar.getByText("Davita Syalom Maria Attira Pandjaitan"),
    ).toBeInTheDocument();
    expect(daftar.getAllByText(/Universitas Negeri Surabaya/)).toHaveLength(4);

    // Tautan GitHub terbuka di tab baru dengan alamat yang benar.
    const tautan = daftar.getByRole("link", { name: "github.com/justeita" });
    expect(tautan).toHaveAttribute("href", "https://github.com/justeita");
    expect(tautan).toHaveAttribute("target", "_blank");
  });

  it("Keluar menawarkan jalan kembali ke pemilihan peran, bukan menutup tab", () => {
    render(<MainMenu onMulai={vi.fn()} />);

    fireEvent.click(tombol(/^keluar$/i));
    expect(
      screen.getByRole("dialog", { name: /keluar dari game/i }),
    ).toBeInTheDocument();

    // Dua tautan bernama "Keluar": tombol menu di belakang dan tautan di dialog.
    const tautan = screen
      .getAllByRole("link", { name: /^keluar$/i })
      .find((el) => el.getAttribute("href") === "/");
    expect(tautan).toBeDefined();
  });

  it("panah tidak memindahkan sorotan selama dialog terbuka", () => {
    render(<MainMenu onMulai={vi.fn()} />);

    fireEvent.click(tombol(/^pengaturan$/i));
    tekan("ArrowDown");

    expect(tombol(/^pengaturan$/i)).toHaveAttribute("aria-current", "true");
  });
});

describe("MainMenu — di perangkat sentuh", () => {
  /**
   * jsdom tidak punya `window.matchMedia`. Palsukan agar perangkat terbaca
   * sebagai ponsel (penunjuk kasar + tidak bisa hover), sama seperti pola
   * `useSentuh.ts`; di desktop (tanpa matchMedia) `useSentuh` bernilai false.
   */
  function pasangSentuh() {
    const asli = window.matchMedia;
    window.matchMedia = ((query: string) =>
      ({
        matches:
          query.includes("pointer: coarse") || query.includes("hover: none"),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList) as typeof window.matchMedia;
    return () => {
      window.matchMedia = asli;
    };
  }

  it("menukar petunjuk keyboard dengan petunjuk sentuh", () => {
    const pulihkan = pasangSentuh();
    try {
      render(<MainMenu onMulai={vi.fn()} />);
      expect(screen.queryByText(/Enter konfirmasi/i)).not.toBeInTheDocument();
      expect(screen.getByText(/ketuk lagi konfirmasi/i)).toBeInTheDocument();
    } finally {
      pulihkan();
    }
  });

  it("tetap menampilkan petunjuk tombol di desktop", () => {
    render(<MainMenu onMulai={vi.fn()} />);
    expect(screen.getByText(/Enter konfirmasi/i)).toBeInTheDocument();
  });

  it("ketukan pertama memindahkan penunjuk tanpa menjalankan aksi", () => {
    const pulihkan = pasangSentuh();
    try {
      render(<MainMenu onMulai={vi.fn()} />);

      fireEvent.click(tombol(/^pengaturan$/i));

      expect(tombol(/^pengaturan$/i)).toHaveAttribute("aria-current", "true");
      expect(
        screen.queryByRole("dialog", { name: "Pengaturan" }),
      ).not.toBeInTheDocument();
    } finally {
      pulihkan();
    }
  });

  it("ketukan kedua pada pilihan yang sama menjalankannya", () => {
    const pulihkan = pasangSentuh();
    try {
      render(<MainMenu onMulai={vi.fn()} />);

      fireEvent.click(tombol(/^pengaturan$/i));
      fireEvent.click(tombol(/^pengaturan$/i));

      expect(
        screen.getByRole("dialog", { name: "Pengaturan" }),
      ).toBeInTheDocument();
    } finally {
      pulihkan();
    }
  });

  it("penunjuk pindah ke tiap pilihan yang diketuk", () => {
    const pulihkan = pasangSentuh();
    try {
      render(<MainMenu onMulai={vi.fn()} />);

      fireEvent.click(tombol(/^keluar$/i));
      expect(tombol(/^keluar$/i)).toHaveAttribute("aria-current", "true");
      expect(tombol(/^mulai$/i)).toHaveAttribute("aria-current", "false");

      fireEvent.click(tombol(/^mulai$/i));
      expect(tombol(/^mulai$/i)).toHaveAttribute("aria-current", "true");
      expect(tombol(/^keluar$/i)).toHaveAttribute("aria-current", "false");
    } finally {
      pulihkan();
    }
  });
});
