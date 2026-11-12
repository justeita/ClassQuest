/**
 * Data contoh Portal Guru.
 *
 * Halaman `/guru` masih tampilan: belum ada satu pun panggilan ke Server
 * Action atau API. Semua angka dan daftar di sini berasal dari desain HTML
 * awal supaya isi layar sama persis saat demo; saat wiring dikerjakan,
 * modul ini yang diganti pemanggilan `src/server/stories`.
 *
 * Tidak ada `import "server-only"` di sini: data dipakai komponen client.
 */

export type ThemeKey = "case_study" | "pbl" | "problem_solving";

export type ThemeInfo = {
  /** Nama panjang untuk badge pratinjau. */
  name: string;
  /** Kalimat pendek yang dipakai saat menyusun narasi modul. */
  style: string;
  /** Label kartu pemilihan metode. */
  label: string;
  /** Keterangan satu baris di bawah label. */
  description: string;
};

export const THEMES: Record<ThemeKey, ThemeInfo> = {
  case_study: {
    name: "Metode Studi Kasus",
    style: "pendekatan pengamatan skenario nyata berbasis data empiris",
    label: "Studi Kasus",
    description: "Analisis skenario dunia nyata.",
  },
  pbl: {
    name: "Project-Based Learning",
    style: "penyusunan luaran proyek sistematis berkelanjutan",
    label: "Project-Based",
    description: "Pembelajaran berbasis proyek.",
  },
  problem_solving: {
    name: "Problem Solving",
    style: "penyelesaian tantangan struktural dengan pemikiran analitis",
    label: "Problem Solving",
    description: "Penyelesaian hipotesis masalah.",
  },
};

export const THEME_KEYS = Object.keys(THEMES) as ThemeKey[];

export type MaterialFormat = "PDF" | "DOCX";

export type Material = {
  id: number;
  name: string;
  subject: string;
  grade: string;
  format: MaterialFormat;
  size: string;
  uploadDate: string;
  description: string;
  objectives: string;
};

export const MATERIALS: Material[] = [
  {
    id: 1,
    name: "Modul_Ekosistem_Karang.pdf",
    subject: "Biologi",
    grade: "SMA Grade 10",
    format: "PDF",
    size: "3.2 MB",
    uploadDate: "09 Nov 2026",
    description:
      "Modul pembelajaran mendalam tentang ekosistem terumbu karang, jaring-jaring makanan, dan ancaman perubahan iklim.",
    objectives:
      "Mampu mengidentifikasi komponen biotik & abiotik terumbu karang serta merumuskan langkah konservasi bahari.",
  },
  {
    id: 2,
    name: "Aljabar_Linier_Lanjutan.docx",
    subject: "Matematika",
    grade: "SMA Grade 11",
    format: "DOCX",
    size: "1.8 MB",
    uploadDate: "05 Nov 2026",
    description:
      "Materi persamaan matriks linier, sistem matriks orde 3x3, dan penerapannya dalam perhitungan logika.",
    objectives:
      "Siswa mampu menyelesaikan sistem persamaan linier tiga variabel dengan metode determinan dan eliminasi.",
  },
  {
    id: 3,
    name: "Dasar_Algoritma_Python.pdf",
    subject: "Informatika",
    grade: "SMA Grade 10",
    format: "PDF",
    size: "5.4 MB",
    uploadDate: "01 Nov 2026",
    description:
      "Panduan praktikum pemrograman dasar Python meliputi struktur kontrol percabangan dan perulangan.",
    objectives:
      "Siswa mampu menyusun flowchart logis dan mengimplementasikannya ke kode Python sederhana.",
  },
  {
    id: 4,
    name: "Fisika_Termodinamika.pdf",
    subject: "Fisika",
    grade: "SMA Grade 11",
    format: "PDF",
    size: "4.1 MB",
    uploadDate: "28 Okt 2026",
    description:
      "Hukum 1 dan 2 Termodinamika serta perhitungan efisiensi mesin Carnot.",
    objectives:
      "Menganalisis proses termodinamika gas ideal pada kondisi isobaris, isokhoris, dan isotermis.",
  },
];

export type Student = {
  nis: string;
  name: string;
  level: number;
  xp: string;
};

export type AssignedGame = {
  id: number;
  title: string;
  deadline: string;
  status: string;
};

export type ClassActivity = {
  text: string;
  time: string;
};

export type Classroom = {
  id: number;
  name: string;
  subject: string;
  grade: string;
  code: string;
  year: string;
  studentsCount: number;
  students: Student[];
  assignedGames: AssignedGame[];
  activities: ClassActivity[];
};

