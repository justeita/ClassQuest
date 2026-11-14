"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  bacaPengaturanAudio,
  clampVolume,
  PENGATURAN_DEFAULT,
  simpanPengaturanAudio,
  type PengaturanAudio,
} from "@/game/audioSettings";

type MainMenuProps = {
  /** Dipanggil saat siswa memilih "Mulai"; Phaser baru dipasang setelahnya. */
  onMulai: () => void;
};

/** Pilihan menu, urut dari atas. `id` dipakai untuk aksi, bukan label. */
const PILIHAN = [
  { id: "mulai", label: "Mulai" },
  { id: "pengaturan", label: "Pengaturan" },
  { id: "kredit", label: "Kredit" },
  { id: "keluar", label: "Keluar" },
] as const;

type AksiMenu = (typeof PILIHAN)[number]["id"];

/** Dialog yang bisa terbuka dari menu; satu dialog pada satu waktu. */
type Dialog = Exclude<AksiMenu, "mulai"> | null;

/**
 * Tim penyusun ClassQuest (LOGICODIX 2026). Ditulis di dalam kode, bukan diambil
 * dari server: menu utama dirender statis dan kredit tidak berubah. Ditampilkan
 * sebagai daftar bertumpuk (bukan tabel empat kolom) karena panel dialog sempit
 * di ponsel — nama panjang akan terpotong kalau dipaksa satu baris.
 */
const TIM_KREDIT = [
  {
    nama: "Marson Arya Bagas Prasetyo",
    peran: "Ketua tim",
    kampus: "Universitas Negeri Surabaya",
    github: "github.com/justeita",
  },
  {
    nama: "Muhammad Geral Herpavy",
    peran: "Anggota 1",
    kampus: "Universitas Negeri Surabaya",
    github: "github.com/Gerraldd",
  },
  {
    nama: "Fadhlurrahman Akwa Qinthara",
    peran: "Anggota 2",
    kampus: "Universitas Negeri Surabaya",
    github: "github.com/akwaqinthara",
  },
  {
    nama: "Davita Syalom Maria Attira Pandjaitan",
    peran: "Anggota 3",
    kampus: "Universitas Negeri Surabaya",
    github: "github.com/davitapandjaitan",
  },
] as const;

/**
 * Kelopak sakura yang berguguran. Nilainya ditulis tetap (bukan
 * `Math.random()`) supaya render server dan client sama — kelopak acak akan
 * memicu hydration mismatch. Semua posisi berada di paruh kanan layar, tempat
 * pohon sakura di gambar, jadi tidak ada yang jatuh menimpa teks menu.
 */
const KELOPAK = [
  {
    nama: "s1",
    kiri: 63,
    jeda: 0,
    durasi: 19,
    geser: 60,
    putar: 260,
    ukuran: 6,
    opasitas: 0.75,
  },
  {
    nama: "s2",
    kiri: 69,
    jeda: 3.4,
    durasi: 23,
    geser: 90,
    putar: 200,
    ukuran: 4,
    opasitas: 0.55,
  },
  {
    nama: "s3",
    kiri: 74,
    jeda: 7.1,
    durasi: 17,
    geser: -40,
    putar: 300,
    ukuran: 7,
    opasitas: 0.7,
  },
  {
    nama: "s4",
    kiri: 79,
    jeda: 1.6,
    durasi: 21,
    geser: 50,
    putar: 240,
    ukuran: 5,
    opasitas: 0.6,
  },
  {
    nama: "s5",
    kiri: 83,
    jeda: 9.3,
    durasi: 25,
    geser: -70,
    putar: 320,
    ukuran: 7,
    opasitas: 0.7,
  },
  {
    nama: "s6",
    kiri: 87,
    jeda: 4.8,
    durasi: 18,
    geser: 30,
    putar: 180,
    ukuran: 4,
    opasitas: 0.5,
  },
  {
    nama: "s7",
    kiri: 91,
    jeda: 12.2,
    durasi: 22,
    geser: -50,
    putar: 280,
    ukuran: 6,
    opasitas: 0.65,
  },
  {
    nama: "s8",
    kiri: 95,
    jeda: 6.5,
    durasi: 20,
    geser: 40,
    putar: 220,
    ukuran: 5,
    opasitas: 0.5,
  },
] as const;

