"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import type {
  AnalyticsStudentRow,
  ClassroomAnalytics,
  ClassroomDetail,
  StoryListItem,
} from "@/server/contracts";

import { SelectMenu } from "./SelectMenu";
import { StatCard } from "./StatCard";
import { formatUpdatedAt } from "./logic";

type AnalyticsBrowserProps = {
  /** Kelas milik guru; kosong = belum ada kelas sama sekali. */
  classes: ClassroomDetail[];
  /** Cerita milik guru; hanya `published` yang punya hasil main. */
  stories: StoryListItem[];
  /** Kelas yang dipilih lewat `?kelas=` (sudah divalidasi server); `null` = semua. */
  selectedClassroomId: string | null;
  /** Game yang dipilih lewat `?storyId=` (sudah divalidasi server); `null` = semua. */
  selectedStoryId: string | null;
  /** Hasil agregat; sudah dihitung server untuk filter yang berlaku. */
  analytics: ClassroomAnalytics | null;
};

/** Baris tabel + penanda bahwa baris ini milik siswa terdaftar kelas. */
type Baris = AnalyticsStudentRow & { terdaftar: boolean };

/**
 * Halaman `/guru/analitik`: pilih kelas → pilih game → lihat poin dan
 * kesalahan per siswa.
 *
 * Pilihan disimpan di query string (`?kelas=&storyId=`) supaya tautan bisa
 * dibagikan/di-bookmark dan server bisa menghitung agregatnya. Perubahan
 * pilihan memakai `router.replace`, jadi tidak menumpuk riwayat browser.
 *
 * Kedua pilihan **opsional**: tanpa filter, halaman langsung menampilkan
 * agregat semua kelas × semua game terbit. Pilihan kosong ("Semua kelas",
 * "Semua game") sama saja dengan parameter yang tidak ada. Karena itu, saat
 * tidak difilter, tabel menambah kolom Kelas dan Game agar asal setiap baris
 * tidak ambigu.
 *
 * Daftar siswa yang belum bermain **tetap ditampilkan** (poin 0) supaya guru
 * bisa melihat siapa yang belum mengerjakan, bukan hanya yang sudah.
 */