export const CLASSROOMS: Classroom[] = [
  {
    id: 1,
    name: "Kelas 10A - Matematika",
    subject: "Matematika",
    grade: "SMA Grade 10",
    code: "QST-10A",
    year: "2026/2027",
    studentsCount: 30,
    students: [
      { nis: "1001", name: "Andi Pratama", level: 12, xp: "3,450 XP" },
      { nis: "1002", name: "Siti Rahma", level: 14, xp: "4,120 XP" },
      { nis: "1003", name: "Budi Nugroho", level: 10, xp: "2,890 XP" },
      { nis: "1004", name: "Dewi Lestari", level: 15, xp: "4,500 XP" },
    ],
    assignedGames: [
      {
        id: 101,
        title: "Mathematics Adventure",
        deadline: "18 Nov 2026",
        status: "Active (85% Selesai)",
      },
      {
        id: 102,
        title: "Aljabar Altar Quest",
        deadline: "25 Nov 2026",
        status: "Scheduled",
      },
    ],
    activities: [
      {
        text: "Dewi Lestari menyelesaikan Quest Aljabar #3",
        time: "10 menit lalu",
      },
      { text: "Siswa Andi Pratama bergabung ke kelas", time: "2 jam lalu" },
      {
        text: "Game 'Mathematics Adventure' ditugaskan ke kelas",
        time: "Kemarin",
      },
    ],
  },
  {
    id: 2,
    name: "Biologi X-B - Ekosistem",
    subject: "Biologi",
    grade: "SMA Grade 10",
    code: "QST-BIO10",
    year: "2026/2027",
    studentsCount: 28,
    students: [
      { nis: "2001", name: "Rizky Ramadhan", level: 11, xp: "3,100 XP" },
      { nis: "2002", name: "Putri Ananda", level: 13, xp: "3,950 XP" },
    ],
    assignedGames: [
      {
        id: 201,
        title: "Ekosistem Laut Quest",
        deadline: "20 Nov 2026",
        status: "Active",
      },
    ],
    activities: [
      { text: "Putri Ananda memulai game Ekosistem Laut", time: "1 jam lalu" },
      { text: "Modul PDF Ekosistem Karang disematkan", time: "2 hari lalu" },
    ],
  },
  {
    id: 3,
    name: "Informatika XI - Algoritma",
    subject: "Informatika",
    grade: "SMA Grade 11",
    code: "QST-INF11",
    year: "2026/2027",
    studentsCount: 32,
    students: [
      { nis: "3001", name: "Fajar Hidayat", level: 16, xp: "5,200 XP" },
    ],
    assignedGames: [
      {
        id: 301,
        title: "Python Branching Maze",
        deadline: "30 Nov 2026",
        status: "Active",
      },
    ],
    activities: [
      { text: "Fajar Hidayat mencapai Level 16", time: "3 jam lalu" },
    ],
  },
  {
    id: 4,
    name: "Fisika 12 - Termodinamika",
    subject: "Fisika",
    grade: "SMA Grade 12",
    code: "QST-PHYS12",
    year: "2026/2027",
    studentsCount: 30,
    students: [
      { nis: "4001", name: "Citra Kirana", level: 18, xp: "6,100 XP" },
    ],
    assignedGames: [
      {
        id: 401,
        title: "Carnot Engine Simulator",
        deadline: "05 Des 2026",
        status: "Draft",
      },
    ],
    activities: [
      { text: "Kelas Fisika 12 berhasil diinisiasi", time: "4 hari lalu" },
    ],
  },
];

export type GameStatus = "Active" | "Draft";

export type EducationalGame = {
  id: number;
  title: string;
  grade: string;
  description: string;
  status: GameStatus;
  students: number;
};

export const GAMES: EducationalGame[] = [
  {
    id: 1,
    title: "Mathematics Adventure",
    grade: "SMA Grade 10",
    description:
      "Game petualangan logika matematika berbasis studi kasus aljabar.",
    status: "Active",
    students: 42,
  },
  {
    id: 2,
    title: "Ekosistem Laut Quest",
    grade: "SMA Grade 11",
    description:
      "Simulasi interaktif tentang rantai makanan dan konservasi terumbu karang.",
    status: "Draft",
    students: 0,
  },
];

/** Angka ringkasan dashboard; tetap statis sampai data nyata tersambung. */
export const PORTAL_STATS = {
  totalGames: 12,
  activeClasses: 4,
  totalStudents: 120,
  materials: 8,
  totalSubjects: 5,
  assignedGames: 8,
  storageUsed: "24.5 MB",
  recentUpload: { name: "Modul_Ekosistem.pdf", when: "Kemarin" },
} as const;

/** Guru yang sedang masuk; belum ada sesi nyata. */
export const CURRENT_TEACHER = {
  name: "Dr. Budi Santoso",
  fullName: "Dr. Budi Santoso, M.Pd.",
  initials: "BS",
  level: 45,
  xp: "1,450 XP",
  gold: "320 Gold",
} as const;

/** Pilihan tingkat kelas yang dipakai di beberapa form. */
export const GRADE_OPTIONS = [
  "SMA Grade 10",
  "SMA Grade 11",
  "SMA Grade 12",
  "Perguruan Tinggi",
] as const;

export const SUBJECT_OPTIONS = [
  "Biologi",
  "Matematika",
  "Informatika",
  "Fisika",
] as const;

export type RecentActivityKind = "game" | "material" | "quiz";

/**
 * Tiga kartu "Recent Activity" di dashboard.
 *
 * Gambar memakai latar game yang sudah ada di `public/assets/bg` karena berkas
 * thumbnail di desain asal (`/src/assets/images/...`) tidak pernah ikut
 * terbawa. Ganti dengan thumbnail asli saat aset tersedia.
 */
export type RecentActivity = {
  id: number;
  title: string;
  description: string;
  kind: RecentActivityKind;
  time: string;
  meta: string;
  image: string;
};

export const RECENT_ACTIVITY: RecentActivity[] = [
  {
    id: 1,
    title: "Mathematics Adventure",
    description:
      "Game petualangan instruksional logika matematika berbasis kasus aljabar.",
    kind: "game",
    time: "2 jam lalu",
    meta: "Kelas 10A",
    image: "/assets/bg/classroom_day.png",
  },
  {
    id: 2,
    title: "Modul Ekosistem Karang",
    description: "Pengunggahan dokumen PDF referensi modul konservasi bahari.",
    kind: "material",
    time: "Kemarin",
    meta: "Biologi Grade 10",
    image: "/assets/bg/river_day.png",
  },
  {
    id: 3,
    title: "Evaluasi Algoritma Python",
    description:
      "42 siswa telah menyelesaikan kuis interaktif algoritma percabangan.",
    kind: "quiz",
    time: "3 hari lalu",
    meta: "Informatika Grade 10",
    image: "/assets/bg/schoolyard_day.png",
  },
];
