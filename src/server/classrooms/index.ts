/**
 * Kelas dan siswa guru (`/guru/kelas`).
 *
 * Impor dari sini, bukan dari `./core`, supaya halaman/Server Action tidak
 * bergantung pada susunan file dalam.
 */

export {
  ACADEMIC_YEAR_INVALID_MESSAGE,
  addStudent,
  CLASS_CODE_PATTERN,
  CLASSROOM_CODE_CONFLICT_MESSAGE,
  CLASSROOM_NAME_INVALID_MESSAGE,
  CLASSROOM_NOT_FOUND_MESSAGE,
  ClassroomNotFoundError,
  cleanNis,
  cleanText,
  createClassroom,
  DATABASE_FAILURE_MESSAGE,
  generateClassCode,
  getClassroom,
  getClassroomByCode,
  listClassrooms,
  MAX_CLASS_NAME_LENGTH,
  MAX_GRADE_LENGTH,
  MAX_NIS_LENGTH,
  MAX_STUDENT_NAME_LENGTH,
  MAX_STUDENTS_PER_CLASS,
  MAX_SUBJECT_LENGTH,
  normalizeClassCode,
  STUDENT_NAME_INVALID_MESSAGE,
  STUDENT_NIS_DUPLICATE_MESSAGE,
  STUDENT_NIS_INVALID_MESSAGE,
  type AddStudentInput,
  type ClassroomWithOwner,
  type CreateClassroomInput,
} from "./core";
