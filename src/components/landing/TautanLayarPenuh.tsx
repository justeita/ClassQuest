"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

import { masukLayarPenuhLanskap } from "@/game/layarPenuh";

type TautanLayarPenuhProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

/**
 * Tautan masuk permainan yang sekaligus meminta layar penuh mendatar.
 *
 * Dipakai kartu "Arena Siswa" di halaman utama. Permintaan layar penuh
 * dikirim di dalam penanganan klik supaya peramban menganggapnya gestur
 * pengguna; navigasi `next/link` tetap berjalan dan **tidak** mengganti
 * dokumen, jadi layar penuh bertahan sampai halaman game terbuka.
 *
 * Klik dengan tombol pengubah (Ctrl/Cmd/Shift/tengah) dibiarkan apa adanya:
 * pemain mungkin ingin membuka tab baru, dan permintaan layar penuh di tab
 * saat ini justru mengganggu.
 */
export function TautanLayarPenuh({
  href,
  className,
  children,
}: TautanLayarPenuhProps) {
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.defaultPrevented) return;
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    void masukLayarPenuhLanskap();
  }

  return (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