/**
 * Menu utama game (`/game`) — docs/05-frontend/game-player.md → Menu utama.
 *
 * Ini pintu masuk demo: empat pilihan, bisa dijalankan penuh dengan keyboard
 * (panah/W-S memilih, Enter/Space menjalankan, Esc menutup dialog). Teks menu
 * diletakkan langsung di atas gambar desa — di bawah naungan pohon di kiri atas,
 * tempat gambar sudah gelap — bukan di dalam panel, supaya seluruh desa tetap
 * terlihat.
 *
 * "Mulai" menyerahkan kontrol ke `GameShell`, yang masih menampilkan layar judul
 * cerita. Progres `localStorage` belum ada, jadi tombol "Lanjutkan" sengaja
 * tidak ditampilkan: menu tidak boleh menjanjikan simpanan yang belum dibuat.
 */
export function MainMenu({ onMulai }: MainMenuProps) {
  const [aktif, setAktif] = useState(0);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [pesan, setPesan] = useState<string | null>(null);

  // Draf pengaturan. Nilai awalnya default — `localStorage` tidak ada saat
  // render server, jadi nilai tersimpan baru dibaca saat dialog dibuka
  // (`jalankan`). Membacanya di `useEffect` memicu render berantai dan
  // hydration mismatch; membaca saat klik aman karena dialog belum tampil.
  const [pengaturan, setPengaturan] =
    useState<PengaturanAudio>(PENGATURAN_DEFAULT);

  const tombolRef = useRef<Array<HTMLButtonElement | null>>([]);
  const pesanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pesanTimer.current !== null) clearTimeout(pesanTimer.current);
    };
  }, []);

  const beriPesan = useCallback((teks: string) => {
    setPesan(teks);
    if (pesanTimer.current !== null) clearTimeout(pesanTimer.current);
    pesanTimer.current = setTimeout(() => setPesan(null), 2600);
  }, []);

  const pilih = useCallback((indeks: number) => {
    const jumlah = PILIHAN.length;
    const berikut = (indeks + jumlah) % jumlah;
    setAktif(berikut);
    tombolRef.current[berikut]?.focus({ preventScroll: true });
  }, []);

  const tutupDialog = useCallback(() => {
    setDialog(null);
    const indeks = PILIHAN.findIndex((pilihan) => pilihan.id === dialog);
    tombolRef.current[indeks >= 0 ? indeks : aktif]?.focus({
      preventScroll: true,
    });
  }, [aktif, dialog]);

  const jalankan = useCallback(
    (aksi: AksiMenu) => {
      if (aksi === "mulai") {
        onMulai();
        return;
      }
      // Dibaca tepat sebelum dialog dibuka: selalu mengikuti simpanan terakhir,
      // dan tidak ada `localStorage` yang disentuh saat render.
      if (aksi === "pengaturan") {
        setPengaturan(bacaPengaturanAudio(window.localStorage));
      }
      setDialog(aksi);
    },
    [onMulai],
  );

  /**
   * Panah/W-S dan Enter/Space ditangkap di level dokumen supaya menu bisa
   * dipakai tanpa mengklik lebih dulu — sama seperti menu judul game lain.
   * `Tab` tidak pernah diambil alih, dan selama dialog terbuka menu diam
   * (fokus milik dialog).
   */
  useEffect(() => {
    if (dialog !== null) return;

    function tanganiTombol(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const sasaran = event.target;
      const padaKontrol =
        sasaran instanceof HTMLElement &&
        sasaran.closest("button, a, input, select, textarea") !== null;

      if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") {
        event.preventDefault();
        pilih(aktif + 1);
        return;
      }

      if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") {
        event.preventDefault();
        pilih(aktif - 1);
        return;
      }

      if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        pilih(event.key === "Home" ? 0 : PILIHAN.length - 1);
        return;
      }

      if (event.key !== "Enter" && event.key !== " ") return;

      // Tombol yang sedang fokus sudah menangani Enter/Space sendiri; kalau
      // fokus ada di badan halaman, Enter menjalankan pilihan yang tersorot.
      if (padaKontrol) return;

      event.preventDefault();
      jalankan(PILIHAN[aktif].id);
    }

    document.addEventListener("keydown", tanganiTombol);
    return () => document.removeEventListener("keydown", tanganiTombol);
  }, [aktif, dialog, jalankan, pilih]);

  function simpanPengaturan() {
    const aman = simpanPengaturanAudio(pengaturan, window.localStorage);
    setPengaturan(aman);
    tutupDialog();
    beriPesan("Volume disimpan.");
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0b120e] text-[#F7F4EC]">
      <Dunia />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      >
        {KELOPAK.map((kelopak) => (
          <span
            key={kelopak.nama}
            className="menu-kelopak absolute top-0 block rounded-[50%_0_50%_50%] bg-[#E9A6B8]"
            style={
              {
                left: `${kelopak.kiri}%`,
                width: `${kelopak.ukuran}px`,
                height: `${kelopak.ukuran + 2}px`,
                "--kelopak-jeda": `${kelopak.jeda}s`,
                "--kelopak-durasi": `${kelopak.durasi}s`,
                "--kelopak-geser": `${kelopak.geser}px`,
                "--kelopak-putar": `${kelopak.putar}deg`,
                "--kelopak-opasitas": `${kelopak.opasitas}`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      {/* Elemen hidup seluruh layar, bukan `<main>`: halaman induk sudah punya
          `<main>`, dan menu ini hanya satu fase di dalamnya. */}
      <section
        aria-label="Menu utama Class Quest"
        className="absolute inset-0 z-20 flex flex-col justify-start px-6 pt-[max(1.75rem,5vh)] pb-6 sm:px-10 lg:pt-[9vh] lg:pl-[clamp(2.5rem,6vw,6rem)]"
      >
        <div className="menu-panel w-[min(78vw,320px)]">
          <h1
            aria-label="Class Quest"
            className="menu-judul text-[clamp(2rem,4.2vw,3.4rem)]"
          >
            <span aria-hidden="true" className="block">
              CLASS
            </span>
            <span aria-hidden="true" className="block">
              QUEST
            </span>
          </h1>

          <div
            aria-hidden="true"
            className="mt-2.5 flex w-full items-center gap-2 text-[#e7c45d]"
          >
            <i className="menu-garis h-0.5 w-8" />
            <b className="menu-bintang text-base leading-none font-normal">✦</b>
            <i className="menu-garis h-0.5 w-8" />
          </div>

          <nav aria-label="Menu utama" className="mt-7">
            <ul className="grid gap-2">
              {PILIHAN.map((pilihan, indeks) => {
                const terpilih = indeks === aktif;
                return (
                  <li key={pilihan.id}>
                    <button
                      ref={(el) => {
                        tombolRef.current[indeks] = el;
                      }}
                      type="button"
                      aria-current={terpilih ? "true" : "false"}
                      onClick={() => {
                        setAktif(indeks);
                        jalankan(pilihan.id);
                      }}
                      onFocus={() => setAktif(indeks)}
                      onMouseEnter={() => setAktif(indeks)}
                      className="menu-item relative flex min-h-11 w-full items-center text-left"
                    >
                      <span
                        aria-hidden="true"
                        className="menu-panah absolute top-1/2 -translate-y-1/2"
                      />
                      {pilihan.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <p className="menu-kredit mt-5">
            <span aria-hidden="true">↑ ↓</span> pilih · Enter konfirmasi
          </p>
        </div>

        <p className="menu-kredit mt-auto pt-6">Class Quest • Menu utama</p>
      </section>

      {dialog === "pengaturan" && (
        <PanelDialog
          judul="Pengaturan"
          onTutup={tutupDialog}
          aksi={
            <>
              <TombolDialog onClick={tutupDialog}>Tutup</TombolDialog>
              <TombolDialog utama onClick={simpanPengaturan}>
                Simpan
              </TombolDialog>
            </>
          }
        >
          <p className="font-game text-sm leading-relaxed text-[#c5cbb9]">
            Volume disimpan di peramban ini dan dipakai saat permainan dimulai.
            Musik dan efek suara diatur terpisah.
          </p>
          <BarisVolume
            label="Musik"
            nilai={pengaturan.music}
            onUbah={(music) => setPengaturan((lama) => ({ ...lama, music }))}
          />
          <BarisVolume
            label="Efek suara"
            nilai={pengaturan.sfx}
            onUbah={(sfx) => setPengaturan((lama) => ({ ...lama, sfx }))}
          />
        </PanelDialog>
      )}

      {dialog === "kredit" && (
        <PanelDialog
          judul="Kredit"
          onTutup={tutupDialog}
          aksi={
            <TombolDialog utama onClick={tutupDialog}>
              Tutup
            </TombolDialog>
          }
        >
          <p className="font-game text-sm leading-relaxed text-[#c5cbb9]">
            <strong className="font-normal text-[#f4e8c4]">ClassQuest</strong>{" "}
            mengubah materi pelajaran menjadi game pixel bercerita. Dibuat oleh
            tim ClassQuest untuk LOGICODIX 2026.
          </p>

          {/* Tim penyusun. Daftar bertumpuk, bukan tabel empat kolom, supaya
              nama panjang dan tautan GitHub tetap terbaca di panel sempit. */}
          <ul className="mt-4 space-y-3 border-t border-[#9e7833]/40 pt-4">
            {TIM_KREDIT.map((orang) => (
              <li key={orang.github} className="font-game">
                <p className="text-sm text-[#f4e8c4]">{orang.nama}</p>
                <p className="text-xs text-[#a7b39e]">
                  {orang.peran} · {orang.kampus}
                </p>
                <a
                  href={`https://${orang.github}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#e7c45d] underline underline-offset-2 hover:text-[#f7ebc9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e7c45d]"
                >
                  {orang.github}
                </a>
              </li>
            ))}
          </ul>

          <p className="mt-3 font-game text-sm leading-relaxed text-[#c5cbb9]">
            Peta desa, karakter, dan musik disiapkan di awal dan dipakai ulang
            oleh semua cerita; teks game memakai Patrick Hand (SIL Open Font
            License).
          </p>
          <p className="mt-3 font-game text-sm leading-relaxed text-[#c5cbb9]">
            Cerita yang kamu mainkan disusun dari materi yang diunggah guru,
            lalu diperiksa guru sebelum diterbitkan.
          </p>
        </PanelDialog>
      )}

      {dialog === "keluar" && (
        <PanelDialog
          judul="Keluar dari game?"
          onTutup={tutupDialog}
          aksi={
            <>
              <TombolDialog utama onClick={tutupDialog}>
                Tetap di sini
              </TombolDialog>
              <Link
                href="/"
                onClick={tutupDialog}
                className="inline-flex min-h-11 items-center border border-[#9e7833] bg-[#263322] px-4 font-game text-sm tracking-[0.1em] uppercase text-[#f7ebc9] hover:border-[#e7c45d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e7c45d]"
              >
                Keluar
              </Link>
            </>
          }
        >
          <p className="font-game text-sm leading-relaxed text-[#c5cbb9]">
            Kamu akan kembali ke halaman pemilihan peran. Progres permainan
            belum tersimpan, jadi cerita akan dimulai dari awal lagi.
          </p>
        </PanelDialog>
      )}

      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none absolute bottom-6 left-1/2 z-40 -translate-x-1/2 border border-[#9e7833] bg-[#08140e]/95 px-4 py-2 font-game text-sm text-[#f1e8cf] transition-opacity duration-200 ${
          pesan === null ? "opacity-0" : "opacity-100"
        }`}
      >
        {pesan}
      </div>
    </div>
  );
}

/**
 * Latar desa. Satu gambar utuh — bukan peta permainan — karena menu ini layar
 * pembuka: desa harus terlihat lengkap dalam satu bidikan.
 *
 * Gambar disimpan di `public/menu/`, **di luar** `public/assets/`: berkas di
 * sana semuanya terdaftar di manifest aset, dan menu ini tidak butuh id aset
 * karena tidak pernah dipakai cerita (`docs/07-assets/asset-guide.md`).
 */
function Dunia() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <Image
        src="/menu/desa.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-[62%_center]"
      />

      {/* Kabut tipis di sisi kiri, tempat teks menu berdiri. Di gambar aslinya
          area itu sudah teduh di bawah pohon; lapisan ini menstabilkannya
          untuk layar kecil, tempat papan teks memakan hampir separuh layar. */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#04120b]/85 via-[#04120b]/45 to-transparent md:hidden" />
      <div className="absolute inset-0 hidden bg-gradient-to-br from-[#04120b]/75 via-[#04120b]/20 to-transparent to-[55%] md:block" />
      {/* Sedikit gelap di tepi bawah supaya label versi tetap terbaca. */}
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#05130c]/55 to-transparent" />
    </div>
  );
}

type PanelDialogProps = {
  judul: string;
  children: React.ReactNode;
  aksi: React.ReactNode;
  onTutup: () => void;
};

/**
 * Kerangka dialog menu: panel gelap bergaris kuningan. Fokus pindah ke kontrol
 * pertama saat terbuka; Esc (ditangani `panelRef` → `onKeyDown`) dan klik di
 * luar panel menutupnya.
 */
function PanelDialog({ judul, children, aksi, onTutup }: PanelDialogProps) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    panelRef.current
      ?.querySelector<HTMLElement>("input, button, a")
      ?.focus({ preventScroll: true });
  }, []);

  return (
    <div
      // `mousedown`, bukan `click`: klik yang dimulai di dalam panel lalu
      // dilepas di luar (mis. menyeret slider) tidak boleh menutup dialog.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onTutup();
      }}
      className="absolute inset-0 z-30 grid place-items-center bg-[#020805]/75 p-5 backdrop-blur-[2px]"
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="judul-dialog-menu"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            onTutup();
          }
        }}
        className="max-h-[85vh] w-full max-w-sm overflow-y-auto border-2 border-[#9e7833] bg-gradient-to-br from-[#17271c] to-[#0a150f] p-6 shadow-[0_0_0_1px_rgb(0_0_0_/_0.6),0_18px_40px_rgb(0_0_0_/_0.5)]"
      >
        <h2
          id="judul-dialog-menu"
          className="font-game text-lg tracking-[0.18em] uppercase text-[#e7c45d]"
        >
          {judul}
        </h2>
        <div className="mt-3">{children}</div>
        <div className="mt-6 flex flex-wrap justify-end gap-2.5">{aksi}</div>
      </section>
    </div>
  );
}

/** Tombol aksi di dalam dialog menu. */
function TombolDialog({
  children,
  utama = false,
  onClick,
}: {
  children: React.ReactNode;
  utama?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 items-center border px-4 font-game text-sm tracking-[0.1em] uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e7c45d] ${
        utama
          ? "border-[#e7c45d] bg-[#6b512b] text-[#f7ebc9] hover:bg-[#7d5f31]"
          : "border-[#9e7833] bg-[#263322] text-[#f7ebc9] hover:border-[#e7c45d]"
      }`}
    >
      {children}
    </button>
  );
}

/** Satu baris pengaturan volume: label, persen, dan slider 0–100. */
function BarisVolume({
  label,
  nilai,
  onUbah,
}: {
  label: string;
  /** Volume 0–1, sama dengan `PengaturanAudio`. */
  nilai: number;
  onUbah: (nilai: number) => void;
}) {
  const id = `menu-volume-${label.toLowerCase().replace(/ /g, "-")}`;
  const persen = Math.round(nilai * 100);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="font-game text-base text-[#e0e4d7]">
          {label}
        </label>
        <span className="font-game text-sm tabular-nums text-[#a7b39e]">
          {persen}%
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={persen}
        aria-valuetext={`${persen}%`}
        onChange={(event) =>
          onUbah(clampVolume(Number(event.target.value) / 100))
        }
        className="mt-1 h-1.5 w-full accent-[#E8A87C]"
      />
    </div>
  );
}
