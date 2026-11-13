"use client";

import type { NpcNameplate as NameplateView } from "@/game/gameBus";
import { cqw, persenLebar, persenTinggi, ukuranHuruf } from "@/game/layout";

type NpcNameplateProps = {
  plate: NameplateView;
};

/**
 * Papan nama NPC di atas kepalanya. Dikirim untuk **semua** NPC yang terlihat,
 * bukan hanya pemberi quest, supaya pemain mengenali siapa saja di desa.
 *
 * Gaya chip mengikuti HUD (`bg-[#0b120e]/85` + garis `#3D4B41`), senada dengan
 * kotak `!` dan beacon. Nama panjang dipotong dengan elipsis agar tidak
 * menutupi dunia; `aria-hidden` karena dunia game tetap bisa dibaca lewat
 * dialog dan jurnal.
 */
export function NpcNameplate({ plate }: NpcNameplateProps) {
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full font-game"
      style={{ left: persenLebar(plate.x), top: persenTinggi(plate.y) }}
      data-nama-npc={plate.npcId}
      aria-hidden="true"
    >
      <span
        className="block overflow-hidden text-ellipsis whitespace-nowrap border border-[#3D4B41] bg-[#0b120e]/85 font-bold leading-none tracking-wide text-[#F7F4EC]"
        style={{
          maxWidth: cqw(120),
          fontSize: ukuranHuruf(10, 10, 20),
          paddingInline: cqw(3),
          paddingBlock: cqw(1),
        }}
      >
        {plate.nama}
      </span>
    </div>
  );
}
