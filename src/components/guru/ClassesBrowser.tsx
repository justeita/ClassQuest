"use client";

import { useState, type FormEvent } from "react";

import { Modal } from "./Modal";
import { StatCard } from "./StatCard";
import {
  CLASSROOMS,
  GRADE_OPTIONS,
  PORTAL_STATS,
  type Classroom,
  type Student,
} from "./data";
import { buatKodeKelas } from "./logic";
import { useToast } from "./toast";

type ClassFormValues = {
  name: string;
  subject: string;
  grade: string;
  year: string;
};

/**
 * Daftar kelas + tampilan kelola satu kelas.
 *
 * Perpindahan daftar ↔ detail memakai state lokal (di prototipe HTML juga
 * begitu, hanya menyembunyikan `<div>`). Kelas dan penugasan game yang diubah
 * pengguna hidup di state ini saja — belum ada penyimpanan.
 */
export function ClassesBrowser() {
  const showToast = useToast();

  const [classes, setClasses] = useState<Classroom[]>(CLASSROOMS);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const active = classes.find((item) => item.id === activeId) ?? null;
  const totalStudents = classes.reduce(
    (total, item) => total + item.studentsCount,
    0,
  );

  function buatKelas(values: ClassFormValues) {
    const code = buatKodeKelas();
    const baru: Classroom = {
      id: Math.max(0, ...classes.map((item) => item.id)) + 1,
      name: values.name,
      subject: values.subject,
      grade: values.grade,
      code,
      year: values.year,
      studentsCount: 1,
      students: [{ nis: "1001", name: "Siswa Contoh", level: 1, xp: "100 XP" }],
      assignedGames: [],
      activities: [
        {
          text: `Kelas ${values.name} berhasil dibuat dengan kode ${code}`,
          time: "Baru saja",
        },
      ],
    };

    setClasses((previous) => [...previous, baru]);
    setCreateOpen(false);
    showToast(
      `Kelas "${values.name}" berhasil dibuat! Kode: ${code}`,
      "success",
    );
  }

  function hapusPenugasan(classId: number, index: number) {
    setClasses((previous) =>
      previous.map((item) =>
        item.id === classId
          ? {
              ...item,
              assignedGames: item.assignedGames.filter(
                (_, position) => position !== index,
              ),
            }
          : item,
      ),
    );
    showToast("Penugasan game dihapus.", "success");
  }

  function bukaProfil(student: Student) {
    showToast(`Detail siswa ${student.name} dibuka`, "info");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      {active ? (
        <div className="space-y-6">
          <div className="flex flex-col justify-between gap-3 border-b-2 border-slate-200 pb-4 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveId(null)}
                className="rounded-xl border-2 border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-100"
              >
                <i className="fa-solid fa-arrow-left mr-1" aria-hidden />{" "}
                Kembali ke Daftar Kelas
              </button>
              <h2 className="font-heading text-xl font-extrabold text-slate-900">
                {active.name}
              </h2>
            </div>
            <span className="w-fit rounded-lg border border-amber-300 bg-amber-100 px-3 py-1 font-pixel text-xs text-amber-800">
              Code: {active.code}
            </span>
          </div>

          <section className="guru-pixel-card space-y-4 rounded-2xl bg-white p-5">
            <h3 className="flex items-center gap-2 font-pixel text-xs font-bold uppercase text-slate-800">
              <i
                className="fa-solid fa-circle-info text-brand-600"
                aria-hidden
              />{" "}
              1. Class Information
            </h3>
            <dl className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2 lg:grid-cols-5">
              {[
                { label: "Class Name", value: active.name },
                { label: "Subject", value: active.subject },
                { label: "Grade Level", value: active.grade },
                { label: "Class Code", value: active.code, code: true },
                { label: "Academic Year", value: active.year },
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
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 font-pixel text-xs font-bold uppercase text-slate-800">
                <i
                  className="fa-solid fa-graduation-cap text-emerald-600"
                  aria-hidden
                />{" "}
                2. Student List ({active.studentsCount} Siswa)
              </h3>
              <button
                type="button"
                onClick={() =>
                  showToast("Fitur tambah siswa manual diaktifkan.", "info")
                }
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
              >
                + Tambah Siswa
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-100 font-pixel text-slate-600">
                  <tr>
                    <th className="p-3">No. Induk (NIS)</th>
                    <th className="p-3">Nama Siswa</th>
                    <th className="p-3">Level Quest</th>
                    <th className="p-3">Total XP</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {active.students.map((student) => (
                    <tr
                      key={student.nis}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="p-3 font-mono font-bold text-slate-700">
                        {student.nis}
                      </td>
                      <td className="p-3 font-semibold text-slate-900">
                        {student.name}
                      </td>
                      <td className="p-3">
                        <span className="rounded bg-amber-100 px-2 py-0.5 font-pixel text-[10px] font-bold text-amber-800">
                          LVL {student.level}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-emerald-600">
                        {student.xp}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => bukaProfil(student)}
                          className="font-bold text-brand-600 hover:underline"
                        >
                          Profil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="guru-pixel-card space-y-4 rounded-2xl bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 font-pixel text-xs font-bold uppercase text-slate-800">
                <i
                  className="fa-solid fa-gamepad text-indigo-600"
                  aria-hidden
                />{" "}
                3. Assigned Games
              </h3>
              <button
                type="button"
                onClick={() =>
                  showToast(
                    "Fitur pemilihan game untuk ditugaskan ke kelas dibuka.",
                    "info",
                  )
                }
                className="flex items-center gap-1.5 rounded-xl border border-slate-900 bg-brand-600 px-3.5 py-2 font-pixel text-xs font-bold text-white shadow-[2px_2px_0px_#172554] transition hover:bg-brand-700"
              >
                <i className="fa-solid fa-plus" aria-hidden /> Assign New Game
              </button>
            </div>

            {active.assignedGames.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500">
                Belum ada game yang ditugaskan ke kelas ini.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {active.assignedGames.map((game, index) => (
                  <div
                    key={`${game.id}-${index}`}
                    className="flex items-center justify-between rounded-xl border-2 border-slate-200 bg-slate-50 p-4"
                  >
                    <div>
                      <span className="rounded bg-brand-100 px-2 py-0.5 font-pixel text-[10px] font-bold text-brand-800">
                        {game.status}
                      </span>
                      <h4 className="mt-1 font-heading text-sm font-bold text-slate-900">
                        {game.title}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        <i className="fa-regular fa-clock mr-1" aria-hidden />{" "}
                        Deadline: {game.deadline}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => hapusPenugasan(active.id, index)}
                      title="Hapus Penugasan"
                      className="rounded p-2 text-slate-400 transition hover:text-rose-600"
                    >
                      <i
                        className="fa-solid fa-trash-can text-sm"
                        aria-hidden
                      />
                      <span className="sr-only">
                        Hapus penugasan {game.title}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="guru-pixel-card space-y-4 rounded-2xl bg-white p-5">
            <h3 className="flex items-center gap-2 font-pixel text-xs font-bold uppercase text-slate-800">
              <i className="fa-solid fa-bolt text-amber-500" aria-hidden /> 4.
              Class Activity Feed
            </h3>
            <ul className="space-y-3">
              {active.activities.map((activity, index) => (
                <li
                  key={`${activity.time}-${index}`}
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
                    {activity.time}
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
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-brand-600 px-4 py-2.5 font-pixel text-xs font-bold text-white shadow-[3px_3px_0px_#172554] transition hover:bg-brand-700"
            >
              <i className="fa-solid fa-plus" aria-hidden />
              <span>CREATE NEW CLASS</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <StatCard
              label="Active Classes"
              value={PORTAL_STATS.activeClasses}
              icon="fa-user-check"
              tone="indigo"
            />
            <StatCard
              label="Games Assigned"
              value={PORTAL_STATS.assignedGames}
              icon="fa-gamepad"
              tone="amber"
            />
          </div>

          <div className="space-y-4">
            <h3 className="font-pixel text-sm font-bold uppercase text-slate-800">
              Daftar Kelas Aktif
            </h3>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {classes.map((item) => (
                <article
                  key={item.id}
                  className="guru-pixel-card group flex flex-col justify-between space-y-4 rounded-2xl bg-white p-5"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 font-pixel text-[10px] font-bold text-brand-700">
                        {item.code}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        {item.grade}
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
                      {item.subject} • Tahun Akademik {item.year}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                    <span className="font-semibold text-slate-600">
                      <i
                        className="fa-solid fa-users mr-1 text-brand-600"
                        aria-hidden
                      />{" "}
                      {item.studentsCount} Siswa terdaftar
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveId(item.id)}
                      className="rounded-xl border border-slate-900 bg-brand-600 px-3 py-1.5 font-pixel font-bold text-white shadow-[2px_2px_0px_#172554] transition hover:bg-brand-700"
                    >
                      MANAGE CLASS &rarr;
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}

      {createOpen ? (
        <CreateClassModal
          onClose={() => setCreateOpen(false)}
          onCreate={buatKelas}
        />
      ) : null}
    </div>
  );
}

type CreateClassModalProps = {
  onClose: () => void;
  onCreate: (values: ClassFormValues) => void;
};

function CreateClassModal({ onClose, onCreate }: CreateClassModalProps) {
  const [values, setValues] = useState<ClassFormValues>({
    name: "",
    subject: "",
    grade: GRADE_OPTIONS[0],
    year: "2026/2027",
  });

  function kirim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreate({
      name: values.name.trim(),
      subject: values.subject.trim(),
      grade: values.grade,
      year: values.year.trim(),
    });
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
              required
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
            <select
              id="newClassGrade"
              required
              value={values.grade}
              onChange={(event) =>
                setValues((previous) => ({
                  ...previous,
                  grade: event.target.value,
                }))
              }
              className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 px-3.5 py-2.5 font-medium text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {GRADE_OPTIONS.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="newClassYear"
            className="mb-1 block font-bold uppercase text-slate-700"
          >
            Tahun Akademik
          </label>
          <input
            id="newClassYear"
            type="text"
            required
            value={values.year}
            onChange={(event) =>
              setValues((previous) => ({
                ...previous,
                year: event.target.value,
              }))
            }
            className="w-full rounded-xl border-2 border-slate-300 bg-slate-50 px-3.5 py-2.5 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border-2 border-slate-300 px-4 py-2 font-bold text-slate-600 transition hover:bg-slate-100"
          >
            Batal
          </button>
          <button
            type="submit"
            className="rounded-xl border border-slate-900 bg-brand-600 px-5 py-2.5 font-pixel font-bold text-white shadow-[2px_2px_0px_#172554] transition hover:bg-brand-700"
          >
            BUAT KELAS
          </button>
        </div>
      </form>
    </Modal>
  );
}
