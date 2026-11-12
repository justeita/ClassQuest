"use client";

import { useMemo } from "react";

import {
  academicYearHint,
  academicYearOptions,
  normalizeAcademicYear,
} from "@/lib/academic-year";

import { SelectMenu, type SelectOption } from "./SelectMenu";

type YearPickerProps = {
  /** `id` tombol pemicu, dihubungkan dengan `<label htmlFor>`. */
  id: string;
  /** Tahun ajaran `YYYY/YYYY`, atau `""` bila belum dipilih. */
  value: string;
  onChange: (year: string) => void;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

/**
 * Pemilih tahun ajaran bertema portal guru.
 *
 * Menggantikan input teks "Tahun Akademik" yang sebelumnya menerima apa saja.
 * Karena tidak ada input teks, karakter aneh tidak bisa masuk sama sekali;
 * nilainya selalu salah satu opsi `YYYY/YYYY` hasil `academicYearOptions()`.
 *
 * Nilai lama yang tidak sah (mis. baris database dari versi sebelumnya) tetap
 * ditampilkan sebagai opsi terpisah supaya guru bisa memperbaikinya lewat
 * picker, bukan lewat teks.
 */
export function YearPicker({ id, value, onChange, ...aria }: YearPickerProps) {
  const options = useMemo<SelectOption[]>(() => {
    const valid = academicYearOptions().map((year) => ({
      value: year,
      label: year,
      hint: academicYearHint(year) ?? undefined,
    }));

    // Pertahankan nilai yang sedang dipakai walau di luar rentang (data lama).
    if (value !== "" && !valid.some((option) => option.value === value)) {
      valid.unshift({
        value,
        label: value,
        hint: "tidak baku",
      });
    }

    return valid;
  }, [value]);

  return (
    <SelectMenu
      id={id}
      value={value}
      onChange={(next) => {
        const normalized = normalizeAcademicYear(next);
        if (normalized !== null) onChange(normalized);
      }}
      options={options}
      placeholder="Pilih tahun ajaran"
      icon={<i className="fa-regular fa-calendar" />}
      aria-describedby={aria["aria-describedby"]}
      aria-invalid={aria["aria-invalid"]}
    />
  );
}
