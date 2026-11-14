"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent } from "react";

import { addStudent, createClassroom } from "@/app/guru/(portal)/kelas/actions";
import type { ClassroomDetail } from "@/server/contracts";

import { currentAcademicYear } from "@/lib/academic-year";

import { Modal } from "./Modal";
import { SelectMenu } from "./SelectMenu";
import { StatCard } from "./StatCard";
import { YearPicker } from "./YearPicker";
import { GRADE_OPTIONS } from "./data";
import { formatUpdatedAt } from "./logic";
import { useToast } from "./toast";

type ClassFormValues = {
  name: string;
  subject: string;
  grade: string;
  year: string;
};

type StudentFormValues = {
  nisn: string;
  nis: string;
  name: string;
};

/** Jumlah baris "Class Activity Feed" yang ditampilkan. */
const ACTIVITY_LIMIT = 8;

type ClassesBrowserProps = {
  /** Data dari `listClassrooms()`; daftar awal kosong bila belum ada kelas. */
  classes: ClassroomDetail[];
};

/**
 * Daftar kelas + tampilan kelola satu kelas.
 *
 * Sumber data adalah tabel `classrooms`/`students` (bukan `data.ts` lagi).
 * Perpindahan daftar ↔ detail tetap memakai state lokal; mutasi (buat kelas,
 * tambah siswa) dikirim ke Server Action di `kelas/actions.ts`, lalu
 * `router.refresh()` memuat ulang daftar dari server.
 *
 * Daftar siswa sengaja **kosong** untuk kelas baru: guru menambahkan sendiri
 * lewat tombol "+ Tambah Siswa", bukan disisipi data contoh.
 */
