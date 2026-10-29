import React, { useState } from 'react';
import { AppData, Exam, Question, QuestionType, Submission, TeacherAccount } from '../../types';
import {
  FileText,
  Database,
  Award,
  ShieldAlert,
  Plus,
  Trash2,
  Edit,
  Upload,
  Search,
  CheckCircle,
  Clock,
  Key,
  Users,
  Copy,
  RotateCcw,
  Check,
  Eye,
  FileSpreadsheet,
  Image as ImageIcon,
  Table as TableIcon,
  Code,
  Sparkles,
  CheckCheck,
  X,
  Smartphone,
  Cloud,
  Share2,
  UserPlus,
  BookOpen,
  Layers,
  Lock,
  Shield,
  EyeOff
} from 'lucide-react';
import {
  exportSubmissionsToCSV,
  parseRawQuestionText,
  exportDataToSyncCode,
  importDataFromSyncCode,
  syncDataToServer,
  fetchServerData,
  savePersistentTeacherCredentials
} from '../../utils/storage';
import { QuestionContentRenderer } from '../common/QuestionContentRenderer';
import { TeacherDirectoryAndSchedule } from './TeacherDirectoryAndSchedule';
import mammoth from 'mammoth';

interface TeacherDashboardProps {
  appData: AppData;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onUpdateData: (newData: AppData) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onShowModal: (config: {
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
    confirmLabel?: string;
    cancelLabel?: string;
  }) => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  appData,
  activeTab,
  onTabChange,
  onUpdateData,
  onShowToast,
  onShowModal,
}) => {
  // Current Teacher identification
  const currentTeacher =
    (appData.teachers || []).find((t) => t.username === appData.currentUser?.username) || null;
  const currentTeacherSubject = currentTeacher?.subject || appData.currentUser?.subject || 'Informatika';
  const currentTeacherName = currentTeacher?.name || appData.currentUser?.name || 'SOHIBUL UMAM S.Kom';

  // Filters & Search States
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('Semua');

  // Bank Soal Separation Filters (Pisah Bank Soal per Mapel & Guru)
  const [bankScopeMode, setBankScopeMode] = useState<'my_subject' | 'all'>('my_subject');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('Semua');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('Semua');

  // Exam Modal State
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [examForm, setExamForm] = useState({
    title: '',
    subject: currentTeacherSubject,
    classLevel: 'Kelas 7',
    code: '',
    pin: '1234',
    durationMinutes: 45,
    passingScore: 75,
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 16),
    maxViolations: 3,
    status: 'Aktif' as 'Aktif' | 'Nonaktif',
    selectedQuestionIds: [] as string[],
  });

  // Question Modal State
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionModalTab, setQuestionModalTab] = useState<'form' | 'preview'>('form');
  const [questionForm, setQuestionForm] = useState({
    subject: currentTeacherSubject,
    customSubject: '',
    classLevel: 'Kelas 7',
    type: 'pg' as QuestionType,
    question: '',
    options: ['', '', '', ''],
    answer: '0',
    score: 25,
    explanation: '',
    imageUrl: '',
  });

  // Upload Document Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadSubject, setUploadSubject] = useState<string>(currentTeacherSubject);
  const [uploadCustomSubject, setUploadCustomSubject] = useState<string>('');
  const [uploadClassLevel, setUploadClassLevel] = useState('Kelas 7');
  const [uploadRawText, setUploadRawText] = useState('');
  const [uploadAssignToExam, setUploadAssignToExam] = useState<boolean>(true);
  const [uploadTargetExamId, setUploadTargetExamId] = useState<string>('auto');

  // Bank Soal View Mode (Ringkas / Kartu)
  const [bankViewMode, setBankViewMode] = useState<'ringkas' | 'kartu'>('ringkas');

  // Password / Settings Modal State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Submission Detail Modal State
  const [selectedSubmissionDetail, setSelectedSubmissionDetail] = useState<Submission | null>(null);

  // Quick Duration Modal State
  const [quickDurationExam, setQuickDurationExam] = useState<Exam | null>(null);
  const [quickDurationMinutes, setQuickDurationMinutes] = useState<number>(45);
  const [applyDurationToAll, setApplyDurationToAll] = useState<boolean>(false);

  // Inspect & Manage Exam Questions Modal
  const [inspectExamQuestions, setInspectExamQuestions] = useState<Exam | null>(null);

  // Multi-Device Sync Modal State (HP <-> Komputer)
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [importSyncCodeInput, setImportSyncCodeInput] = useState('');
  const [isSyncingServer, setIsSyncingServer] = useState(false);

  // Teacher Management Tab State
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [teacherCategoryFilter, setTeacherCategoryFilter] = useState<'Semua' | 'Umum' | 'Kejuruan'>('Semua');
  const [isAddTeacherModalOpen, setIsAddTeacherModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<TeacherAccount | null>(null);
  const [teacherForm, setTeacherForm] = useState({
    name: '',
    username: '',
    password: 'password123',
    subject: 'Bahasa Indonesia',
    customSubject: '',
    major: 'Umum / Semua Jurusan',
    customMajor: '',
    nip: '',
  });

  // Dedicated Password Modal for a specific teacher
  const [passwordModalTeacher, setPasswordModalTeacher] = useState<TeacherAccount | null>(null);
  const [targetTeacherNewPassword, setTargetTeacherNewPassword] = useState('');
  const [showTeacherPasswordMap, setShowTeacherPasswordMap] = useState<Record<string, boolean>>({});

  const toggleShowPassword = (username: string) => {
    setShowTeacherPasswordMap((prev) => ({
      ...prev,
      [username]: !prev[username],
    }));
  };

  const handleOpenAddTeacherModal = (teacher?: TeacherAccount) => {
    if (teacher) {
      setEditingTeacher(teacher);
      const isCustomSub = ![
        'Bahasa Indonesia',
        'Bahasa Inggris',
        'IPA (Fisika, Biologi, Kimia)',
        'Matematika',
        'IPS (Ekonomi, Geografi, Sejarah)',
        'Informatika',
        'Pendidikan Agama Islam (PAI)',
        'Pendidikan Pancasila & Kewarganegaraan (PPKn)',
        'PJOK / Olahraga',
        'Seni Budaya',
        'Kejuruan Rekayasa Perangkat Lunak (RPL)',
        'Kejuruan Teknik Komputer & Jaringan (TKJ)',
        'Kejuruan Teknik Kendaraan Ringan (TKR / Otomotif)',
        'Kejuruan Akuntansi & Keuangan Lembaga (AKL)',
        'Kejuruan Desain Komunikasi Visual (DKV)',
      ].includes(teacher.subject);

      const isCustomMaj = ![
        'Umum / Semua Jurusan',
        'MIPA (Matematika & IPA)',
        'IPS (Ilmu Pengetahuan Sosial)',
        'Rekayasa Perangkat Lunak (RPL)',
        'Teknik Komputer & Jaringan (TKJ)',
        'Teknik Kendaraan Ringan (TKR / Otomotif)',
        'Akuntansi & Keuangan Lembaga (AKL)',
        'Desain Komunikasi Visual (DKV)',
        'Manajemen Perkantoran (MPLB)',
        'Bisnis Digital / Pemasaran',
      ].includes(teacher.major || '');

      setTeacherForm({
        name: teacher.name,
        username: teacher.username,
        password: appData.teacherCredentials[teacher.username] || 'password123',
        subject: isCustomSub ? 'Lainnya' : teacher.subject,
        customSubject: isCustomSub ? teacher.subject : '',
        major: isCustomMaj ? 'Lainnya' : teacher.major || 'Umum / Semua Jurusan',
        customMajor: isCustomMaj ? teacher.major || '' : '',
        nip: teacher.nip || '',
      });
    } else {
      setEditingTeacher(null);
      setTeacherForm({
        name: '',
        username: '',
        password: 'password123',
        subject: 'Bahasa Indonesia',
        customSubject: '',
        major: 'Umum / Semua Jurusan',
        customMajor: '',
        nip: '',
      });
    }
    setIsAddTeacherModalOpen(true);
  };

  const handleSaveTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = teacherForm.username.trim().toLowerCase().replace(/\s+/g, '_');
    const cleanName = teacherForm.name.trim();
    if (!cleanName || !cleanUsername) {
      onShowToast('Nama guru dan username login wajib diisi!', 'error');
      return;
    }
    if (teacherForm.password.length < 4) {
      onShowToast('Kata sandi guru minimal 4 karakter!', 'error');
      return;
    }

    const finalSub =
      teacherForm.subject === 'Lainnya'
        ? teacherForm.customSubject.trim() || 'Mata Pelajaran'
        : teacherForm.subject;
    const finalMaj =
      teacherForm.major === 'Lainnya'
        ? teacherForm.customMajor.trim() || 'Umum'
        : teacherForm.major;

    if (editingTeacher) {
      const updatedList = (appData.teachers || []).map((t) =>
        t.username === editingTeacher.username
          ? {
              ...t,
              name: cleanName,
              username: cleanUsername,
              subject: finalSub,
              major: finalMaj,
              nip: teacherForm.nip.trim() || undefined,
            }
          : t
      );
      const updatedCreds = { ...appData.teacherCredentials };
      if (cleanUsername !== editingTeacher.username) {
        delete updatedCreds[editingTeacher.username];
      }
      updatedCreds[cleanUsername] = teacherForm.password;
      onUpdateData({
        ...appData,
        teachers: updatedList,
        teacherCredentials: updatedCreds,
      });
      onShowToast(`Data guru ${cleanName} berhasil diperbarui!`, 'success');
    } else {
      const newTeacher: TeacherAccount = {
        id: `tch-${Date.now()}`,
        username: cleanUsername,
        name: cleanName,
        password: teacherForm.password,
        subject: finalSub,
        major: finalMaj,
        nip: teacherForm.nip.trim() || undefined,
        role: 'guru',
        createdAt: new Date().toISOString().slice(0, 10),
      };
      const updatedCreds = {
        ...appData.teacherCredentials,
        [cleanUsername]: teacherForm.password,
      };
      onUpdateData({
        ...appData,
        teachers: [...(appData.teachers || []), newTeacher],
        teacherCredentials: updatedCreds,
      });
      onShowToast(`Guru baru ${cleanName} (${finalSub}) berhasil ditambahkan ke sistem sekolah!`, 'success');
    }
    setIsAddTeacherModalOpen(false);
  };

  const handleDeleteTeacher = (teacher: TeacherAccount) => {
    if (teacher.username.toLowerCase() === 'sohibul') {
      onShowToast('Akun Super Admin Utama (Sohibul) tidak dapat dihapus demi keamanan dan operasional sistem CBT!', 'error');
      return;
    }
    const isSohibulUser = (appData.currentUser?.username || '').toLowerCase() === 'sohibul';
    if (!isSohibulUser && !appData.currentUser?.isAdmin) {
      onShowToast('Akses Ditolak: Hanya Super Administrator yang berhak menghapus akun guru!', 'error');
      return;
    }

    onShowModal({
      title: 'Hapus Akun Guru',
      message: `Apakah Anda yakin ingin menghapus akun guru "${teacher.name}" (${teacher.subject}) dari sistem CBT sekolah? Seluruh data akun dan akses login akan dihapus secara permanen.`,
      type: 'danger',
      confirmLabel: 'Ya, Hapus Akun',
      onConfirm: () => {
        const remaining = (appData.teachers || []).filter((t) => t.username.toLowerCase() !== teacher.username.toLowerCase());
        const updatedCreds = { ...appData.teacherCredentials };
        delete updatedCreds[teacher.username];
        delete updatedCreds[teacher.username.toLowerCase()];

        savePersistentTeacherCredentials(updatedCreds);
        onUpdateData({
          ...appData,
          teachers: remaining,
          teacherCredentials: updatedCreds,
        });
        onShowToast(`Akun guru ${teacher.name} telah berhasil dihapus dari sistem.`, 'info');
      },
    });
  };

  const handleOpenTeacherPasswordModal = (teacher: TeacherAccount) => {
    const isSohibulUser = (appData.currentUser?.username || '').toLowerCase() === 'sohibul';
    if (teacher.username.toLowerCase() === 'sohibul' && !isSohibulUser) {
      onShowToast('Akses Ditolak: Kata sandi Super User Sohibul hanya dapat dilihat dan diubah di panel Pak Sohibul!', 'error');
      return;
    }
    setPasswordModalTeacher(teacher);
    setTargetTeacherNewPassword(appData.teacherCredentials[teacher.username] || 'password123');
  };

  const handleSaveTeacherPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalTeacher) return;
    const isSohibulUser = (appData.currentUser?.username || '').toLowerCase() === 'sohibul';
    if (passwordModalTeacher.username.toLowerCase() === 'sohibul' && !isSohibulUser) {
      onShowToast('Akses Ditolak: Anda tidak memiliki hak untuk mengubah kata sandi Super User Sohibul!', 'error');
      setPasswordModalTeacher(null);
      return;
    }
    if (targetTeacherNewPassword.length < 4) {
      onShowToast('Kata sandi minimal 4 karakter!', 'error');
      return;
    }
    const updatedCreds = {
      ...appData.teacherCredentials,
      [passwordModalTeacher.username]: targetTeacherNewPassword,
    };
    const updatedTeachers = (appData.teachers || []).map((t) =>
      t.username.toLowerCase() === passwordModalTeacher.username.toLowerCase()
        ? { ...t, password: targetTeacherNewPassword }
        : t
    );
    savePersistentTeacherCredentials(updatedCreds);
    onUpdateData({
      ...appData,
      teachers: updatedTeachers,
      teacherCredentials: updatedCreds,
    });
    onShowToast(`Kata sandi untuk guru ${passwordModalTeacher.name} berhasil diubah!`, 'success');
    setPasswordModalTeacher(null);
  };

  const handleCreateExamForTeacher = (teacher: TeacherAccount) => {
    setEditingExamId(null);
    setExamForm({
      title: `Ulangan Harian ${teacher.subject} - Kelas 7`,
      subject: teacher.subject,
      classLevel: 'Kelas 7',
      code: teacher.username.toUpperCase().slice(0, 5) + '01',
      pin: '1234',
      durationMinutes: 45,
      passingScore: 75,
      startTime: new Date().toISOString().slice(0, 16),
      endTime: '2026-12-31T23:59',
      maxViolations: 3,
      status: 'Aktif',
      selectedQuestionIds: [],
    });
    onTabChange('exams');
    setIsExamModalOpen(true);
    onShowToast(`Form ujian dibuka untuk ${teacher.name} (${teacher.subject}).`, 'info');
  };

  // Statistics
  const totalExams = appData.exams.length;
  const totalQuestions = appData.bankQuestions.length;
  const totalSubmissions = appData.submissions.length;
  const averageScore = totalSubmissions > 0
    ? Math.round(appData.submissions.reduce((acc, s) => acc + s.score, 0) / totalSubmissions)
    : 0;
  const passedCount = appData.submissions.filter((s) => {
    const exam = appData.exams.find((e) => e.id === s.examId);
    const kkm = exam ? exam.passingScore : 75;
    return s.score >= kkm;
  }).length;
  const passRate = totalSubmissions > 0 ? Math.round((passedCount / totalSubmissions) * 100) : 0;

  // Handlers for Quick Duration Setting
  const handleOpenQuickDurationModal = (exam: Exam) => {
    setQuickDurationExam(exam);
    setQuickDurationMinutes(exam.durationMinutes || 45);
    setApplyDurationToAll(false);
  };

  const handleSaveQuickDuration = () => {
    if (!quickDurationExam) return;
    const newDur = Math.max(5, Number(quickDurationMinutes) || 45);
    let updatedExams: Exam[];
    if (applyDurationToAll) {
      updatedExams = appData.exams.map((ex) => ({
        ...ex,
        durationMinutes: newDur,
      }));
      onShowToast(
        `Durasi seluruh ${appData.exams.length} paket ujian berhasil diatur menjadi ${newDur} menit!`,
        'success'
      );
    } else {
      updatedExams = appData.exams.map((ex) =>
        ex.id === quickDurationExam.id ? { ...ex, durationMinutes: newDur } : ex
      );
      onShowToast(
        `Durasi ujian "${quickDurationExam.title}" berhasil diatur menjadi ${newDur} menit!`,
        'success'
      );
    }
    onUpdateData({
      ...appData,
      exams: updatedExams,
    });
    setQuickDurationExam(null);
  };

  // Handlers for Multi-Device Sync (HP & Komputer)
  const handlePushToServer = async () => {
    setIsSyncingServer(true);
    const success = await syncDataToServer(appData);
    setIsSyncingServer(false);
    if (success) {
      onShowToast(
        `Berhasil menyinkronkan seluruh ${appData.bankQuestions.length} butir soal dan ${appData.exams.length} ujian ke server cloud! Seluruh HP siswa akan otomatis menerima data yang sama.`,
        'success'
      );
    } else {
      onShowToast(
        'Gagal mengirim sinkronisasi ke server. Anda tetap dapat menggunakan tombol Salin Kode Sinkronisasi untuk transfer offline.',
        'warning'
      );
    }
  };

  const handlePullFromServer = async () => {
    setIsSyncingServer(true);
    const serverData = await fetchServerData();
    setIsSyncingServer(false);
    if (serverData && serverData.bankQuestions && serverData.bankQuestions.length > 0) {
      onUpdateData(serverData);
      onShowToast(
        `Berhasil menarik data dari server! Memuat ${serverData.bankQuestions.length} butir soal dan ${serverData.exams.length} paket ujian.`,
        'success'
      );
      setIsSyncModalOpen(false);
    } else {
      onShowToast('Tidak ada data terbaru di server atau server sedang offline.', 'info');
    }
  };

  const handleCopySyncCode = () => {
    try {
      const code = exportDataToSyncCode(appData);
      navigator.clipboard.writeText(code);
      onShowToast('Kode sinkronisasi berhasil disalin ke clipboard! Tempelkan di HP untuk menyalin data secara instan.', 'success');
    } catch {
      onShowToast('Gagal menyalin kode ke clipboard.', 'error');
    }
  };

  const handleApplyImportSyncCode = () => {
    if (!importSyncCodeInput.trim()) {
      onShowToast('Silakan tempelkan kode sinkronisasi terlebih dahulu!', 'warning');
      return;
    }
    const imported = importDataFromSyncCode(importSyncCodeInput);
    if (imported) {
      onUpdateData(imported);
      onShowToast(
        `Berhasil menerapkan data dari kode! Memuat ${imported.bankQuestions.length} butir soal dan ${imported.exams.length} ujian.`,
        'success'
      );
      setImportSyncCodeInput('');
      setIsSyncModalOpen(false);
    } else {
      onShowToast('Kode sinkronisasi tidak valid. Harap periksa kembali teks yang Anda tempel.', 'error');
    }
  };

  // Handlers for Exams
  const handleOpenExamModal = (examToEdit?: Exam) => {
    if (examToEdit) {
      setEditingExamId(examToEdit.id);
      setExamForm({
        title: examToEdit.title,
        subject: examToEdit.subject,
        classLevel: examToEdit.classLevel,
        code: examToEdit.code,
        pin: examToEdit.pin,
        durationMinutes: examToEdit.durationMinutes,
        passingScore: examToEdit.passingScore,
        startTime: examToEdit.startTime,
        endTime: examToEdit.endTime,
        maxViolations: examToEdit.maxViolations,
        status: examToEdit.status,
        selectedQuestionIds: examToEdit.questions.map((q) => q.id),
      });
    } else {
      setEditingExamId(null);
      const defaultQuestions = appData.bankQuestions
        .filter(
          (q) =>
            q.classLevel === 'Kelas 7' &&
            (q.subject || '').trim().toLowerCase() === currentTeacherSubject.trim().toLowerCase()
        )
        .map((q) => q.id);

      setExamForm({
        title: `Ulangan Harian ${currentTeacherSubject} - Kelas 7`,
        subject: currentTeacherSubject,
        classLevel: 'Kelas 7',
        code: `${currentTeacherSubject.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase()}07-${Math.floor(100 + Math.random() * 900)}`,
        pin: '1234',
        durationMinutes: 45,
        passingScore: 75,
        startTime: new Date().toISOString().slice(0, 16),
        endTime: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 16),
        maxViolations: 3,
        status: 'Aktif',
        selectedQuestionIds: defaultQuestions,
      });
    }
    setIsExamModalOpen(true);
  };

  const handleSaveExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examForm.title.trim() || !examForm.code.trim()) {
      onShowToast('Judul dan Kode Ujian wajib diisi!', 'error');
      return;
    }
    const questionsForExam = appData.bankQuestions.filter((q) =>
      examForm.selectedQuestionIds.includes(q.id)
    );
    if (questionsForExam.length === 0) {
      onShowToast('Pilih setidaknya 1 butir soal untuk ujian ini!', 'warning');
      return;
    }

    if (editingExamId) {
      const updatedExams = appData.exams.map((ex) =>
        ex.id === editingExamId
          ? {
              ...ex,
              title: examForm.title,
              subject: examForm.subject,
              classLevel: examForm.classLevel,
              code: examForm.code,
              pin: examForm.pin,
              durationMinutes: Number(examForm.durationMinutes),
              passingScore: Number(examForm.passingScore),
              startTime: examForm.startTime,
              endTime: examForm.endTime,
              maxViolations: Number(examForm.maxViolations),
              status: examForm.status,
              questions: questionsForExam,
              teacherName: ex.teacherName || currentTeacherName,
            }
          : ex
      );
      onUpdateData({ ...appData, exams: updatedExams });
      onShowToast('Ujian berhasil diperbarui!', 'success');
    } else {
      const newExam: Exam = {
        id: `EXAM-${Date.now()}`,
        title: examForm.title,
        subject: examForm.subject,
        classLevel: examForm.classLevel,
        code: examForm.code,
        pin: examForm.pin,
        durationMinutes: Number(examForm.durationMinutes),
        passingScore: Number(examForm.passingScore),
        startTime: examForm.startTime,
        endTime: examForm.endTime,
        maxViolations: Number(examForm.maxViolations),
        status: examForm.status,
        teacherName: currentTeacherName,
        questions: questionsForExam,
      };
      onUpdateData({ ...appData, exams: [newExam, ...appData.exams] });
      onShowToast(`Ujian baru "${newExam.title}" berhasil dibuat!`, 'success');
    }
    setIsExamModalOpen(false);
  };

  const handleDeleteExam = (exam: Exam) => {
    onShowModal({
      title: 'Hapus Ujian',
      message: `Apakah Anda yakin ingin menghapus ujian "${exam.title}"? Seluruh konfigurasi ujian ini akan dihapus.`,
      type: 'danger',
      onConfirm: () => {
        const remaining = appData.exams.filter((e) => e.id !== exam.id);
        onUpdateData({ ...appData, exams: remaining });
        onShowToast(`Ujian "${exam.title}" berhasil dihapus.`, 'info');
      },
    });
  };

  const handleDuplicateExam = (exam: Exam) => {
    const copyExam: Exam = {
      ...exam,
      id: `EXAM-${Date.now()}`,
      title: `${exam.title} (Salinan)`,
      code: `${exam.code}-COPY`,
    };
    onUpdateData({ ...appData, exams: [copyExam, ...appData.exams] });
    onShowToast(`Berhasil menduplikasi ujian "${exam.title}".`, 'success');
  };

  const handleToggleExamStatus = (exam: Exam) => {
    const nextStatus: 'Aktif' | 'Nonaktif' = exam.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
    const updated: Exam[] = appData.exams.map((e) => (e.id === exam.id ? { ...e, status: nextStatus } : e));
    onUpdateData({ ...appData, exams: updated });
    onShowToast(`Status ujian ${exam.code} diubah menjadi ${nextStatus}.`, 'info');
  };

  // Handlers for Question Bank
  const handleOpenQuestionModal = (questionToEdit?: Question) => {
    if (questionToEdit) {
      setEditingQuestionId(questionToEdit.id);
      const isKnownSub = [
        'Informatika',
        'Bahasa Indonesia',
        'Bahasa Inggris',
        'IPA (Fisika, Biologi, Kimia)',
        'Matematika',
        'IPS (Ekonomi, Geografi, Sejarah)',
        'Pendidikan Agama Islam (PAI)',
        'Pendidikan Pancasila & Kewarganegaraan (PPKn)',
        'Pemrograman Web & Perangkat Bergerak',
        'Administrasi Infrastruktur Jaringan & Server',
        'Pemeliharaan Mesin & Kelistrikan Kendaraan',
      ].includes(questionToEdit.subject || '');

      setQuestionForm({
        subject: isKnownSub ? (questionToEdit.subject || currentTeacherSubject) : 'Lainnya',
        customSubject: isKnownSub ? '' : (questionToEdit.subject || ''),
        classLevel: questionToEdit.classLevel || 'Kelas 7',
        type: questionToEdit.type,
        question: questionToEdit.question,
        options: questionToEdit.options && questionToEdit.options.length > 0 ? [...questionToEdit.options] : ['', '', '', ''],
        answer: questionToEdit.answer,
        score: questionToEdit.score || 25,
        explanation: questionToEdit.explanation || '',
        imageUrl: questionToEdit.imageUrl || '',
      });
    } else {
      setEditingQuestionId(null);
      setQuestionForm({
        subject: currentTeacherSubject,
        customSubject: '',
        classLevel: selectedClassFilter !== 'Semua' ? selectedClassFilter : 'Kelas 7',
        type: 'pg',
        question: '',
        options: ['', '', '', ''],
        answer: '0',
        score: 25,
        explanation: '',
        imageUrl: '',
      });
    }
    setQuestionModalTab('form');
    setIsQuestionModalOpen(true);
  };

  const handleQuickChangeAnswerKey = (qId: string, newAnswer: string) => {
    const targetQ = appData.bankQuestions.find((q) => q.id === qId);
    const updatedBank = appData.bankQuestions.map((q) =>
      q.id === qId ? { ...q, answer: newAnswer } : q
    );
    const updatedExams = appData.exams.map((ex) => ({
      ...ex,
      questions: ex.questions.map((q) =>
        q.id === qId ? { ...q, answer: newAnswer } : q
      ),
    }));
    onUpdateData({
      ...appData,
      bankQuestions: updatedBank,
      exams: updatedExams,
    });
    let displayLabel = newAnswer;
    if (targetQ && targetQ.type === 'pg' && !isNaN(Number(newAnswer))) {
      displayLabel = String.fromCharCode(65 + Number(newAnswer));
    }
    onShowToast(`Kunci jawaban soal berhasil diubah menjadi "${displayLabel}"!`, 'success');
  };

  const handleInsertTableTemplate = () => {
    const tableTemplate = `\nNama Aksesori\tWarna\tJumlah\tKategori\tHarga\nJepit Pita\tPink\t4\tRambut\tRp 15.000\nKacamata\tHitam\t1\tMata\tRp 30.000\nGelang Manik\tPink\t5\tTangan\tRp 10.000\nCincin Bintang\tPink\t2\tJari\tRp 25.000\n`;
    setQuestionForm((prev) => ({
      ...prev,
      question: prev.question + (prev.question.endsWith('\n') ? '' : '\n') + tableTemplate,
    }));
    onShowToast('Format tabel disisipkan ke butir soal!', 'info');
  };

  const handleInsertCodeTemplate = () => {
    const codeTemplate = `\n\`\`\`\n// Diagram / Algoritma Pseudocode\nALGORITMA HitungDiskon\nINPUT harga_awal\nIF harga_awal > 20000 THEN\n    diskon = harga_awal * 0.1\nOUTPUT "Total Bayar: ", harga_awal - diskon\n\`\`\`\n`;
    setQuestionForm((prev) => ({
      ...prev,
      question: prev.question + (prev.question.endsWith('\n') ? '' : '\n') + codeTemplate,
    }));
    onShowToast('Format diagram/kode disisipkan ke butir soal!', 'info');
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      onShowToast('Ukuran gambar maksimal 3MB!', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setQuestionForm((prev) => ({ ...prev, imageUrl: dataUrl }));
      onShowToast('Gambar berhasil dimuat dan disematkan!', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionForm.question.trim()) {
      onShowToast('Teks pertanyaan wajib diisi!', 'error');
      return;
    }

    const finalSub =
      questionForm.subject === 'Lainnya'
        ? questionForm.customSubject.trim() || currentTeacherSubject
        : questionForm.subject || currentTeacherSubject;

    let finalOptions: string[] = [];
    if (questionForm.type === 'pg') {
      finalOptions = questionForm.options.map((o) => o.trim()).filter(Boolean);
      if (finalOptions.length < 2) {
        onShowToast('Pilihan ganda minimal memiliki 2 opsi jawaban!', 'error');
        return;
      }
    } else if (questionForm.type === 'bs') {
      finalOptions = ['Benar', 'Salah'];
    }

    if (editingQuestionId) {
      const updatedQuestion: Question = {
        id: editingQuestionId,
        subject: finalSub,
        classLevel: questionForm.classLevel,
        type: questionForm.type,
        question: questionForm.question.trim(),
        options: finalOptions,
        answer: questionForm.answer.trim(),
        score: Number(questionForm.score) || 25,
        explanation: questionForm.explanation.trim(),
        imageUrl: questionForm.imageUrl.trim() || undefined,
        teacherUsername: currentTeacher?.username || appData.currentUser?.username,
        teacherName: currentTeacherName,
      };
      const updatedBank = appData.bankQuestions.map((q) =>
        q.id === editingQuestionId ? updatedQuestion : q
      );
      const updatedExams = appData.exams.map((ex) => ({
        ...ex,
        questions: ex.questions.map((q) =>
          q.id === editingQuestionId ? updatedQuestion : q
        ),
      }));
      onUpdateData({
        ...appData,
        bankQuestions: updatedBank,
        exams: updatedExams,
      });
      onShowToast('Soal dan kunci jawaban berhasil diperbarui!', 'success');
    } else {
      const newQuestion: Question = {
        id: `bq-${Date.now()}`,
        subject: finalSub,
        classLevel: questionForm.classLevel,
        type: questionForm.type,
        question: questionForm.question.trim(),
        options: finalOptions,
        answer: questionForm.answer.trim(),
        score: Number(questionForm.score) || 25,
        explanation: questionForm.explanation.trim(),
        imageUrl: questionForm.imageUrl.trim() || undefined,
        teacherUsername: currentTeacher?.username || appData.currentUser?.username,
        teacherName: currentTeacherName,
      };
      onUpdateData({
        ...appData,
        bankQuestions: [newQuestion, ...appData.bankQuestions],
      });
      onShowToast(`Soal berhasil ditambahkan ke Bank Soal ${finalSub}!`, 'success');
    }
    setIsQuestionModalOpen(false);
  };

  const handleDeleteQuestion = (qId: string) => {
    onShowModal({
      title: 'Hapus Soal',
      message: 'Apakah Anda yakin ingin menghapus butir soal ini dari Bank Soal dan seluruh Paket Ujian?',
      type: 'danger',
      confirmLabel: 'Ya, Hapus Soal Ini',
      onConfirm: () => {
        const remainingBank = appData.bankQuestions.filter((q) => q.id !== qId);
        const updatedExams = (appData.exams || []).map((ex) => ({
          ...ex,
          questions: (ex.questions || []).filter((q) => q.id !== qId),
        }));
        onUpdateData({
          ...appData,
          bankQuestions: remainingBank,
          exams: updatedExams,
        });
        if (inspectExamQuestions) {
          setInspectExamQuestions((prev) =>
            prev ? { ...prev, questions: (prev.questions || []).filter((q) => q.id !== qId) } : null
          );
        }
        onShowToast('Butir soal berhasil dihapus dari Bank Soal dan seluruh Paket Ujian.', 'info');
      },
    });
  };

  // Document Upload / Parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    // Check if it's a Word .docx file
    if (lowerName.endsWith('.docx')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const result = await mammoth.extractRawText({ arrayBuffer });
          const text = result.value.trim();
          if (text) {
            setUploadRawText(text);
            onShowToast(`Dokumen Word "${file.name}" berhasil diekstrak menjadi teks soal!`, 'success');
          } else {
            onShowToast(`Dokumen Word kosong atau tidak memuat teks.`, 'warning');
          }
        } catch (err) {
          console.error('Error extracting text from docx:', err);
          onShowToast('Gagal mengekstrak berkas .docx. Anda dapat membuka Word, salin teks soal, lalu tempelkan di kotak bawah.', 'error');
        }
      };
      reader.onerror = () => {
        onShowToast('Gagal membaca berkas docx.', 'error');
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    if (lowerName.endsWith('.doc')) {
      onShowToast('Format .doc adalah format Word lama. Disarankan simpan sebagai .docx atau salin (copy) teksnya langsung.', 'warning');
      return;
    }

    // Default for .txt, .csv, and other text formats
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setUploadRawText(content);
      onShowToast(`File ${file.name} berhasil dimuat.`, 'info');
    };
    reader.onerror = () => {
      onShowToast('Gagal membaca file teks.', 'error');
    };
    reader.readAsText(file);
  };

  const handleProcessImport = () => {
    if (!uploadRawText.trim()) {
      onShowToast('Teks dokumen soal masih kosong!', 'error');
      return;
    }

    const finalSub =
      uploadSubject === 'Lainnya'
        ? uploadCustomSubject.trim() || currentTeacherSubject
        : uploadSubject || currentTeacherSubject;

    const parsed = parseRawQuestionText(
      uploadRawText,
      finalSub,
      uploadClassLevel,
      appData.currentUser?.username,
      currentTeacherName
    );

    if (parsed.length === 0) {
      onShowToast('Tidak ditemukan format soal yang valid.', 'error');
      return;
    }

    // New bank questions (prepend)
    const newBankQuestions = [...parsed, ...appData.bankQuestions];

    // If uploadAssignToExam is true, also automatically sync with the target exam!
    let updatedExams = appData.exams;
    let syncedExamTitle = '';
    if (uploadAssignToExam) {
      updatedExams = appData.exams.map((ex) => {
        const isTarget =
          uploadTargetExamId === 'auto'
            ? ex.classLevel === uploadClassLevel &&
              (ex.subject || '').trim().toLowerCase() === finalSub.trim().toLowerCase()
            : ex.id === uploadTargetExamId;
        if (isTarget) {
          syncedExamTitle = ex.title;
          const allQuestionsForThisClassAndSub = newBankQuestions.filter(
            (q) =>
              q.classLevel === ex.classLevel &&
              (q.subject || '').trim().toLowerCase() === ex.subject.trim().toLowerCase()
          );
          return {
            ...ex,
            questions: allQuestionsForThisClassAndSub,
          };
        }
        return ex;
      });
    }

    onUpdateData({
      ...appData,
      bankQuestions: newBankQuestions,
      exams: updatedExams,
    });

    if (uploadAssignToExam && syncedExamTitle) {
      onShowToast(
        `Berhasil mengimpor ${parsed.length} butir soal ke Bank Soal ${finalSub} dan langsung disinkronkan ke Ujian "${syncedExamTitle}"!`,
        'success'
      );
    } else {
      onShowToast(`Berhasil mengimpor ${parsed.length} butir soal ke Bank Soal ${finalSub}!`, 'success');
    }

    setUploadRawText('');
    setIsUploadModalOpen(false);
  };

  const handleClearAllBankQuestions = (onlyClass?: string) => {
    const isFiltered = onlyClass && onlyClass !== 'Semua';
    const isScopeMySubject = bankScopeMode === 'my_subject';
    const targetSubName = isScopeMySubject
      ? currentTeacherSubject
      : selectedSubjectFilter !== 'Semua'
      ? selectedSubjectFilter
      : 'Semua Mata Pelajaran';

    const title = `Hapus Soal ${targetSubName}${isFiltered ? ` (${onlyClass})` : ''}`;
    const message = `Apakah Anda yakin ingin menghapus butir soal untuk mata pelajaran "${targetSubName}"${
      isFiltered ? ` pada tingkat ${onlyClass}` : ''
    }? Butir soal mata pelajaran guru lain tersimpan aman dan tidak akan terhapus.`;

    onShowModal({
      title,
      message,
      type: 'danger',
      confirmLabel: 'Ya, Hapus Butir Soal Ini',
      onConfirm: () => {
        let remaining: Question[] = [];
        if (isScopeMySubject) {
          const mySubLower = currentTeacherSubject.toLowerCase();
          remaining = appData.bankQuestions.filter((q) => {
            const matchesSub =
              (q.subject || '').toLowerCase() === mySubLower ||
              (q.teacherUsername && q.teacherUsername === appData.currentUser?.username);
            const matchesCls = !isFiltered || q.classLevel === onlyClass;
            return !(matchesSub && matchesCls);
          });
        } else if (selectedSubjectFilter !== 'Semua') {
          const subLower = selectedSubjectFilter.toLowerCase();
          remaining = appData.bankQuestions.filter((q) => {
            const matchesSub = (q.subject || '').toLowerCase() === subLower;
            const matchesCls = !isFiltered || q.classLevel === onlyClass;
            return !(matchesSub && matchesCls);
          });
        } else if (isFiltered) {
          remaining = appData.bankQuestions.filter((q) => q.classLevel !== onlyClass);
        } else {
          remaining = [];
        }

        // Also clean deleted questions from all exams
        const removedQIds = new Set(
          appData.bankQuestions
            .filter((q) => !remaining.some((r) => r.id === q.id))
            .map((q) => q.id)
        );
        const updatedExams = (appData.exams || []).map((ex) => ({
          ...ex,
          questions: (ex.questions || []).filter((q) => !removedQIds.has(q.id)),
        }));

        onUpdateData({
          ...appData,
          bankQuestions: remaining,
          exams: updatedExams,
        });
        onShowToast(`Butir soal untuk ${targetSubName} berhasil dibersihkan dari Bank Soal dan seluruh Ujian.`, 'info');
      },
    });
  };

  const handleSyncExamWithBank = (exam: Exam) => {
    // 1. Try match classLevel and subject
    let questionsForExam = appData.bankQuestions.filter(
      (q) =>
        q.classLevel === exam.classLevel &&
        (q.subject || '').trim().toLowerCase() === (exam.subject || '').trim().toLowerCase()
    );

    // 2. If none, match subject across any class level
    if (questionsForExam.length === 0) {
      questionsForExam = appData.bankQuestions.filter(
        (q) => (q.subject || '').trim().toLowerCase() === (exam.subject || '').trim().toLowerCase()
      );
    }

    // 3. If still none, match class level
    if (questionsForExam.length === 0) {
      questionsForExam = appData.bankQuestions.filter(
        (q) => q.classLevel === exam.classLevel
      );
    }

    // 4. Fallback to all bank questions if available
    if (questionsForExam.length === 0 && appData.bankQuestions.length > 0) {
      questionsForExam = [...appData.bankQuestions];
    }

    if (questionsForExam.length === 0) {
      onShowToast(`Belum ada soal di Bank Soal untuk disinkronkan!`, 'warning');
      return;
    }

    const updatedExams = appData.exams.map((e) =>
      e.id === exam.id ? { ...e, questions: questionsForExam } : e
    );

    onUpdateData({
      ...appData,
      exams: updatedExams,
    });

    onShowToast(
      `Ujian "${exam.title}" berhasil disinkronkan! Seluruh ${questionsForExam.length} butir soal kini aktif untuk siswa.`,
      'success'
    );
  };

  const handleSyncAllExamsWithBank = () => {
    if (appData.bankQuestions.length === 0) {
      onShowToast('Bank Soal masih kosong. Tambahkan atau impor soal terlebih dahulu.', 'warning');
      return;
    }

    onShowModal({
      title: 'Sinkronkan Soal ke Seluruh Ujian',
      message: `Tindakan ini akan menyinkronkan seluruh ${appData.bankQuestions.length} butir soal dari Bank Soal ke seluruh ${appData.exams.length} paket ujian aktif. Siswa di semua kelas akan langsung menerima ${appData.bankQuestions.length} butir soal. Lanjutkan?`,
      type: 'info',
      confirmLabel: 'Ya, Sinkronkan Seluruh Ujian',
      onConfirm: () => {
        const updatedExams = appData.exams.map((exam) => {
          let questionsForExam = appData.bankQuestions.filter(
            (q) =>
              q.classLevel === exam.classLevel &&
              (q.subject || '').trim().toLowerCase() === (exam.subject || '').trim().toLowerCase()
          );
          if (questionsForExam.length === 0) {
            questionsForExam = appData.bankQuestions.filter(
              (q) => (q.subject || '').trim().toLowerCase() === (exam.subject || '').trim().toLowerCase()
            );
          }
          if (questionsForExam.length === 0) {
            questionsForExam = [...appData.bankQuestions];
          }
          return {
            ...exam,
            questions: questionsForExam,
          };
        });

        onUpdateData({
          ...appData,
          exams: updatedExams,
        });

        onShowToast(
          `Berhasil menyinkronkan ${appData.bankQuestions.length} butir soal ke seluruh ${appData.exams.length} paket ujian!`,
          'success'
        );
      },
    });
  };

  const handleRemoveQuestionFromExam = (examId: string, qId: string) => {
    onShowModal({
      title: 'Hapus Butir Soal Ujian',
      message: 'Apakah Anda yakin ingin menghapus butir soal ini dari paket ujian ini?',
      type: 'danger',
      confirmLabel: 'Ya, Hapus Butir Soal',
      onConfirm: () => {
        const updatedExams = appData.exams.map((e) => {
          if (e.id === examId) {
            return {
              ...e,
              questions: (e.questions || []).filter((q) => q.id !== qId),
            };
          }
          return e;
        });
        const remainingBank = appData.bankQuestions.filter((q) => q.id !== qId);
        onUpdateData({
          ...appData,
          bankQuestions: remainingBank,
          exams: updatedExams,
        });
        setInspectExamQuestions((prev) =>
          prev
            ? {
                ...prev,
                questions: (prev.questions || []).filter((item) => item.id !== qId),
              }
            : null
        );
        onShowToast('Butir soal berhasil dihapus dari paket ujian ini.', 'info');
      },
    });
  };

  // Submissions management
  const handleDeleteSubmission = (subId: string) => {
    onShowModal({
      title: 'Hapus Rekap Hasil Ujian',
      message: 'Apakah Anda yakin ingin menghapus data rekapitulasi ujian siswa ini?',
      type: 'danger',
      onConfirm: () => {
        const remaining = appData.submissions.filter((s) => s.id !== subId);
        onUpdateData({ ...appData, submissions: remaining });
        onShowToast('Data hasil ujian siswa berhasil dihapus.', 'info');
      },
    });
  };

  const handleClearAllSubmissions = () => {
    onShowModal({
      title: 'Hapus Semua Nilai',
      message: 'Apakah Anda yakin ingin mereset seluruh rekapitulasi nilai ujian siswa?',
      type: 'danger',
      onConfirm: () => {
        onUpdateData({ ...appData, submissions: [] });
        onShowToast('Seluruh rekapitulasi nilai berhasil dibersihkan.', 'info');
      },
    });
  };

  // Change Password
  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      onShowToast('Kata sandi minimal 4 karakter!', 'error');
      return;
    }
    const currentUsername = appData.currentUser?.username || 'sohibul';
    const updatedCreds = {
      ...appData.teacherCredentials,
      [currentUsername]: newPassword,
    };
    onUpdateData({ ...appData, teacherCredentials: updatedCreds });
    onShowToast('Kata sandi guru berhasil diubah!', 'success');
    setNewPassword('');
    setIsSettingsModalOpen(false);
  };

  // Filtered lists
  const allBankSubjects = Array.from(
    new Set([
      currentTeacherSubject,
      'Informatika',
      'Bahasa Indonesia',
      'Bahasa Inggris',
      'IPA (Fisika, Biologi, Kimia)',
      'Matematika',
      'IPS (Ekonomi, Geografi, Sejarah)',
      'Pendidikan Agama Islam (PAI)',
      'Pendidikan Pancasila & Kewarganegaraan (PPKn)',
      'Pemrograman Web & Perangkat Bergerak',
      'Administrasi Infrastruktur Jaringan & Server',
      'Pemeliharaan Mesin & Kelistrikan Kendaraan',
      ...appData.bankQuestions.map((q) => (q.subject || '').trim()).filter(Boolean),
      ...(appData.teachers || []).map((t) => t.subject.trim()).filter(Boolean),
    ])
  ).sort();

  const getSubjectBadgeStyle = (sub?: string) => {
    const s = (sub || '').toLowerCase();
    if (s.includes('informatika') || s.includes('komputer')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (s.includes('indonesia')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (s.includes('inggris')) {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
    if (s.includes('ipa') || s.includes('fisika') || s.includes('biologi') || s.includes('kimia')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (s.includes('matematika') || s.includes('mtk')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (s.includes('agama') || s.includes('pai')) {
      return 'bg-teal-50 text-teal-700 border-teal-200';
    }
    if (s.includes('rpl') || s.includes('web') || s.includes('program')) {
      return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    }
    if (s.includes('tkj') || s.includes('jaringan') || s.includes('server')) {
      return 'bg-sky-50 text-sky-700 border-sky-200';
    }
    if (s.includes('otomotif') || s.includes('mesin') || s.includes('tkr')) {
      return 'bg-orange-50 text-orange-700 border-orange-200';
    }
    if (s.includes('ips') || s.includes('ekonomi') || s.includes('sejarah')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const filteredExams = appData.exams.filter((ex) => {
    const matchesClass = selectedClassFilter === 'Semua' || ex.classLevel === selectedClassFilter;
    const matchesSearch =
      ex.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ex.teacherName && ex.teacherName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesClass && matchesSearch;
  });

  const filteredQuestions = appData.bankQuestions.filter((q) => {
    let matchesSubject = true;
    if (bankScopeMode === 'my_subject') {
      const qSub = (q.subject || '').trim().toLowerCase();
      const mySub = currentTeacherSubject.trim().toLowerCase();
      const isOwner =
        q.teacherUsername &&
        appData.currentUser?.username &&
        q.teacherUsername === appData.currentUser.username;
      matchesSubject = qSub.includes(mySub) || mySub.includes(qSub) || Boolean(isOwner);
    } else if (selectedSubjectFilter !== 'Semua') {
      matchesSubject = (q.subject || '').trim().toLowerCase() === selectedSubjectFilter.trim().toLowerCase();
    }

    const matchesTeacher =
      selectedTeacherFilter === 'Semua' ||
      q.teacherUsername === selectedTeacherFilter ||
      q.teacherName === selectedTeacherFilter;

    const matchesClass = selectedClassFilter === 'Semua' || q.classLevel === selectedClassFilter;
    const matchesType = selectedTypeFilter === 'Semua' || q.type === selectedTypeFilter;
    const matchesSearch =
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.subject && q.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (q.teacherName && q.teacherName.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSubject && matchesTeacher && matchesClass && matchesType && matchesSearch;
  });

  const filteredSubmissions = appData.submissions.filter((s) => {
    const matchesSearch =
      s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.examTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentClass.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredTeachers = (appData.teachers || []).filter((t) => {
    const matchesCategory =
      teacherCategoryFilter === 'Semua' ||
      (teacherCategoryFilter === 'Umum'
        ? !t.major || t.major.includes('Umum')
        : t.major && !t.major.includes('Umum'));
    const matchesSearch =
      t.name.toLowerCase().includes(teacherSearchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(teacherSearchQuery.toLowerCase()) ||
      t.username.toLowerCase().includes(teacherSearchQuery.toLowerCase()) ||
      (t.major && t.major.toLowerCase().includes(teacherSearchQuery.toLowerCase())) ||
      (t.nip && t.nip.includes(teacherSearchQuery));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Overview Statistics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">{totalExams}</div>
            <div className="text-xs text-slate-500 font-medium">Ujian Terjadwal</div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">{totalQuestions}</div>
            <div className="text-xs text-slate-500 font-medium">Bank Soal Aktif</div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">{totalSubmissions}</div>
            <div className="text-xs text-slate-500 font-medium">Siswa Selesai Ujian</div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 tabular-nums">
              {averageScore} <span className="text-xs font-normal text-slate-400">({passRate}% KKM)</span>
            </div>
            <div className="text-xs text-slate-500 font-medium">Rata-rata Nilai Asesmen</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation Toolbar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto p-1">
          <button
            onClick={() => onTabChange('exams')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'exams'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Manajemen Ujian (Kelas 7-12)</span>
          </button>
          <button
            onClick={() => onTabChange('bank')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'bank'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Bank Soal & Upload</span>
          </button>
          <button
            onClick={() => onTabChange('results')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'results'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Rekapitulasi Nilai</span>
          </button>
          <button
            onClick={() => onTabChange('teachers')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'teachers'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Guru, Biodata & Jadwal ({appData.teachers?.length || 0})</span>
          </button>
          <button
            onClick={() => onTabChange('audit')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Audit Log Pelanggaran</span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-1">
          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors flex items-center gap-1.5 border border-blue-200 cursor-pointer shadow-2xs"
            title="Sinkronisasi data soal & ujian antar HP dan Komputer"
          >
            <Smartphone className="w-3.5 h-3.5 text-blue-600" />
            <span>Sinkron ke HP / Cloud</span>
          </button>
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Key className="w-3.5 h-3.5 text-slate-600" />
            <span>Ubah Password</span>
          </button>
        </div>
      </div>

      {/* TAB 1: MANAJEMEN UJIAN */}
      {activeTab === 'exams' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari ujian / kode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48 sm:w-60"
                />
              </div>
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Semua">Semua Tingkat Kelas</option>
                <option value="Kelas 7">Kelas 7</option>
                <option value="Kelas 8">Kelas 8</option>
                <option value="Kelas 9">Kelas 9</option>
                <option value="Kelas 10">Kelas 10</option>
                <option value="Kelas 11">Kelas 11</option>
                <option value="Kelas 12">Kelas 12</option>
              </select>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleSyncAllExamsWithBank}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                title="Sinkronkan seluruh butir soal ke semua paket ujian sekaligus"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Sinkronkan 25 Soal ke Seluruh Ujian</span>
              </button>
              {appData.exams.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleOpenQuickDurationModal(appData.exams[0])}
                  className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Atur durasi waktu ujian (tidak harus default 40 menit)"
                >
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Atur Waktu Ujian</span>
                </button>
              )}
              <button
                onClick={() => handleOpenExamModal()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Ujian Baru</span>
              </button>
            </div>
          </div>

          {/* Exam Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredExams.map((exam) => (
              <div
                key={exam.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                      {exam.classLevel} • {exam.subject}
                    </span>
                    <button
                      onClick={() => handleToggleExamStatus(exam)}
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
                        exam.status === 'Aktif'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {exam.status}
                    </button>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug mb-1">
                    {exam.title}
                  </h3>
                  <div className="text-xs text-slate-500 space-y-1 mb-3">
                    <div className="flex items-center gap-3">
                      <span>Kode: <strong className="font-mono text-slate-800">{exam.code}</strong></span>
                      <span>PIN: <strong className="font-mono text-blue-600">{exam.pin}</strong></span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleOpenQuickDurationModal(exam)}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold transition-colors border border-blue-200 text-[11px] cursor-pointer"
                        title="Klik untuk mengubah durasi waktu ujian ini"
                      >
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>{exam.durationMinutes} Menit</span>
                        <span className="text-[9px] bg-blue-200/80 text-blue-800 px-1 rounded font-bold">Ubah</span>
                      </button>
                      <span className="font-semibold text-blue-700">{exam.questions.length} Butir Soal</span>
                      <span>KKM: <strong className="text-emerald-700">{exam.passingScore}</strong></span>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-2.5 text-[11px] text-slate-600 space-y-0.5 mb-3 border border-slate-100">
                    <div>Maks. Pelanggaran Kiosk: <strong>{exam.maxViolations}x</strong></div>
                    <div>Jadwal: {exam.startTime.replace('T', ' ')} s/d {exam.endTime.replace('T', ' ')}</div>
                  </div>

                  {/* Kelola Butir Soal & Quick Sync Buttons */}
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setInspectExamQuestions(exam)}
                      className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Lihat dan kelola / hapus butir soal di dalam ujian ini"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Kelola Soal ({exam.questions.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSyncExamWithBank(exam)}
                      className={`py-1.5 px-2 text-[11px] font-semibold rounded-xl border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                        exam.questions.length !== appData.bankQuestions.length
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                      title="Sinkronkan soal ujian ini dengan Bank Soal"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{exam.questions.length === appData.bankQuestions.length ? 'Tersinkron' : `Isi (${appData.bankQuestions.length})`}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenQuickDurationModal(exam)}
                    title="Atur Waktu / Durasi Ujian"
                    className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 border border-amber-200 cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Atur Waktu</span>
                  </button>
                  <button
                    onClick={() => handleOpenExamModal(exam)}
                    className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDuplicateExam(exam)}
                    title="Duplikat Ujian"
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteExam(exam)}
                    title="Hapus Ujian"
                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredExams.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
              Tidak ada ujian yang cocok dengan filter pencarian.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BANK SOAL & UPLOAD */}
      {activeTab === 'bank' && (
        <div className="space-y-4">
          {/* Top Banner: Pemisahan Bank Soal per Mata Pelajaran & Guru */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>Pemisahan Bank Soal per Mata Pelajaran & Guru</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Terisolasi Mandiri
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Setiap guru memiliki bank soal masing-masing sesuai mata pelajaran agar butir soal tidak tercampur.
                  </p>
                </div>
              </div>

              {/* Mode Toggle: Bank Soal Saya vs Semua Bank Soal */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0 self-start md:self-auto border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => {
                    setBankScopeMode('my_subject');
                    setSelectedSubjectFilter('Semua');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    bankScopeMode === 'my_subject'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Bank Soal Saya ({currentTeacherSubject})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBankScopeMode('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    bankScopeMode === 'all'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Semua Bank Soal ({appData.bankQuestions.length})</span>
                </button>
              </div>
            </div>

            {/* Scope Information Badge */}
            {bankScopeMode === 'my_subject' ? (
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-blue-50/80 rounded-xl border border-blue-200 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                  <span className="text-slate-700">
                    Mode Mandiri Aktif: Menampilkan bank soal untuk mata pelajaran <strong className="text-blue-700 font-bold">{currentTeacherSubject}</strong> milik guru <strong className="text-slate-900">{currentTeacherName}</strong>. Butir soal terpisah aman dari mata pelajaran lain.
                  </span>
                </div>
                <div className="text-[11px] text-blue-800 font-bold bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs">
                  {filteredQuestions.length} Soal Khusus {currentTeacherSubject}
                </div>
              </div>
            ) : (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="text-[11px] text-slate-600 font-medium flex items-center justify-between">
                  <span>Pilih mata pelajaran untuk memfilter bank soal:</span>
                  <span className="text-blue-700 font-bold">{filteredQuestions.length} Soal Ditampilkan</span>
                </div>
                {/* Horizontal scroll pill buttons */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedSubjectFilter('Semua')}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedSubjectFilter === 'Semua'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Semua Mapel ({appData.bankQuestions.length})
                  </button>
                  {allBankSubjects.map((sub) => {
                    const count = appData.bankQuestions.filter(
                      (q) => (q.subject || '').trim().toLowerCase() === sub.toLowerCase()
                    ).length;
                    const isSelected = selectedSubjectFilter.toLowerCase() === sub.toLowerCase();
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setSelectedSubjectFilter(sub)}
                        className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {sub} <span className="opacity-75 font-mono text-[10px]">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari butir soal / materi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44 sm:w-56"
                />
              </div>

              {bankScopeMode === 'all' && (
                <select
                  value={selectedSubjectFilter}
                  onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[180px]"
                >
                  <option value="Semua">Semua Mata Pelajaran</option>
                  {allBankSubjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={selectedTeacherFilter}
                onChange={(e) => setSelectedTeacherFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[170px]"
              >
                <option value="Semua">Semua Guru Pengampu</option>
                {(appData.teachers || []).map((t) => (
                  <option key={t.username} value={t.username}>
                    {t.name} ({t.subject})
                  </option>
                ))}
              </select>

              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Semua">Semua Tingkat</option>
                <option value="Kelas 7">Kelas 7</option>
                <option value="Kelas 8">Kelas 8</option>
                <option value="Kelas 9">Kelas 9</option>
                <option value="Kelas 10">Kelas 10</option>
                <option value="Kelas 11">Kelas 11</option>
                <option value="Kelas 12">Kelas 12</option>
              </select>

              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Semua">Semua Tipe</option>
                <option value="pg">Pilihan Ganda</option>
                <option value="bs">Benar / Salah</option>
                <option value="isian">Isian Singkat</option>
                <option value="uraian">Uraian / Essay</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              {filteredQuestions.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleClearAllBankQuestions(selectedClassFilter)}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Hapus butir soal terpilih di Bank Soal"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Soal {selectedClassFilter === 'Semua' ? (bankScopeMode === 'my_subject' ? currentTeacherSubject : 'Terpilih') : selectedClassFilter}</span>
                </button>
              )}
              <button
                onClick={() => {
                  setUploadSubject(currentTeacherSubject);
                  setIsUploadModalOpen(true);
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Dokumen Soal</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenQuestionModal()}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Soal</span>
              </button>
            </div>
          </div>

          {/* Klasifikasi Ringkas Paket Bank Soal per Kelas */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Klasifikasi Paket Bank Soal ({filteredQuestions.length} Butir Soal Terfilter)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Klik tingkat kelas untuk filter cepat atau sinkronkan langsung ke ujian siswa agar seluruh soal tampil lengkap sesuai mata pelajaran.
                </p>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setBankViewMode('ringkas')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    bankViewMode === 'ringkas'
                      ? 'bg-white text-blue-600 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tampilan Ringkas (Tabel)
                </button>
                <button
                  type="button"
                  onClick={() => setBankViewMode('kartu')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    bankViewMode === 'kartu'
                      ? 'bg-white text-blue-600 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tampilan Kartu
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {['Kelas 7', 'Kelas 8', 'Kelas 9', 'Kelas 10', 'Kelas 11', 'Kelas 12'].map((cls) => {
                const qCount = filteredQuestions.filter((q) => q.classLevel === cls).length;
                const targetExam = appData.exams.find(
                  (e) =>
                    e.classLevel === cls &&
                    (bankScopeMode === 'my_subject'
                      ? (e.subject || '').trim().toLowerCase() === currentTeacherSubject.trim().toLowerCase()
                      : selectedSubjectFilter !== 'Semua'
                      ? (e.subject || '').trim().toLowerCase() === selectedSubjectFilter.trim().toLowerCase()
                      : true)
                );
                const isSelected = selectedClassFilter === cls;

                return (
                  <div
                    key={cls}
                    onClick={() => setSelectedClassFilter(cls === selectedClassFilter ? 'Semua' : cls)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-400 ring-1 ring-blue-400 shadow-xs'
                        : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900">{cls}</span>
                      <span className="text-[11px] font-extrabold text-blue-600 bg-blue-100/80 px-1.5 py-0.5 rounded">
                        {qCount} Soal
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mb-2 truncate">
                      {targetExam ? `${targetExam.subject} (${targetExam.code})` : 'Belum ada ujian'}
                    </div>
                    {qCount > 0 && targetExam && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSyncExamWithBank(targetExam);
                        }}
                        className="w-full py-1 px-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        title={`Masukkan seluruh ${qCount} butir soal ${targetExam.subject} ke ujian ${cls}`}
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Sinkron ke Siswa</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* TAMPILAN RINGKAS (TABEL DAFTAR SOAL) */}
          {bankViewMode === 'ringkas' ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center">No</th>
                      <th className="px-4 py-3 w-28">Tingkat & Tipe</th>
                      <th className="px-4 py-3 min-w-[320px]">Butir Pertanyaan (Tabel/Gambar/Teks) & Opsi</th>
                      <th className="px-4 py-3 min-w-[200px]">Ubah Kunci Jawaban</th>
                      <th className="px-4 py-3 w-20 text-center">Bobot</th>
                      <th className="px-4 py-3 w-24 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredQuestions.map((q, idx) => (
                      <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 text-center font-bold text-slate-500 tabular-nums">
                          #{idx + 1}
                        </td>
                        <td className="px-4 py-3 align-top space-y-1">
                          <span
                            className={`font-semibold px-2 py-0.5 rounded-lg border block text-[11px] w-max ${getSubjectBadgeStyle(
                              q.subject
                            )}`}
                          >
                            {q.subject || 'Informatika'}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                              {q.classLevel || 'Umum'}
                            </span>
                            <span className="font-bold uppercase text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                              {q.type.toUpperCase()}
                            </span>
                          </div>
                          {q.teacherName && (
                            <div className="text-[10px] text-slate-500 font-medium truncate max-w-[150px]" title={`Guru: ${q.teacherName}`}>
                              • {q.teacherName}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="mb-2">
                            <QuestionContentRenderer content={q.question} imageUrl={q.imageUrl} compact={true} />
                          </div>
                          {q.options.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                              {q.options.map((opt, optIdx) => {
                                const isCorrect =
                                  String(optIdx) === q.answer ||
                                  opt.toLowerCase() === q.answer.toLowerCase();
                                return (
                                  <button
                                    key={optIdx}
                                    type="button"
                                    onClick={() => handleQuickChangeAnswerKey(q.id, String(optIdx))}
                                    title={`Klik untuk jadikan ${String.fromCharCode(65 + optIdx)} sebagai kunci jawaban`}
                                    className={`px-2 py-1 rounded border text-left transition-all cursor-pointer ${
                                      isCorrect
                                        ? 'bg-emerald-50 border-emerald-400 text-emerald-800 font-bold ring-1 ring-emerald-300'
                                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    <strong className="mr-1">{String.fromCharCode(65 + optIdx)}.</strong> {opt}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          {q.type === 'pg' && (
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1">
                                {['A', 'B', 'C', 'D', 'E'].slice(0, Math.max(q.options.length, 4)).map((letter, optI) => {
                                  const isSelected = String(optI) === q.answer;
                                  return (
                                    <button
                                      key={letter}
                                      type="button"
                                      onClick={() => handleQuickChangeAnswerKey(q.id, String(optI))}
                                      title={`Ubah kunci jawaban menjadi ${letter}`}
                                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                                        isSelected
                                          ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400 scale-105'
                                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                                      }`}
                                    >
                                      {letter}
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium">
                                Kunci aktif:{' '}
                                <strong className="text-emerald-700">
                                  {q.options[Number(q.answer)]
                                    ? `${String.fromCharCode(65 + Number(q.answer))}. ${q.options[Number(q.answer)]}`
                                    : !isNaN(Number(q.answer))
                                    ? String.fromCharCode(65 + Number(q.answer))
                                    : q.answer}
                                </strong>
                              </div>
                            </div>
                          )}
                          {q.type === 'bs' && (
                            <div className="flex items-center gap-1.5">
                              {['Benar', 'Salah'].map((val) => {
                                const isSelected = q.answer.toLowerCase() === val.toLowerCase();
                                return (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => handleQuickChangeAnswerKey(q.id, val)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-xs'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                                    }`}
                                  >
                                    {val}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {(q.type === 'isian' || q.type === 'uraian') && (
                            <div className="flex items-center gap-1.5">
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs truncate max-w-[140px]">
                                {q.answer}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenQuestionModal(q)}
                                className="text-blue-600 hover:underline text-[11px] font-semibold cursor-pointer"
                              >
                                Ubah
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600 tabular-nums align-top">
                          {q.score} Poin
                        </td>
                        <td className="px-4 py-3 text-right align-top">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenQuestionModal(q)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit butir soal, opsi, kunci, atau gambar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus butir soal ini"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* TAMPILAN KARTU */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span
                          className={`font-semibold px-2 py-0.5 rounded-lg border text-[11px] ${getSubjectBadgeStyle(
                            q.subject
                          )}`}
                        >
                          {q.subject || 'Informatika'}
                        </span>
                        <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {q.classLevel || 'Umum'}
                        </span>
                        <span className="font-bold uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[10px]">
                          {q.type.toUpperCase()}
                        </span>
                        {q.teacherName && (
                          <span className="text-[10px] text-slate-500 font-medium truncate max-w-[150px]">
                            • {q.teacherName}
                          </span>
                        )}
                        <span className="text-slate-400 text-xs">#{idx + 1}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenQuestionModal(q)}
                          title="Edit Butir Soal"
                          className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(q.id)}
                          title="Hapus Butir Soal"
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mb-3">
                      <QuestionContentRenderer content={q.question} imageUrl={q.imageUrl} />
                    </div>
                    {q.options.length > 0 && (
                      <div className="space-y-1.5 mb-3">
                        {q.options.map((opt, optIdx) => {
                          const isCorrect =
                            String(optIdx) === q.answer ||
                            opt.toLowerCase() === q.answer.toLowerCase();
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => handleQuickChangeAnswerKey(q.id, String(optIdx))}
                              title={`Klik untuk jadikan ${String.fromCharCode(65 + optIdx)} sebagai kunci`}
                              className={`w-full text-left text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                                isCorrect
                                  ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-semibold ring-1 ring-emerald-300'
                                  : 'bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <span className="font-bold mr-1.5">
                                {String.fromCharCode(65 + optIdx)}.
                              </span>
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-600">Kunci:</span>
                      {q.type === 'pg' && (
                        <div className="flex items-center gap-1">
                          {['A', 'B', 'C', 'D', 'E'].slice(0, Math.max(q.options.length, 4)).map((letter, optI) => {
                            const isSelected = String(optI) === q.answer;
                            return (
                              <button
                                key={letter}
                                type="button"
                                onClick={() => handleQuickChangeAnswerKey(q.id, String(optI))}
                                className={`w-6 h-6 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white ring-1 ring-emerald-400'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                              >
                                {letter}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {q.type === 'bs' && (
                        <div className="flex items-center gap-1">
                          {['Benar', 'Salah'].map((val) => {
                            const isSelected = q.answer.toLowerCase() === val.toLowerCase();
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() => handleQuickChangeAnswerKey(q.id, val)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {q.type !== 'pg' && q.type !== 'bs' && (
                        <strong className="text-emerald-700">{q.answer}</strong>
                      )}
                    </div>
                    <span>Bobot: <strong>{q.score}</strong> Poin</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredQuestions.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
              Belum ada soal pada filter ini. Klik &ldquo;Tambah Soal&rdquo; atau &ldquo;Upload Dokumen Soal&rdquo;.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: REKAPITULASI NILAI */}
      {activeTab === 'results' && (
        <div className="space-y-4">
          {/* Live Student Ongoing Session Monitor */}
          {(() => {
            const activeOngoingSessions = Object.values(appData.ongoingSessions || {}).filter(
              (s) => !(appData.submissions || []).some((sub) => sub.examId === s.examId && sub.studentUsername === s.studentUsername)
            );
            if (activeOngoingSessions.length === 0) return null;

            return (
              <div className="bg-amber-50/80 border border-amber-300 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                    <h4 className="font-bold text-amber-900 text-xs sm:text-sm">
                      Monitoring Siswa Sedang Mengerjakan / Terputus ({activeOngoingSessions.length} Sesi Terpantau)
                    </h4>
                  </div>
                  <span className="text-[11px] text-amber-800 font-semibold bg-amber-100/80 px-2.5 py-0.5 rounded-lg border border-amber-200">
                    Auto-Save & Sisa Waktu Terproteksi
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeOngoingSessions.map((os) => {
                    const m = Math.floor(os.timeRemainingSeconds / 60);
                    const s = os.timeRemainingSeconds % 60;
                    const formatted = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                    const answeredCount = Object.keys(os.answers || {}).filter((k) => os.answers[k]?.trim() !== '').length;

                    return (
                      <div key={`${os.studentUsername}_${os.examId}`} className="bg-white p-3.5 rounded-xl border border-amber-200/90 shadow-2xs space-y-1.5 text-xs">
                        <div className="flex items-start justify-between">
                          <div>
                            <strong className="text-slate-900 block truncate max-w-[170px]">{os.studentName}</strong>
                            <span className="text-[11px] text-slate-500 font-mono">@{os.studentUsername} • {os.studentClass}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${os.isDisconnected ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                            {os.isDisconnected ? 'Terputus (Offline)' : 'Aktif Mengerjakan'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 truncate font-medium">
                          {os.examTitle}
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                          <span className="text-blue-700 font-semibold font-mono">Sisa: {formatted}</span>
                          <span className="text-emerald-700 font-semibold">{answeredCount} Soal Terjawab</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari siswa / kelas / ujian..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-52 sm:w-64"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => exportSubmissionsToCSV(filteredSubmissions)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export Nilai CSV</span>
              </button>
              {appData.submissions.length > 0 && (
                <button
                  onClick={handleClearAllSubmissions}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Bersihkan Semua</span>
                </button>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Nama Siswa & Kelas</th>
                    <th className="px-5 py-3">Mata Ujian</th>
                    <th className="px-5 py-3">Nilai Akhir</th>
                    <th className="px-5 py-3">Status KKM</th>
                    <th className="px-5 py-3">Pelanggaran Kiosk</th>
                    <th className="px-5 py-3">Waktu Pengerjaan</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubmissions.map((sub) => {
                    const exam = appData.exams.find((e) => e.id === sub.examId);
                    const kkm = exam ? exam.passingScore : 75;
                    const isPassed = sub.score >= kkm;
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-900">{sub.studentName}</div>
                          <div className="text-[11px] text-slate-500">
                            {sub.studentClass || 'Siswa'} • @{sub.studentUsername}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-800 max-w-xs truncate">
                          {sub.examTitle}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`text-base font-extrabold tabular-nums ${
                              isPassed ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {sub.score}
                          </span>
                          <span className="text-[10px] text-slate-400"> / 100</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              isPassed
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {isPassed ? `Lulus (KKM ${kkm})` : 'Remedial'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              sub.violations > 0
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {sub.violations}x
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 tabular-nums">
                          <div>{Math.round(sub.durationSpentSeconds / 60)} Menit</div>
                          <div className="text-[10px] text-slate-400">{sub.submittedAt}</div>
                        </td>
                        <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedSubmissionDetail(sub)}
                            className="px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Detail
                          </button>
                          <button
                            onClick={() => handleDeleteSubmission(sub.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                            title="Hapus Nilai"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredSubmissions.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-xs">
                Belum ada data pengerjaan ujian siswa yang tersimpan.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOG KEAMANAN */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/80">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Audit Log Anti-Cheat & Kiosk Mode
              </h3>
              <p className="text-xs text-slate-500">
                Pencatatan real-time saat siswa berpindah tab, keluar fullscreen, atau kehilangan fokus jendela.
              </p>
            </div>
            {appData.auditLogs.length > 0 && (
              <button
                onClick={() => onUpdateData({ ...appData, auditLogs: [] })}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Bersihkan Log
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Waktu</th>
                    <th className="px-5 py-3">Pengguna / Siswa</th>
                    <th className="px-5 py-3">Tindakan Pelanggaran</th>
                    <th className="px-5 py-3">Detail Pelanggaran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appData.auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3 font-mono text-slate-500 tabular-nums">
                        {log.time}
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-900">
                        {log.user}
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-700">
                        {log.detail}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {appData.auditLogs.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-xs">
                Belum ada rekaman pelanggaran keamanan.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: DATA GURU, BIODATA, JADWAL MENGAJAR & KEAMANAN */}
      {activeTab === 'teachers' && (
        <TeacherDirectoryAndSchedule
          teachers={appData.teachers || []}
          currentUser={appData.currentUser!}
          teacherCredentials={appData.teacherCredentials || {}}
          onUpdateTeachers={(updatedTeachers) => {
            onUpdateData({
              ...appData,
              teachers: updatedTeachers,
            });
          }}
          onUpdateCredentials={(updatedCredentials) => {
            savePersistentTeacherCredentials(updatedCredentials);
            onUpdateData({
              ...appData,
              teacherCredentials: updatedCredentials,
            });
          }}
          onUpdateTeachersAndCredentials={(updatedTeachers, updatedCredentials) => {
            const newCreds = updatedCredentials || appData.teacherCredentials;
            savePersistentTeacherCredentials(newCreds);
            onUpdateData({
              ...appData,
              teachers: updatedTeachers,
              teacherCredentials: newCreds,
            });
          }}
          onDeleteTeacher={handleDeleteTeacher}
          onShowToast={onShowToast}
          onShowModal={onShowModal}
          onCreateExamForTeacher={handleCreateExamForTeacher}
        />
      )}

      {/* MODAL: BUAT / EDIT UJIAN */}
      {isExamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-100 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              {editingExamId ? 'Edit Konfigurasi Ujian' : 'Buat Ujian Baru (Kelas 7-12)'}
            </h3>
            <form onSubmit={handleSaveExam} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Judul Ujian</label>
                <input
                  type="text"
                  required
                  value={examForm.title}
                  onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Contoh: Ulangan Harian Kelas 7 - Berpikir Komputasional"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tingkat Kelas</label>
                  <select
                    value={examForm.classLevel}
                    onChange={(e) => {
                      const newCls = e.target.value;
                      const relatedQIds = appData.bankQuestions
                        .filter((q) => q.classLevel === newCls)
                        .map((q) => q.id);
                      setExamForm({
                        ...examForm,
                        classLevel: newCls,
                        selectedQuestionIds: relatedQIds.length > 0 ? relatedQIds : examForm.selectedQuestionIds,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Kelas 7">Kelas 7</option>
                    <option value="Kelas 8">Kelas 8</option>
                    <option value="Kelas 9">Kelas 9</option>
                    <option value="Kelas 10">Kelas 10</option>
                    <option value="Kelas 11">Kelas 11</option>
                    <option value="Kelas 12">Kelas 12</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode Ujian (Unik)</label>
                  <input
                    type="text"
                    required
                    value={examForm.code}
                    onChange={(e) => setExamForm({ ...examForm, code: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="INF07"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">PIN Akses Ujian</label>
                  <input
                    type="text"
                    required
                    value={examForm.pin}
                    onChange={(e) => setExamForm({ ...examForm, pin: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="1234"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold text-slate-700">Durasi (Menit)</label>
                    <span className="text-[11px] font-mono font-bold text-blue-600">{examForm.durationMinutes} Menit</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      required
                      min={5}
                      max={360}
                      value={examForm.durationMinutes}
                      onChange={(e) => setExamForm({ ...examForm, durationMinutes: Number(e.target.value) })}
                      className="w-20 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-center font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setExamForm({ ...examForm, durationMinutes: Math.max(5, examForm.durationMinutes - 5) })}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] cursor-pointer"
                        title="Kurangi 5 menit"
                      >
                        -5
                      </button>
                      <button
                        type="button"
                        onClick={() => setExamForm({ ...examForm, durationMinutes: examForm.durationMinutes + 5 })}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] cursor-pointer"
                        title="Tambah 5 menit"
                      >
                        +5
                      </button>
                      <button
                        type="button"
                        onClick={() => setExamForm({ ...examForm, durationMinutes: examForm.durationMinutes + 15 })}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[11px] cursor-pointer"
                        title="Tambah 15 menit"
                      >
                        +15
                      </button>
                    </div>
                  </div>
                  {/* Preset Quick Buttons */}
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    {[15, 30, 40, 45, 60, 75, 90, 120].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setExamForm({ ...examForm, durationMinutes: mins })}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                          examForm.durationMinutes === mins
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">KKM (Nilai Minimum)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    value={examForm.passingScore}
                    onChange={(e) => setExamForm({ ...examForm, passingScore: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Waktu Mulai</label>
                  <input
                    type="datetime-local"
                    required
                    value={examForm.startTime}
                    onChange={(e) => setExamForm({ ...examForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Waktu Selesai</label>
                  <input
                    type="datetime-local"
                    required
                    value={examForm.endTime}
                    onChange={(e) => setExamForm({ ...examForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Maksimal Pelanggaran Kiosk Mode (Tab Switch / Fullscreen Exit)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  required
                  value={examForm.maxViolations}
                  onChange={(e) => setExamForm({ ...examForm, maxViolations: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Questions Picker */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                  <label className="font-semibold text-slate-700">
                    Pilih Soal dari Bank Soal ({examForm.selectedQuestionIds.length} Soal Dipilih)
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const classQIds = appData.bankQuestions
                          .filter((q) => q.classLevel === examForm.classLevel)
                          .map((q) => q.id);
                        setExamForm({ ...examForm, selectedQuestionIds: classQIds });
                      }}
                      className="text-blue-600 hover:underline text-[11px] font-semibold cursor-pointer"
                    >
                      Pilih Semua Soal {examForm.classLevel} ({appData.bankQuestions.filter(q => q.classLevel === examForm.classLevel).length})
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = appData.bankQuestions.map((q) => q.id);
                        setExamForm({ ...examForm, selectedQuestionIds: allIds });
                      }}
                      className="text-slate-500 hover:underline text-[11px] cursor-pointer"
                    >
                      Semua Kelas
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                  {appData.bankQuestions.map((bq) => {
                    const isChecked = examForm.selectedQuestionIds.includes(bq.id);
                    return (
                      <label
                        key={bq.id}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-blue-50/70 border-blue-200 text-slate-900'
                            : 'bg-white border-slate-100 text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setExamForm({
                                ...examForm,
                                selectedQuestionIds: [...examForm.selectedQuestionIds, bq.id],
                              });
                            } else {
                              setExamForm({
                                ...examForm,
                                selectedQuestionIds: examForm.selectedQuestionIds.filter((id) => id !== bq.id),
                              });
                            }
                          }}
                          className="mt-0.5 rounded text-blue-600"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-0.5">
                            <span className="font-semibold">{bq.classLevel || 'Umum'}</span>
                            <span>•</span>
                            <span className="uppercase font-bold text-blue-600">[{bq.type}]</span>
                            <span>•</span>
                            <span>{bq.score} Poin</span>
                          </div>
                          <p className="truncate text-xs font-medium">{bq.question}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsExamModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs cursor-pointer"
                >
                  Simpan Ujian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT BUTIR SOAL */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-7 border border-slate-100 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  {editingQuestionId ? (
                    <>
                      <Edit className="w-5 h-5 text-blue-600" />
                      <span>Edit Butir Soal & Kunci Jawaban</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 text-emerald-600" />
                      <span>Tambah Butir Soal Baru ke Bank Soal</span>
                    </>
                  )}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mendukung tabel data, diagram kode, gambar ilustrasi, serta penentuan kunci jawaban.
                </p>
              </div>

              {/* Form vs Preview Tab */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setQuestionModalTab('form')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    questionModalTab === 'form'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Editor Soal
                </button>
                <button
                  type="button"
                  onClick={() => setQuestionModalTab('preview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                    questionModalTab === 'preview'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Pratinjau Siswa</span>
                </button>
              </div>
            </div>

            {questionModalTab === 'preview' ? (
              <div className="space-y-4 py-2">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2 pb-2 border-b border-slate-200">
                    <span className="font-bold text-slate-800">{questionForm.classLevel} • {questionForm.subject}</span>
                    <span className="uppercase font-semibold text-blue-600">[{questionForm.type}] • {questionForm.score} Poin</span>
                  </div>
                  <QuestionContentRenderer
                    content={questionForm.question || '(Belum ada teks pertanyaan)'}
                    imageUrl={questionForm.imageUrl}
                  />

                  {questionForm.type === 'pg' && (
                    <div className="mt-4 space-y-2">
                      <div className="text-xs font-semibold text-slate-700">Pilihan Jawaban:</div>
                      {questionForm.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                            String(oIdx) === questionForm.answer
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-900 font-semibold ring-1 ring-emerald-300'
                              : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className="font-bold w-5">{String.fromCharCode(65 + oIdx)}.</span>
                          <span>{opt || `(Opsi ${String.fromCharCode(65 + oIdx)})`}</span>
                          {String(oIdx) === questionForm.answer && (
                            <span className="ml-auto text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold">
                              KUNCI BENAR
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {questionForm.type === 'bs' && (
                    <div className="mt-4 flex items-center gap-3">
                      {['Benar', 'Salah'].map((val) => (
                        <div
                          key={val}
                          className={`flex-1 p-3 text-center rounded-xl border text-xs font-bold ${
                            questionForm.answer === val
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-900 ring-1 ring-emerald-300'
                              : 'bg-white border-slate-200 text-slate-500'
                          }`}
                        >
                          {val} {questionForm.answer === val && '✓ (Kunci)'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setQuestionModalTab('form')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Kembali ke Editor
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tingkat Kelas</label>
                    <select
                      value={questionForm.classLevel}
                      onChange={(e) => setQuestionForm({ ...questionForm, classLevel: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                    >
                      <option value="Kelas 7">Kelas 7</option>
                      <option value="Kelas 8">Kelas 8</option>
                      <option value="Kelas 9">Kelas 9</option>
                      <option value="Kelas 10">Kelas 10</option>
                      <option value="Kelas 11">Kelas 11</option>
                      <option value="Kelas 12">Kelas 12</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tipe Soal</label>
                    <select
                      value={questionForm.type}
                      onChange={(e) => {
                        const t = e.target.value as QuestionType;
                        setQuestionForm({
                          ...questionForm,
                          type: t,
                          answer: t === 'bs' ? 'Benar' : t === 'pg' ? '0' : '',
                        });
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                    >
                      <option value="pg">Pilihan Ganda (PG)</option>
                      <option value="bs">Benar / Salah (B/S)</option>
                      <option value="isian">Isian Singkat</option>
                      <option value="uraian">Uraian / Essay</option>
                    </select>
                  </div>
                </div>

                {/* Question Body with Quick Template Insert Tools */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                    <label className="font-semibold text-slate-700">
                      Teks Pertanyaan / Soal (Bisa Memuat Tabel atau Diagram)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleInsertTableTemplate}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-semibold border border-blue-200 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Sisipkan contoh tabel otomatis"
                      >
                        <TableIcon className="w-3.5 h-3.5" />
                        <span>+ Sisipkan Tabel</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleInsertCodeTemplate}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Sisipkan blok diagram atau pseudocode"
                      >
                        <Code className="w-3.5 h-3.5" />
                        <span>+ Diagram / Kode</span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    required
                    value={questionForm.question}
                    onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
                    placeholder="Tuliskan pertanyaan... (Tabel dipisahkan tab atau baris rapi akan otomatis dirender sebagai tabel)"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="text-[11px] text-slate-400 mt-1">
                    *Tabel dari Word/Excel yang ditempel (dengan tab atau baris kolom) akan otomatis ditampilkan sebagai tabel bergaris rapi di layar siswa.
                  </div>
                </div>

                {/* Image / Diagram Attachment Section */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5 text-xs">
                      <ImageIcon className="w-4 h-4 text-blue-600" />
                      Sematkan Gambar / Diagram (Opsional)
                    </span>
                    {questionForm.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setQuestionForm({ ...questionForm, imageUrl: '' })}
                        className="text-rose-600 hover:underline text-[11px] font-medium cursor-pointer"
                      >
                        Hapus Gambar
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Atau masukkan URL gambar langsung (https://...)"
                        value={questionForm.imageUrl}
                        onChange={(e) => setQuestionForm({ ...questionForm, imageUrl: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  {questionForm.imageUrl && (
                    <div className="mt-2 p-2 bg-white rounded-xl border border-slate-200 max-w-xs">
                      <img
                        src={questionForm.imageUrl}
                        alt="Preview Soal"
                        className="max-h-36 rounded-lg object-contain mx-auto"
                      />
                    </div>
                  )}
                </div>

                {/* Multiple Choice Options */}
                {questionForm.type === 'pg' && (
                  <div className="space-y-2.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-800">
                        Opsi Pilihan Jawaban & Tentukan Kunci Jawaban Benar
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (questionForm.options.length < 5) {
                            setQuestionForm({
                              ...questionForm,
                              options: [...questionForm.options, ''],
                            });
                          }
                        }}
                        disabled={questionForm.options.length >= 5}
                        className="text-blue-600 hover:underline text-[11px] font-semibold disabled:opacity-40 cursor-pointer"
                      >
                        + Tambah Opsi (Hingga E)
                      </button>
                    </div>

                    <div className="space-y-2">
                      {questionForm.options.map((opt, i) => {
                        const isCorrect = questionForm.answer === String(i);
                        return (
                          <div
                            key={i}
                            className={`flex items-center gap-2 p-1.5 rounded-xl border transition-all ${
                              isCorrect
                                ? 'bg-emerald-50/80 border-emerald-400 ring-1 ring-emerald-300'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setQuestionForm({ ...questionForm, answer: String(i) })}
                              className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                                isCorrect
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                              title="Klik untuk jadikan kunci jawaban"
                            >
                              {String.fromCharCode(65 + i)}
                            </button>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...questionForm.options];
                                newOpts[i] = e.target.value;
                                setQuestionForm({ ...questionForm, options: newOpts });
                              }}
                              placeholder={`Teks Opsi ${String.fromCharCode(65 + i)}`}
                              className="flex-1 px-3 py-1.5 bg-transparent border-none text-slate-900 focus:outline-none text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => setQuestionForm({ ...questionForm, answer: String(i) })}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                isCorrect
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-400 hover:text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              {isCorrect ? '✓ Kunci Benar' : 'Pilih Kunci'}
                            </button>
                            {questionForm.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const filtered = questionForm.options.filter((_, oI) => oI !== i);
                                  const newAns =
                                    questionForm.answer === String(i)
                                      ? '0'
                                      : Number(questionForm.answer) > i
                                      ? String(Number(questionForm.answer) - 1)
                                      : questionForm.answer;
                                  setQuestionForm({
                                    ...questionForm,
                                    options: filtered,
                                    answer: newAns,
                                  });
                                }}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded cursor-pointer"
                                title="Hapus opsi ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {questionForm.type === 'bs' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Kunci Jawaban Benar</label>
                    <div className="grid grid-cols-2 gap-3">
                      {['Benar', 'Salah'].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setQuestionForm({ ...questionForm, answer: val })}
                          className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            questionForm.answer.toLowerCase() === val.toLowerCase()
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs ring-2 ring-emerald-300'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {(questionForm.type === 'isian' || questionForm.type === 'uraian') && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Kunci Jawaban / Kata Kunci Penilaian
                    </label>
                    <input
                      type="text"
                      required
                      value={questionForm.answer}
                      onChange={(e) => setQuestionForm({ ...questionForm, answer: e.target.value })}
                      placeholder="Contoh: Scratch / Algoritma / Pink"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Bobot Poin</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={questionForm.score}
                      onChange={(e) => setQuestionForm({ ...questionForm, score: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Pembahasan (Opsional)</label>
                    <input
                      type="text"
                      value={questionForm.explanation}
                      onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                      placeholder="Catatan pembahasan untuk guru..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsQuestionModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingQuestionId ? 'Simpan Perubahan' : 'Tambahkan ke Bank Soal'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: UPLOAD DOKUMEN SOAL (WORD / PDF / TEXT) */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-100 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Import Bank Soal (File Dokumen / Teks)
                </h3>
                <p className="text-xs text-slate-500">
                  Unggah file dokumen (.docx, .pdf, .txt, .csv) atau tempelkan teks soal langsung.
                </p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Target Tingkat Kelas
                </label>
                <select
                  value={uploadClassLevel}
                  onChange={(e) => setUploadClassLevel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                >
                  <option value="Kelas 7">Kelas 7</option>
                  <option value="Kelas 8">Kelas 8</option>
                  <option value="Kelas 9">Kelas 9</option>
                  <option value="Kelas 10">Kelas 10</option>
                  <option value="Kelas 11">Kelas 11</option>
                  <option value="Kelas 12">Kelas 12</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Pilih Berkas Dokumen Word (.docx) atau Berkas Teks (.txt, .csv)
                </label>
                <input
                  type="file"
                  accept=".docx,.txt,.csv"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  *Untuk file Microsoft Word modern (.docx), sistem membaca dan mengekstrak teks secara otomatis.
                </p>
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                  <label className="block font-semibold text-slate-700">
                    Atau Tempel (Paste) Teks Soal Langsung:
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const exampleTable = `Perhatikan Tabel Katalog Aksesori berikut untuk menjawab Soal No. 25:\nNama Aksesori\tWarna\tJumlah\tKategori\tHarga\nJepit Pita\tPink\t4\tRambut\tRp 15.000\nKacamata\tHitam\t1\tMata\tRp 30.000\nGelang Manik\tPink\t5\tTangan\tRp 10.000\nCincin Bintang\tPink\t2\tJari\tRp 25.000\n\n25. Berdasarkan data tabel di atas, aksesori yang memiliki jumlah terbanyak adalah...\nA. Jepit Pita\nB. Kacamata\nC. Gelang Manik\nD. Cincin Bintang\nKunci: C`;
                        setUploadRawText(exampleTable);
                        onShowToast('Contoh soal dengan tabel & kunci jawaban dimuat!', 'info');
                      }}
                      className="text-blue-600 hover:underline text-[11px] font-semibold cursor-pointer"
                    >
                      + Muat Contoh Soal Tabel & Kunci
                    </button>
                    {uploadRawText.trim() && (
                      <button
                        type="button"
                        onClick={() => setUploadRawText('')}
                        className="text-rose-600 hover:underline text-[11px] cursor-pointer"
                      >
                        Hapus Teks
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  rows={5}
                  value={uploadRawText}
                  onChange={(e) => setUploadRawText(e.target.value)}
                  placeholder={`Contoh Format (Bisa dengan atau tanpa spasi baris kosong):
1. Proses memecahkan masalah besar menjadi bagian-bagian kecil dinamakan...
A. Dekomposisi
B. Pengenalan Pola
C. Abstraksi
D. Algoritma
Kunci: A

2. Urutan langkah-langkah logis penyelesaian masalah disebut...
A. Variabel
B. Algoritma
C. Compiler
D. Debugger
Kunci: B`}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* LIVE PARSING PREVIEW */}
              {uploadRawText.trim() && (() => {
                const previewQuestions = parseRawQuestionText(uploadRawText, 'INFORMATIKA', uploadClassLevel);
                return (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        Pratinjau Hasil: {previewQuestions.length} Butir Soal Terdeteksi
                      </span>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                      {previewQuestions.map((pq, pIdx) => (
                        <div key={pIdx} className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs text-xs space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-blue-700">Soal #{pIdx + 1} ({pq.type.toUpperCase()})</span>
                            <span className="text-emerald-700 font-semibold">
                              Kunci: {pq.type === 'pg' && pq.options[Number(pq.answer)] ? `${String.fromCharCode(65 + Number(pq.answer))}. ${pq.options[Number(pq.answer)]}` : pq.answer}
                            </span>
                          </div>
                          <p className="font-medium text-slate-900 line-clamp-2">{pq.question}</p>
                          {pq.options.length > 0 && (
                            <div className="grid grid-cols-2 gap-1 pt-1 text-[11px] text-slate-600">
                              {pq.options.map((opt, oIdx) => (
                                <div key={oIdx} className={`px-2 py-0.5 rounded border truncate ${String(oIdx) === pq.answer ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold' : 'bg-slate-50 border-slate-100'}`}>
                                  <strong className="mr-1">{String.fromCharCode(65 + oIdx)}.</strong>
                                  {opt}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Opsi Sinkronisasi Langsung ke Ujian Siswa */}
              <div className="bg-blue-50/80 p-3 rounded-xl border border-blue-200/80 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer font-bold text-slate-900 text-xs">
                  <input
                    type="checkbox"
                    checked={uploadAssignToExam}
                    onChange={(e) => setUploadAssignToExam(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-blue-600"
                  />
                  <div>
                    <span>Langsung masukkan seluruh soal ke Ujian {uploadClassLevel} agar tampil lengkap di akun siswa</span>
                    <p className="font-normal text-[11px] text-blue-700 mt-0.5 leading-relaxed">
                      Jika dicentang, seluruh soal yang di-import ini akan otomatis dimasukkan ke dalam paket ujian kelas tersebut, sehingga saat siswa membuka ujian, semua soal langsung aktif.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleProcessImport}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-xs cursor-pointer"
                >
                  Proses & Import Soal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETAIL SUBMISI SISWA */}
      {selectedSubmissionDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-100 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Lembar Hasil Ujian: {selectedSubmissionDetail.studentName}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedSubmissionDetail.examTitle} • {selectedSubmissionDetail.studentClass}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-blue-600 tabular-nums">
                  {selectedSubmissionDetail.score}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">SKOR AKHIR</div>
              </div>
            </div>

            <div className="space-y-3 text-xs mb-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                <div>Durasi Pengerjaan: <strong>{Math.round(selectedSubmissionDetail.durationSpentSeconds / 60)} Menit</strong></div>
                <div>Waktu Pengumpulan: <strong>{selectedSubmissionDetail.submittedAt}</strong></div>
                <div>Status Pelanggaran Kiosk: <strong>{selectedSubmissionDetail.violations} kali</strong></div>
              </div>

              {selectedSubmissionDetail.violationLogs.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-800 mb-1">Log Rekaman Pelanggaran Kiosk:</h4>
                  <div className="space-y-1">
                    {selectedSubmissionDetail.violationLogs.map((vl, idx) => (
                      <div key={idx} className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px]">
                        <strong>{vl.time}:</strong> {vl.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedSubmissionDetail(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs cursor-pointer"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ATUR DURASI WAKTU UJIAN CEPAT */}
      {quickDurationExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Atur Waktu / Durasi Ujian</h3>
                  <p className="text-[11px] text-slate-500 truncate max-w-[260px]">{quickDurationExam.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickDurationExam(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <span>Durasi Saat Ini:</span>
                <span className="font-bold text-slate-900 font-mono text-sm">{quickDurationExam.durationMinutes} Menit</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Pilih Preset Waktu Cepat:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 40, 45, 60, 75, 90, 120].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setQuickDurationMinutes(mins)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        quickDurationMinutes === mins
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {mins} Menit
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Atau Atur Menit Manual:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickDurationMinutes((prev) => Math.max(5, prev - 5))}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 cursor-pointer"
                  >
                    -5 mnt
                  </button>
                  <input
                    type="number"
                    min={5}
                    max={360}
                    value={quickDurationMinutes}
                    onChange={(e) => setQuickDurationMinutes(Math.max(1, Number(e.target.value)))}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-center text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setQuickDurationMinutes((prev) => prev + 5)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 cursor-pointer"
                  >
                    +5 mnt
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDurationMinutes((prev) => prev + 15)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 cursor-pointer"
                  >
                    +15 mnt
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  * Timer ujian siswa akan otomatis berjalan mundur sesuai durasi yang disimpan di sini.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={applyDurationToAll}
                    onChange={(e) => setApplyDurationToAll(e.target.checked)}
                    className="w-4 h-4 mt-0.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span>Terapkan durasi <strong>{quickDurationMinutes} menit</strong> ini ke <strong>SEMUA paket ujian</strong> ({appData.exams.length} paket ujian)</span>
                </label>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickDurationExam(null)}
                  className="flex-1 py-2 px-3 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuickDuration}
                  className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Simpan & Terapkan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SINKRONISASI ANTAR PERANGKAT (HP <-> KOMPUTER) */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Sinkronisasi Data HP & Komputer</h3>
                  <p className="text-xs text-slate-500">Pusat sinkronisasi soal & konfigurasi ujian lintas perangkat</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSyncModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-blue-50/80 p-3.5 rounded-2xl border border-blue-200 text-blue-900 space-y-1.5 leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 text-blue-800">
                  <Cloud className="w-4 h-4 shrink-0" />
                  <span>Keterangan Sinkronisasi Antar Perangkat:</span>
                </div>
                <p>
                  Perangkat HP siswa kini telah di-update otomatis memuat <strong>25 butir soal</strong> lengkap beserta tabel dan kunci jawaban.
                </p>
                <p>
                  Jika Anda menambah atau mengedit butir soal baru di komputer ini, klik tombol <strong>&ldquo;Kirim Data ke Cloud&rdquo;</strong> di bawah agar seluruh HP siswa yang membuka link ujian langsung menerima soal yang sama secara real-time.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">TOTAL BANK SOAL:</span>
                  <strong className="text-sm text-slate-900 font-mono">{appData.bankQuestions.length} Butir Soal</strong>
                  <span className="text-[10px] text-slate-500 block">
                    (Kelas 7: {appData.bankQuestions.filter((q) => q.classLevel === 'Kelas 7').length} Soal)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">PAKET UJIAN AKTIF:</span>
                  <strong className="text-sm text-slate-900 font-mono">{appData.exams.length} Paket Ujian</strong>
                  <span className="text-[10px] text-slate-500 block">
                    ({appData.submissions.length} siswa sudah submit)
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-slate-800 block">1. Sinkronisasi Otomatis Cloud:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isSyncingServer}
                    onClick={handlePushToServer}
                    className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Cloud className="w-4 h-4" />
                    <span>{isSyncingServer ? 'Menyinkronkan...' : 'Kirim Data ke Cloud'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSyncingServer}
                    onClick={handlePullFromServer}
                    className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Tarik Data Terbaru</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="font-bold text-slate-800 block">2. Transfer Kode Cadangan (Offline / Manual):</label>
                <button
                  type="button"
                  onClick={handleCopySyncCode}
                  className="w-full py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-slate-500" />
                  <span>Salin Kode Cadangan ke Clipboard</span>
                </button>
                <div className="space-y-1.5 pt-1">
                  <textarea
                    rows={2}
                    value={importSyncCodeInput}
                    onChange={(e) => setImportSyncCodeInput(e.target.value)}
                    placeholder="Tempel kode sinkronisasi di sini jika ingin menerapkan data dari perangkat lain..."
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {importSyncCodeInput.trim() && (
                    <button
                      type="button"
                      onClick={handleApplyImportSyncCode}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                    >
                      Terapkan Kode Sinkronisasi Ini
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsSyncModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PENGATURAN PASSWORD GURU */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-slate-100 my-8">
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-600" />
              <span>Ubah Kata Sandi Guru</span>
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Perbarui kata sandi untuk akun guru yang sedang login (<strong>{appData.currentUser?.name}</strong>).
            </p>
            <form onSubmit={handleSavePassword} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kata Sandi Baru</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 4 karakter"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900">
                Untuk mengubah password guru mata pelajaran atau jurusan lain, gunakan tombol <strong>Ubah Sandi</strong> pada kartu guru di tab <strong>Guru & Jurusan</strong>.
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs cursor-pointer"
                >
                  Simpan Sandi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT GURU & JURUSAN */}
      {isAddTeacherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingTeacher ? 'Edit Data Guru & Mapel' : 'Tambah Guru & Jurusan Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingTeacher
                      ? `Perbarui profil pengampu ${editingTeacher.name}`
                      : 'Daftarkan pengampu baru untuk ujian berbasis komputer'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddTeacherModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacherSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Lengkap Guru & Gelar
                </label>
                <input
                  type="text"
                  required
                  value={teacherForm.name}
                  onChange={(e) => setTeacherForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Contoh: Dra. Hj. Siti Rahma M.Pd"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Username Login (NIP / Singkatan)
                  </label>
                  <input
                    type="text"
                    required
                    value={teacherForm.username}
                    onChange={(e) => setTeacherForm((prev) => ({ ...prev, username: e.target.value }))}
                    placeholder="Contoh: guru_bindo"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kata Sandi Akun
                  </label>
                  <input
                    type="text"
                    required
                    value={teacherForm.password}
                    onChange={(e) => setTeacherForm((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="password123"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mata Pelajaran yang Diampu
                </label>
                <select
                  value={teacherForm.subject}
                  onChange={(e) => setTeacherForm((prev) => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                  <option value="Bahasa Inggris">Bahasa Inggris</option>
                  <option value="IPA (Fisika, Biologi, Kimia)">IPA (Fisika, Biologi, Kimia)</option>
                  <option value="Matematika">Matematika</option>
                  <option value="IPS (Ekonomi, Geografi, Sejarah)">IPS (Ekonomi, Geografi, Sejarah)</option>
                  <option value="Informatika">Informatika / Komputer</option>
                  <option value="Pendidikan Agama Islam (PAI)">Pendidikan Agama Islam (PAI)</option>
                  <option value="Pendidikan Pancasila & Kewarganegaraan (PPKn)">PPKn / Pancasila</option>
                  <option value="PJOK / Olahraga">PJOK / Olahraga</option>
                  <option value="Seni Budaya">Seni Budaya</option>
                  <option value="Kejuruan Rekayasa Perangkat Lunak (RPL)">Kejuruan Rekayasa Perangkat Lunak (RPL)</option>
                  <option value="Kejuruan Teknik Komputer & Jaringan (TKJ)">Kejuruan Teknik Komputer & Jaringan (TKJ)</option>
                  <option value="Kejuruan Teknik Kendaraan Ringan (TKR / Otomotif)">Kejuruan Teknik Kendaraan Ringan (TKR / Otomotif)</option>
                  <option value="Kejuruan Akuntansi & Keuangan Lembaga (AKL)">Kejuruan Akuntansi & Keuangan Lembaga (AKL)</option>
                  <option value="Kejuruan Desain Komunikasi Visual (DKV)">Kejuruan Desain Komunikasi Visual (DKV)</option>
                  <option value="Lainnya">Lainnya (Ketik Manual)...</option>
                </select>
                {teacherForm.subject === 'Lainnya' && (
                  <input
                    type="text"
                    required
                    value={teacherForm.customSubject}
                    onChange={(e) => setTeacherForm((prev) => ({ ...prev, customSubject: e.target.value }))}
                    placeholder="Ketik nama mata pelajaran..."
                    className="w-full mt-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Jurusan / Peminatan
                </label>
                <select
                  value={teacherForm.major}
                  onChange={(e) => setTeacherForm((prev) => ({ ...prev, major: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Umum / Semua Jurusan">Umum / Semua Jurusan</option>
                  <option value="MIPA (Matematika & IPA)">MIPA (Matematika & IPA)</option>
                  <option value="IPS (Ilmu Pengetahuan Sosial)">IPS (Ilmu Pengetahuan Sosial)</option>
                  <option value="Rekayasa Perangkat Lunak (RPL)">Rekayasa Perangkat Lunak (RPL)</option>
                  <option value="Teknik Komputer & Jaringan (TKJ)">Teknik Komputer & Jaringan (TKJ)</option>
                  <option value="Teknik Kendaraan Ringan (TKR / Otomotif)">Teknik Kendaraan Ringan (TKR / Otomotif)</option>
                  <option value="Akuntansi & Keuangan Lembaga (AKL)">Akuntansi & Keuangan Lembaga (AKL)</option>
                  <option value="Desain Komunikasi Visual (DKV)">Desain Komunikasi Visual (DKV)</option>
                  <option value="Manajemen Perkantoran (MPLB)">Manajemen Perkantoran (MPLB)</option>
                  <option value="Bisnis Digital / Pemasaran">Bisnis Digital / Pemasaran</option>
                  <option value="Lainnya">Lainnya (Ketik Manual)...</option>
                </select>
                {teacherForm.major === 'Lainnya' && (
                  <input
                    type="text"
                    required
                    value={teacherForm.customMajor}
                    onChange={(e) => setTeacherForm((prev) => ({ ...prev, customMajor: e.target.value }))}
                    placeholder="Ketik nama jurusan / kejuruan..."
                    className="w-full mt-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  NIP / No. Identitas Guru (Opsional)
                </label>
                <input
                  type="text"
                  value={teacherForm.nip}
                  onChange={(e) => setTeacherForm((prev) => ({ ...prev, nip: e.target.value }))}
                  placeholder="Contoh: 198506122010011005"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddTeacherModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs cursor-pointer"
                >
                  {editingTeacher ? 'Simpan Perubahan' : 'Simpan Guru Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: UBAH KATA SANDI GURU TERTENTU */}
      {passwordModalTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-slate-100 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Ubah Kata Sandi Guru</h3>
                  <p className="text-xs text-slate-500 truncate max-w-[200px]">{passwordModalTeacher.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalTeacher(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 mb-4 space-y-1">
              <div>Mata Pelajaran: <strong>{passwordModalTeacher.subject}</strong></div>
              <div>Username Login: <strong className="font-mono">@{passwordModalTeacher.username}</strong></div>
              <div>Jurusan: <strong>{passwordModalTeacher.major || 'Umum'}</strong></div>
            </div>

            <form onSubmit={handleSaveTeacherPassword} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Kata Sandi Baru untuk Guru Ini
                </label>
                <input
                  type="text"
                  required
                  value={targetTeacherNewPassword}
                  onChange={(e) => setTargetTeacherNewPassword(e.target.value)}
                  placeholder="Minimal 4 karakter"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                  Pilihan Sandi Standar Cepat:
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {['password123', 'cbt2026', 'guru123'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTargetTeacherNewPassword(preset)}
                      className="px-2 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[11px] font-mono text-slate-700 border border-slate-200 cursor-pointer text-center"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPasswordModalTeacher(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Sandi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: KELOLA & HAPUS BUTIR SOAL DARI PAKET UJIAN */}
      {inspectExamQuestions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 border border-slate-100 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Kelola Butir Soal Ujian</h3>
                  <p className="text-xs text-slate-500">
                    {inspectExamQuestions.title} • Kode: <span className="font-mono font-bold text-blue-600">{inspectExamQuestions.code}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectExamQuestions(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 mb-4 text-xs">
              <div className="font-semibold text-slate-700">
                Total Butir Soal di Ujian Ini: <strong className="text-blue-700 font-bold text-sm">{inspectExamQuestions.questions?.length || 0} Soal</strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleSyncExamWithBank(inspectExamQuestions);
                    const updated = appData.exams.find((e) => e.id === inspectExamQuestions.id);
                    if (updated) {
                      setInspectExamQuestions(updated);
                    }
                  }}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Isi Soal dari Bank</span>
                </button>
                {inspectExamQuestions.questions && inspectExamQuestions.questions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onShowModal({
                        title: 'Kosongkan Seluruh Soal Ujian',
                        message: `Apakah Anda yakin ingin menghapus seluruh butir soal dari ujian "${inspectExamQuestions.title}"?`,
                        type: 'danger',
                        confirmLabel: 'Ya, Kosongkan',
                        onConfirm: () => {
                          const updatedExams = appData.exams.map((e) =>
                            e.id === inspectExamQuestions.id ? { ...e, questions: [] } : e
                          );
                          onUpdateData({ ...appData, exams: updatedExams });
                          setInspectExamQuestions({ ...inspectExamQuestions, questions: [] });
                          onShowToast('Seluruh butir soal berhasil dikosongkan dari ujian ini.', 'info');
                        },
                      });
                    }}
                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Kosongkan Ujian</span>
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1 text-xs">
              {!inspectExamQuestions.questions || inspectExamQuestions.questions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="font-semibold text-slate-600">Belum ada butir soal di paket ujian ini.</p>
                  <p className="text-[11px] mt-1 text-slate-400">Klik tombol "Isi Soal dari Bank" di atas untuk memasukkan butir soal secara instan.</p>
                </div>
              ) : (
                inspectExamQuestions.questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-3 bg-white border border-slate-200 rounded-2xl flex items-start justify-between gap-3 shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-slate-800 text-[11px] uppercase tracking-wide">
                          {q.type.toUpperCase()} • Poin: {q.score}
                        </span>
                      </div>
                      <p className="text-slate-800 line-clamp-2 leading-relaxed text-xs">
                        {q.question}
                      </p>
                      {q.options && q.options.length > 0 && (
                        <div className="text-[11px] text-slate-500 line-clamp-1">
                          Pilihan: {q.options.slice(0, 4).join(' | ')}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestionFromExam(inspectExamQuestions.id, q.id)}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                      title="Hapus butir soal ini dari ujian"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Hapus</span>
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => setInspectExamQuestions(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