export function AnalyticsBrowser({
  classes,
  stories,
  selectedClassroomId,
  selectedStoryId,
  analytics,
}: AnalyticsBrowserProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const classOptions = useMemo(
    () =>
      classes.map((item) => ({
        value: item.id,
        label: item.name,
        hint: item.code,
      })),
    [classes],
  );

  const storyOptions = useMemo(
    () =>
      stories
        .filter((story) => story.status === "published")
        .map((story) => ({
          value: story.id,
          label: story.title,
          hint: `${story.subject}`,
        })),
    [stories],
  );

  function pilih(next: { kelas?: string; storyId?: string }) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    // Nilai kosong dihapus, bukan disimpan sebagai `kelas=`, supaya URL bersih
    // dan "Semua kelas" tampil sama seperti halaman tanpa parameter.
    for (const key of ["kelas", "storyId"] as const) {
      const value = next[key];
      if (value === undefined) continue;
      if (value === "") params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    router.replace(query === "" ? "/guru/analitik" : `/guru/analitik?${query}`);
  }

  /** Filter kelas atau game tidak aktif → kolom Kelas/Game perlu ditampilkan. */
  const lintasKelas = selectedClassroomId === null;
  const lintasGame = selectedStoryId === null;

  /**
   * Siswa terdaftar yang belum pernah bermain, ditambahkan ke akhir tabel.
   *
   * Hanya masuk akal saat filter menyebut satu kelas dan satu game: di tampilan
   * gabungan tidak ada satu daftar siswa tunggal untuk dijadikan acuan.
   */
  const semuaBaris = useMemo<Baris[]>(() => {
    const rows: Baris[] = (analytics?.rows ?? []).map((row) => ({
      ...row,
      terdaftar: true,
    }));

    const activeClass =
      selectedClassroomId === null
        ? undefined
        : classes.find((item) => item.id === selectedClassroomId);

    const satuGame =
      analytics?.stories.length === 1 ? analytics.stories[0] : null;
    if (activeClass === undefined || satuGame === null) {
      return [...rows].sort(
        (a, b) => b.bestPoints - a.bestPoints || a.name.localeCompare(b.name),
      );
    }

    const sudah = new Set(
      rows
        .map((row) => row.studentId)
        .filter((id): id is string => id !== null),
    );

    const belum: Baris[] = activeClass.students
      .filter((student) => !sudah.has(student.id))
      .map((student) => ({
        key: `${activeClass.id}|${satuGame.id}|student:${student.id}`,
        studentId: student.id,
        name: student.name,
        nis: student.nis,
        attempts: 0,
        bestPoints: 0,
        latestPoints: 0,
        latestCorrectCount: 0,
        totalCount: analytics?.rows[0]?.totalCount ?? 0,
        totalPoints: analytics?.rows[0]?.totalPoints ?? 0,
        weakConcepts: [],
        lastPlayedAt: "",
        classroomId: activeClass.id,
        classroomName: activeClass.name,
        storyId: satuGame.id,
        storyTitle: satuGame.title,
        terdaftar: true,
      }));

    return [...rows, ...belum].sort(
      (a, b) => b.bestPoints - a.bestPoints || a.name.localeCompare(b.name),
    );
  }, [analytics, classes, selectedClassroomId]);

  if (classes.length === 0) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 pb-10">
        <Header />
        <div className="guru-pop rounded-2xl border-2 border-slate-200 bg-white py-12 text-center">
          <i
            className="fa-solid fa-users mb-2 text-3xl text-slate-300"
            aria-hidden
          />
          <p className="text-xs font-bold text-slate-700">Belum ada kelas</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Buat kelas dan tambahkan siswa dulu di halaman My Classes.
          </p>
        </div>
      </div>
    );
  }

  /** Judul panel tabel: sebut filter yang aktif, atau "semua". */
  const judulTabel = [
    selectedClassroomId === null
      ? "Semua kelas"
      : (analytics?.classrooms[0]?.name ?? "Kelas"),
    selectedStoryId === null
      ? "Semua game"
      : (analytics?.stories[0]?.title ?? "Game"),
  ].join(" · ");

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <Header />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="analitik-kelas"
            className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500"
          >
            Kelas
          </label>
          <SelectMenu
            id="analitik-kelas"
            options={classOptions}
            value={selectedClassroomId ?? ""}
            onChange={(value) => pilih({ kelas: value })}
            placeholder="Semua kelas"
            icon={<i className="fa-solid fa-users" aria-hidden />}
          />
        </div>
        <div>
          <label
            htmlFor="analitik-game"
            className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500"
          >
            Game
          </label>
          <SelectMenu
            id="analitik-game"
            options={storyOptions}
            value={selectedStoryId ?? ""}
            onChange={(value) => pilih({ storyId: value })}
            placeholder={
              storyOptions.length === 0 ? "Belum ada game terbit" : "Semua game"
            }
            disabled={storyOptions.length === 0}
            icon={<i className="fa-solid fa-gamepad" aria-hidden />}
          />
        </div>
      </div>

      {analytics === null ? (
        <Empty
          icon="fa-triangle-exclamation"
          title="Data tidak ditemukan"
          body="Kelas atau game ini tidak tersedia. Muat ulang halaman lalu pilih lagi."
        />
      ) : storyOptions.length === 0 ? (
        <Empty
          icon="fa-gamepad"
          title="Belum ada game terbit"
          body="Bagikan materi dulu agar hasil main siswa tercatat."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Siswa bermain"
              value={`${analytics.studentsPlayed} / ${analytics.studentsTotal}`}
              icon="fa-user-graduate"
              tone="blue"
            />
            <StatCard
              label="Total percobaan"
              value={analytics.totalAttempts}
              icon="fa-repeat"
              tone="indigo"
            />
            <StatCard
              label="Rata-rata poin"
              value={
                lintasGame
                  ? analytics.averageBestPoints
                  : `${analytics.averageBestPoints} / ${semuaBaris[0]?.totalPoints ?? 0}`
              }
              icon="fa-star"
              tone="amber"
            />
            <StatCard
              label="Konsep perlu diulang"
              value={
                new Set(analytics.rows.flatMap((row) => row.weakConcepts)).size
              }
              icon="fa-book"
              tone="purple"
            />
          </div>

          <div className="guru-pixel-card overflow-hidden rounded-2xl bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-slate-100 px-5 py-4">
              <div>
                <h3 className="font-heading text-sm font-bold text-slate-900">
                  {judulTabel}
                </h3>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {lintasKelas || lintasGame
                    ? "Poin terbaik per siswa di tiap kelas dan game, dihitung dari semua percobaan. Persempit dengan memilih kelas atau game."
                    : "Poin terbaik per siswa, dihitung dari semua percobaan."}
                </p>
              </div>
              <span className="rounded-full border border-slate-200 px-2.5 py-0.5 font-pixel text-[10px] text-slate-500">
                {analytics.rows.length} baris
              </span>
            </div>

            {semuaBaris.length === 0 ? (
              <p className="px-5 py-10 text-center text-[11px] text-slate-500">
                Belum ada hasil main. Bagikan tautan game ke kelas agar poin dan
                konsep yang sering salah mulai tercatat di sini.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                      <th scope="col" className="px-5 py-2.5 font-bold">
                        Siswa
                      </th>
                      {lintasKelas ? (
                        <th scope="col" className="px-3 py-2.5 font-bold">
                          Kelas
                        </th>
                      ) : null}
                      {lintasGame ? (
                        <th scope="col" className="px-3 py-2.5 font-bold">
                          Game
                        </th>
                      ) : null}
                      <th scope="col" className="px-3 py-2.5 font-bold">
                        Poin terbaik
                      </th>
                      <th scope="col" className="px-3 py-2.5 font-bold">
                        Terakhir
                      </th>
                      <th scope="col" className="px-3 py-2.5 font-bold">
                        Percobaan
                      </th>
                      <th scope="col" className="px-3 py-2.5 font-bold">
                        Konsep perlu diulang
                      </th>
                      <th scope="col" className="px-5 py-2.5 font-bold">
                        Terakhir main
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {semuaBaris.map((row) => (
                      <tr
                        key={row.key}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60"
                      >
                        <td className="px-5 py-3">
                          <p className="font-bold text-slate-800">{row.name}</p>
                          {row.nis !== null ? (
                            <p className="text-[10px] text-slate-400">
                              NIS {row.nis}
                            </p>
                          ) : null}
                        </td>
                        {lintasKelas ? (
                          <td className="px-3 py-3 text-slate-600">
                            {row.classroomName ?? "-"}
                          </td>
                        ) : null}
                        {lintasGame ? (
                          <td className="px-3 py-3 text-slate-600">
                            {row.storyTitle}
                          </td>
                        ) : null}
                        <td className="px-3 py-3">
                          <span
                            className={`font-pixel text-xs font-bold ${
                              row.attempts === 0
                                ? "text-slate-300"
                                : "text-brand-700"
                            }`}
                          >
                            {row.bestPoints}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {" "}
                            / {row.totalPoints}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          {row.attempts === 0 ? (
                            <span className="text-slate-300">-</span>
                          ) : (
                            <>
                              {row.latestPoints}
                              <span className="text-[10px] text-slate-400">
                                {" "}
                                ({row.latestCorrectCount}/{row.totalCount}{" "}
                                tepat)
                              </span>
                            </>
                          )}
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          {row.attempts === 0 ? (
                            <span className="text-slate-300">Belum main</span>
                          ) : (
                            row.attempts
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {row.weakConcepts.length === 0 ? (
                            <span className="text-[10px] text-slate-300">
                              {row.attempts === 0 ? "-" : "Tidak ada"}
                            </span>
                          ) : (
                            <span className="flex flex-wrap gap-1">
                              {row.weakConcepts.map((concept) => (
                                <span
                                  key={concept}
                                  className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700"
                                >
                                  {concept}
                                </span>
                              ))}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-[11px] text-slate-500">
                          {row.lastPlayedAt === ""
                            ? "-"
                            : formatUpdatedAt(row.lastPlayedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Header() {
  return (
    <div className="flex flex-col justify-between gap-4 border-b-2 border-slate-200 pb-4 sm:flex-row sm:items-center">
      <div>
        <h2 className="font-heading text-2xl font-extrabold text-slate-900">
          Class Analytics
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Poin dan konsep yang sering salah dari hasil main siswa.
        </p>
      </div>
    </div>
  );
}

function Empty({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <div className="guru-pop rounded-2xl border-2 border-slate-200 bg-white py-12 text-center">
      <i
        className={`fa-solid ${icon} mb-2 text-3xl text-slate-300`}
        aria-hidden
      />
      <p className="text-xs font-bold text-slate-700">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-[11px] leading-relaxed text-slate-500">
        {body}
      </p>
    </div>
  );
}