export function ClassesBrowser({ classes }: ClassesBrowserProps) {
  const router = useRouter();
  const showToast = useToast();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [studentOpen, setStudentOpen] = useState(false);
  const [refreshing, startTransition] = useTransition();

  const active = classes.find((item) => item.id === activeId) ?? null;
  const totalStudents = classes.reduce(
    (total, item) => total + item.students.length,
    0,
  );

  /**
   * Umpan aktivitas dari data nyata: kelas dibuat + siswa ditambahkan.
   * Tidak ada tabel aktivitas terpisah di MVP.
   */
  const activities = useMemo(() => {
    if (active === null) return [];

    return [
      {
        text: `Kelas dibuat dengan kode ${active.code}`,
        at: active.createdAt,
      },
      ...active.students.map((student) => ({
        text: `Siswa ${student.name} ditambahkan ke kelas`,
        at: student.createdAt,
      })),
    ]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, ACTIVITY_LIMIT);
  }, [active]);

  /** @returns pesan error untuk ditampilkan di modal, atau `null` bila sukses. */
  async function buatKelas(values: ClassFormValues): Promise<string | null> {
    const result = await createClassroom(values);
    if (!result.ok) return result.message;

    setCreateOpen(false);
    showToast(
      `Kelas "${result.classroom.name}" dibuat. Kode kelas: ${result.classroom.code}`,
      "success",
    );
    startTransition(() => router.refresh());
    return null;
  }

  /** @returns pesan error untuk ditampilkan di modal, atau `null` bila sukses. */
  async function tambahSiswa(
    values: StudentFormValues,
  ): Promise<string | null> {
    if (active === null) return "Kelas tidak ditemukan. Muat ulang halaman.";

    const result = await addStudent({ classroomId: active.id, ...values });
    if (!result.ok) return result.message;

    setStudentOpen(false);
    showToast(
      `Siswa "${result.student.name}" ditambahkan ke ${active.name}.`,
      "success",
    );
    startTransition(() => router.refresh());
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10" aria-busy={refreshing}>
      {active ? (
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-3 border-b-2 border-slate-200 pb-4 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveId(null)}
                className="guru-press rounded-xl border-2 border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-100"
              >
                <i className="fa-solid fa-arrow-left mr-1" aria-hidden />{" "}
                Kembali ke Daftar Kelas
              </button>
              <h2 className="font-heading text-xl font-extrabold text-slate-900">
                {active.name}
              </h2>
            </div>
            <div className="flex w-fit items-center gap-3">
              <RefreshStatus shown={refreshing} />
              <span className="w-fit rounded-lg border border-amber-300 bg-amber-100 px-3 py-1 font-pixel text-xs text-amber-800">
                Code: {active.code}
              </span>
            </div>
          </div>

          <section className="guru-pixel-card space-y-4 rounded-2xl bg-white p-5">
            <h3 className="flex items-center gap-2 font-pixel text-xs font-bold uppercase text-slate-800">
              <i
                className="fa-solid fa-circle-info text-brand-600"
                aria-hidden
              />{" "}
              1. Class Information
            </h3>
            <dl className="guru-stagger grid grid-cols-1 gap-4 text-xs sm:grid-cols-2 lg:grid-cols-5">
              {[
                { label: "Class Name", value: active.name },
                { label: "Subject", value: active.subject || "—" },
                { label: "Grade Level", value: active.grade || "—" },
                { label: "Class Code", value: active.code, code: true },
                { label: "Academic Year", value: active.year || "—" },
              ].map((info) => (
                <div
                  key={info.label}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <dt className="block text-[10px] font-bold uppercase text-slate-400">
                    {info.label}
                  </dt>
                  <dd
                    className={`text-sm font-bold ${
                      info.code ? "font-pixel text-brand-600" : "text-slate-800"
                    }`}
                  >
                    {info.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="guru-pixel-card space-y-4 rounded-2xl bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 font-pixel text-xs font-bold uppercase text-slate-800">
                <i
                  className="fa-solid fa-graduation-cap text-emerald-600"
                  aria-hidden
                />{" "}
                2. Student List ({active.students.length} Siswa)
              </h3>
              <button
                type="button"
                onClick={() => setStudentOpen(true)}
                className="guru-press rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
              >
                + Tambah Siswa
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-100 font-pixel text-slate-600">
                  <tr>
                    <th className="p-3">NISN</th>
                    <th className="p-3">NIS</th>
                    <th className="p-3">Nama Lengkap</th>
                    <th className="p-3">Bergabung</th>
                  </tr>
                </thead>
                <tbody className="guru-stagger-fade divide-y divide-slate-100">
                  {active.students.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center">
                        <p className="font-semibold text-slate-600">
                          Belum ada siswa di kelas ini.
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          Klik <b>+ Tambah Siswa</b> untuk menambahkan siswa
                          pertama.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    active.students.map((student) => (
                      <tr
                        key={student.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="p-3 font-mono font-bold text-slate-700">
                          {student.nisn ?? "—"}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-700">
                          {student.nis ?? "—"}
                        </td>
                        <td className="p-3 font-semibold text-slate-900">
                          {student.name}
                        </td>
                        <td className="p-3 text-slate-500">
                          {formatUpdatedAt(student.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-[11px] leading-relaxed text-slate-500">
              Siswa masuk ke game lewat{" "}
              <code className="rounded bg-slate-100 px-1">/play</code> dengan
              kode kelas + <b>NIS</b>. NIS yang tidak ada di daftar ini tidak
              bisa masuk, jadi pastikan NIS setiap murid sudah benar.
            </p>
          </section>

          <section className="guru-pixel-card space-y-4 rounded-2xl bg-white p-5">
            <h3 className="flex items-center gap-2 font-pixel text-xs font-bold uppercase text-slate-800">
              <i className="fa-solid fa-gamepad text-indigo-600" aria-hidden />{" "}
              3. Assigned Games
            </h3>
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500">
              Penugasan game ke kelas belum tersedia. Untuk sekarang, bagikan
              tautan <code>/play/&lt;storyId&gt;</code> cerita yang sudah terbit
              langsung ke siswa.
            </p>
          </section>

          <section className="guru-pixel-card space-y-4 rounded-2xl bg-white p-5">
            <h3 className="flex items-center gap-2 font-pixel text-xs font-bold uppercase text-slate-800">
              <i className="fa-solid fa-bolt text-amber-500" aria-hidden /> 4.
              Class Activity Feed
            </h3>
            <ul className="guru-stagger space-y-3">
              {activities.map((activity, index) => (
                <li
                  key={`${activity.at}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                >
                  <span className="font-medium text-slate-700">
                    <i
                      className="fa-solid fa-circle mr-2 text-[6px] text-brand-600"
                      aria-hidden
                    />{" "}
                    {activity.text}
                  </span>
                  <span className="shrink-0 text-[10px] font-bold text-slate-400">
                    {formatUpdatedAt(activity.at)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-4 border-b-2 border-slate-200 pb-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-heading text-2xl font-extrabold text-slate-900">
                My Classes
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Manage your classrooms and students.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <RefreshStatus shown={refreshing} />
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="guru-press-pixel flex items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-brand-600 px-4 py-2.5 font-pixel text-xs font-bold text-white shadow-[3px_3px_0px_#172554] transition hover:bg-brand-700"
              >
                <i className="fa-solid fa-plus" aria-hidden />
                <span>CREATE NEW CLASS</span>
              </button>
            </div>
          </div>

          <div className="guru-stagger grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatCard
              label="Total Classes"
              value={classes.length}
              icon="fa-school"
              tone="blue"
            />
            <StatCard
              label="Total Students"
              value={totalStudents}
              icon="fa-graduation-cap"
              tone="emerald"
            />
          </div>

          <div className="space-y-4">
            <h3 className="font-pixel text-sm font-bold uppercase text-slate-800">
              Daftar Kelas Aktif
            </h3>

            {classes.length === 0 ? (
              <div className="guru-pop rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center">
                <i
                  className="fa-solid fa-school text-2xl text-slate-300"
                  aria-hidden
                />
                <p className="mt-2 text-sm font-bold text-slate-700">
                  Belum ada kelas.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Buat kelas pertama, lalu tambahkan siswa satu per satu di
                  dalamnya.
                </p>
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="guru-press-pixel mt-4 rounded-xl border-2 border-slate-900 bg-brand-600 px-4 py-2 font-pixel text-xs font-bold text-white shadow-[3px_3px_0px_#172554] transition hover:bg-brand-700"
                >
                  BUAT KELAS PERTAMA
                </button>
              </div>
            ) : (
              <div className="guru-stagger grid grid-cols-1 gap-5 md:grid-cols-2">
                {classes.map((item) => (
                  <article
                    key={item.id}
                    className="guru-pixel-card guru-lift group flex flex-col justify-between space-y-4 rounded-2xl bg-white p-5"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 font-pixel text-[10px] font-bold text-brand-700">
                          {item.code}
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          {item.grade || "—"}
                        </span>
                      </div>
                      <h3 className="font-heading text-base font-bold text-slate-900 transition group-hover:text-brand-600">
                        {item.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        <i
                          className="fa-solid fa-book mr-1 text-slate-400"
                          aria-hidden
                        />{" "}
                        {item.subject || "Tanpa mata pelajaran"} • Tahun
                        Akademik {item.year || "—"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                      <span className="font-semibold text-slate-600">
                        <i
                          className="fa-solid fa-users mr-1 text-brand-600"
                          aria-hidden
                        />{" "}
                        {item.students.length} Siswa terdaftar
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveId(item.id)}
                        className="guru-press-pixel rounded-xl border border-slate-900 bg-brand-600 px-3 py-1.5 font-pixel font-bold text-white shadow-[2px_2px_0px_#172554] transition hover:bg-brand-700"
                      >
                        MANAGE CLASS &rarr;
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {createOpen ? (
        <CreateClassModal
          onClose={() => setCreateOpen(false)}
          onCreate={buatKelas}
        />
      ) : null}

      {studentOpen && active !== null ? (
        <AddStudentModal
          classroomName={active.name}
          onClose={() => setStudentOpen(false)}
          onSubmit={tambahSiswa}
        />
      ) : null}
    </div>
  );
}

/**
 * Indikator "loading biasa" untuk penyegaran daftar di latar belakang.
 *
 * Setelah simpan, `router.refresh()` mengambil data baru sementara konten lama
 * masih valid. Menggantinya dengan skeleton akan membuat layar berkedip tanpa
 * alasan; spinner kecil + teks sudah cukup, dan `role="status"` mengumumkannya
 * ke pembaca layar. Kerangka tetap dipakai untuk pemuatan pertama halaman.
 */
function RefreshStatus({ shown }: { shown: boolean }) {
  if (!shown) return null;

  return (
    <span
      role="status"
      className="guru-fade inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500"
    >
      <i
        className="fa-solid fa-spinner animate-spin text-brand-600 motion-reduce:animate-none"
        aria-hidden
      />
      Menyegarkan…
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Modal buat kelas                                                           */
/* -------------------------------------------------------------------------- */

type CreateClassModalProps = {
  onClose: () => void;
  onCreate: (values: ClassFormValues) => Promise<string | null>;
};

function CreateClassModal({ onClose, onCreate }: CreateClassModalProps) {
  const [values, setValues] = useState<ClassFormValues>({
    name: "",
    subject: "",
    grade: GRADE_OPTIONS[0],
    year: currentAcademicYear(),
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function kirim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError(null);

    try {
      const message = await onCreate({
        name: values.name.trim(),
        subject: values.subject.trim(),
        grade: values.grade,
        year: values.year.trim(),
      });

      if (message !== null) {
        setError(message);
        setPending(false);
      }
    } catch {
      // Server Action bisa gagal di level jaringan; jangan biarkan form
      // berhenti di "MENYIMPAN…" tanpa penjelasan.
      setError("Kelas belum tersimpan. Periksa koneksi lalu coba lagi.");
      setPending(false);
    }
  }

  return (
    <Modal open onClose={onClose} labelledBy="create-class-title">
      <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
        <h3
          id="create-class-title"
          className="flex items-center gap-2 font-heading text-base font-bold text-amber-400"
        >
          <i className="fa-solid fa-school" aria-hidden /> Create New Class
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        >
          <i className="fa-solid fa-xmark text-sm" aria-hidden />
          <span className="sr-only">Tutup</span>
        </button>
      </div>

      <form onSubmit={kirim} className="space-y-4 p-6 text-xs">
        <div>
          <label
            htmlFor="newClassName"
            className="mb-1 block font-bold uppercase text-slate-700"
          >
            Nama Kelas
          </label>
          <input
            id="newClassName"
            type="text"
            required
            maxLength={80}
            value={values.name}
            onChange={(event) =>
              setValues((previous) => ({
                ...previous,
                name: event.target.value,
              }))
            }
            placeholder="Contoh: Matematika 10 B"
            className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 px-3.5 py-2.5 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="newClassSubject"
              className="mb-1 block font-bold uppercase text-slate-700"
            >
              Mata Pelajaran
            </label>
            <input
              id="newClassSubject"
              type="text"
              maxLength={60}
              value={values.subject}
              onChange={(event) =>
                setValues((previous) => ({
                  ...previous,
                  subject: event.target.value,
                }))
              }
              placeholder="Contoh: Matematika"
              className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 px-3.5 py-2.5 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label
              htmlFor="newClassGrade"
              className="mb-1 block font-bold uppercase text-slate-700"
            >
              Tingkat Kelas
            </label>
            <SelectMenu
              id="newClassGrade"
              value={values.grade}
              onChange={(grade) =>
                setValues((previous) => ({ ...previous, grade }))
              }
              options={GRADE_OPTIONS.map((grade) => ({
                value: grade,
                label: grade,
              }))}
              placeholder="Pilih tingkat kelas"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="newClassYear"
            className="mb-1 block font-bold uppercase text-slate-700"
          >
            Tahun Akademik
          </label>
          <YearPicker
            id="newClassYear"
            value={values.year}
            onChange={(year) =>
              setValues((previous) => ({ ...previous, year }))
            }
            aria-describedby="newClassYearHint"
          />
          <p
            id="newClassYearHint"
            className="mt-1.5 text-[11px] text-slate-500"
          >
            Dipilih dari daftar, bukan diketik. Format baku{" "}
            <span className="font-mono font-bold text-slate-700">
              2026/2027
            </span>
            , mulai Juli sampai Juni.
          </p>
        </div>

        {error !== null ? (
          <p
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] font-semibold text-rose-700"
          >
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-xl border-2 border-slate-300 px-4 py-2 font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl border border-slate-900 bg-brand-600 px-5 py-2.5 font-pixel font-bold text-white shadow-[2px_2px_0px_#172554] transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "MENYIMPAN…" : "BUAT KELAS"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Modal tambah siswa                                                         */
/* -------------------------------------------------------------------------- */

type AddStudentModalProps = {
  classroomName: string;
  onClose: () => void;
  onSubmit: (values: StudentFormValues) => Promise<string | null>;
};

function AddStudentModal({
  classroomName,
  onClose,
  onSubmit,
}: AddStudentModalProps) {
  const [values, setValues] = useState<StudentFormValues>({
    nisn: "",
    nis: "",
    name: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function kirim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const nama = values.name.trim();
    if (nama === "") {
      setError("Nama lengkap siswa wajib diisi.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const message = await onSubmit({
        name: nama,
        nisn: values.nisn.trim(),
        nis: values.nis.trim(),
      });

      if (message !== null) {
        setError(message);
        setPending(false);
      }
    } catch {
      setError("Siswa belum tersimpan. Periksa koneksi lalu coba lagi.");
      setPending(false);
    }
  }

  return (
    <Modal open onClose={onClose} labelledBy="add-student-title">
      <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
        <h3
          id="add-student-title"
          className="flex items-center gap-2 font-heading text-base font-bold text-emerald-400"
        >
          <i className="fa-solid fa-user-plus" aria-hidden /> Tambah Siswa
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        >
          <i className="fa-solid fa-xmark text-sm" aria-hidden />
          <span className="sr-only">Tutup</span>
        </button>
      </div>

      <form onSubmit={kirim} className="space-y-4 p-6 text-xs">
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
          Siswa akan ditambahkan ke kelas{" "}
          <b className="text-slate-900">{classroomName}</b>. Akun login siswa
          belum dipakai di versi ini; siswa masuk ke game lewat{" "}
          <code className="rounded bg-slate-200/70 px-1">/play</code> dengan
          kode kelas + NIS.
        </p>

        <div>
          <label
            htmlFor="studentNisn"
            className="mb-1 block font-bold uppercase text-slate-700"
          >
            NISN — opsional
          </label>
          <input
            id="studentNisn"
            type="text"
            maxLength={20}
            value={values.nisn}
            onChange={(event) =>
              setValues((previous) => ({
                ...previous,
                nisn: event.target.value,
              }))
            }
            placeholder="Contoh: 0091234567"
            aria-describedby="studentNisnHint"
            className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 px-3.5 py-2.5 font-mono focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p id="studentNisnHint" className="mt-1.5 text-[11px] text-slate-500">
            Nomor induk siswa nasional dari sekolah (biasanya 10 angka). Boleh
            dikosongkan.
          </p>
        </div>

        <div>
          <label
            htmlFor="studentNis"
            className="mb-1 block font-bold uppercase text-slate-700"
          >
            NIS — opsional
          </label>
          <input
            id="studentNis"
            type="text"
            maxLength={20}
            value={values.nis}
            onChange={(event) =>
              setValues((previous) => ({
                ...previous,
                nis: event.target.value,
              }))
            }
            placeholder="Kosongkan untuk nomor otomatis"
            aria-describedby="studentNisHint"
            className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 px-3.5 py-2.5 font-mono focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p id="studentNisHint" className="mt-1.5 text-[11px] text-slate-500">
            Huruf/angka tanpa spasi. Kalau dikosongkan, sistem memberi nomor
            urut mulai 1001. NIS inilah yang diketik siswa untuk masuk di{" "}
            <code className="rounded bg-slate-100 px-1">/play</code>.
          </p>
        </div>

        <div>
          <label
            htmlFor="studentName"
            className="mb-1 block font-bold uppercase text-slate-700"
          >
            Nama Lengkap
          </label>
          <input
            id="studentName"
            type="text"
            required
            maxLength={80}
            value={values.name}
            onChange={(event) =>
              setValues((previous) => ({
                ...previous,
                name: event.target.value,
              }))
            }
            placeholder="Contoh: Andi Pratama"
            className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 px-3.5 py-2.5 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p className="mt-1.5 text-[11px] text-slate-500">
            Nama ini yang muncul di layar konfirmasi siswa setelah NIS-nya
            cocok.
          </p>
        </div>

        {error !== null ? (
          <p
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[11px] font-semibold text-rose-700"
          >
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-xl border-2 border-slate-300 px-4 py-2 font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl border border-slate-900 bg-emerald-600 px-5 py-2.5 font-pixel font-bold text-white shadow-[2px_2px_0px_#064e3b] transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "MENYIMPAN…" : "TAMBAH SISWA"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
