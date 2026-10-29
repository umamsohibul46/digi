export type Role = 'guru' | 'siswa';
export type QuestionType = 'pg' | 'bs' | 'isian' | 'uraian';

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options: string[];
  answer: string;
  score: number;
  explanation?: string;
  subject?: string;
  classLevel?: string;
  imageUrl?: string;
  teacherUsername?: string;
  teacherName?: string;
  major?: string;
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  classLevel: string; // 'Kelas 7' | 'Kelas 8' | 'Kelas 9' | 'Kelas 10' | 'Kelas 11' | 'Kelas 12'
  code: string;
  pin: string;
  durationMinutes: number;
  passingScore: number; // KKM (e.g. 75)
  startTime: string;
  endTime: string;
  maxViolations: number;
  status: 'Aktif' | 'Nonaktif';
  questions: Question[];
  teacherName: string;
}

export interface Submission {
  id: string;
  examId: string;
  examTitle: string;
  studentUsername: string;
  studentName: string;
  studentClass: string;
  score: number;
  status: 'Selesai' | 'Ditangguhkan (Pelanggaran)' | 'Waktu Habis';
  violations: number;
  violationLogs: { time: string; reason: string }[];
  answers: Record<string, string>;
  submittedAt: string;
  durationSpentSeconds: number;
}

export interface AuditLog {
  id: string;
  time: string;
  user: string;
  action: string;
  detail: string;
  severity: 'info' | 'warning' | 'danger';
}

export interface TeachingSchedule {
  id: string;
  day: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';
  startTime: string; // e.g. "07:30"
  endTime: string;   // e.g. "09:00"
  classLevel: string; // e.g. "Kelas 7A", "Kelas 10 RPL"
  room?: string;      // e.g. "Lab Komputer 1", "Ruang 7A"
  subject?: string;
  notes?: string;
}

export interface TeacherBiodata {
  nuptk?: string;
  email?: string;
  phone?: string;
  gender?: 'Laki-laki' | 'Perempuan';
  birthPlaceDate?: string; // e.g. "Surabaya, 15 April 1988"
  lastEducation?: string;  // e.g. "S1 Pendidikan Informatika - Universitas Negeri Malang"
  address?: string;
  bioNotes?: string;
  avatarUrl?: string;
}

export interface TeacherAccount {
  id: string;
  username: string;
  name: string;
  password?: string;
  subject: string;
  major?: string;
  nip?: string;
  phone?: string;
  role?: 'guru' | 'admin';
  createdAt?: string;
  biodata?: TeacherBiodata;
  schedules?: TeachingSchedule[];
  avatarUrl?: string;
}

export interface User {
  username: string;
  name: string;
  role: Role;
  isAdmin?: boolean;
  classLevel?: string;
  subject?: string;
  major?: string;
  avatarUrl?: string;
}

export interface OngoingExamSession {
  examId: string;
  examCode: string;
  examTitle: string;
  studentUsername: string;
  studentName: string;
  studentClass?: string;
  answers: Record<string, string>;
  doubtQuestions: Record<string, boolean>;
  currentQuestionIdx: number;
  timeRemainingSeconds: number; // sisa waktu terakhir saat terputus dalam detik
  lastSavedAt: number; // timestamp ms
  startTimeEpoch: number;
  violations: number;
  violationLogs: { time: string; reason: string }[];
  isDisconnected?: boolean;
}

export interface AppData {
  currentUser: User | null;
  teacherCredentials: Record<string, string>;
  teachers?: TeacherAccount[];
  exams: Exam[];
  bankQuestions: Question[];
  submissions: Submission[];
  auditLogs: AuditLog[];
  ongoingSessions?: Record<string, OngoingExamSession>;
}
