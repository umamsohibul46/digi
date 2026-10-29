import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppData, Exam, Submission, User, AuditLog, OngoingExamSession } from '../../types';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Shield,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Lock,
  Printer,
  HelpCircle,
  Award,
  Check,
  Search,
  LogOut,
  Wifi,
  WifiOff,
  History,
  PlayCircle,
  Sparkles,
  Info
} from 'lucide-react';
import { QuestionContentRenderer } from '../common/QuestionContentRenderer';
import {
  saveStudentExamSession,
  getStudentExamSession,
  clearStudentExamSession,
  fetchServerData,
  syncSubmissionToServer,
} from '../../utils/storage';

interface StudentPortalProps {
  currentUser: User;
  appData: AppData;
  onUpdateData: (newData: AppData) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  onShowModal: (config: {
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }) => void;
  onLogout?: () => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  currentUser,
  appData,
  onUpdateData,
  onShowToast,
  onLogout,
}) => {
  const [studentStep, setStudentStep] = useState<'portal' | 'instructions' | 'exam' | 'finished'>('portal');
  const [activeExam, setActiveExam] = useState<Exam | null>(null);

  // Network Online/Offline State
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Ongoing Disconnected / Saved Session
  const [ongoingSession, setOngoingSession] = useState<OngoingExamSession | null>(null);

  // Portal filters
  const [classFilter, setClassFilter] = useState<string>(currentUser.classLevel || 'Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // PIN modal
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [pinExamCandidate, setPinExamCandidate] = useState<Exam | null>(null);
  const [enteredPin, setEnteredPin] = useState<string>('');

  // Exam Room States
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [doubtQuestions, setDoubtQuestions] = useState<Record<string, boolean>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [violations, setViolations] = useState<number>(0);
  const [violationLogs, setViolationLogs] = useState<{ time: string; reason: string }[]>([]);
  const [startTimeEpoch, setStartTimeEpoch] = useState<number>(0);

  // Finished Submission result
  const [lastSubmission, setLastSubmission] = useState<Submission | null>(null);

  // Kiosk warning state modal
  const [kioskWarning, setKioskWarning] = useState<{ isOpen: boolean; reason: string } | null>(null);

  // In-Room Confirmation Modal State
  const [isConfirmSubmitOpen, setIsConfirmSubmitOpen] = useState<boolean>(false);

  // Timer Ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper format seconds to mm:ss
  const formatTimer = (seconds: number) => {
    const sPositive = Math.max(0, seconds);
    const m = Math.floor(sPositive / 60);
    const s = sPositive % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Helper to persist current session to localStorage & appData
  const persistSession = useCallback(
    (
      currentAnswers: Record<string, string>,
      remainingSecs: number,
      qIdx: number,
      doubts: Record<string, boolean>,
      curViolations: number,
      curLogs: { time: string; reason: string }[]
    ) => {
      if (!activeExam) return;
      const sessionData: OngoingExamSession = {
        examId: activeExam.id,
        examCode: activeExam.code,
        examTitle: activeExam.title,
        studentUsername: currentUser.username,
        studentName: currentUser.name,
        studentClass: currentUser.classLevel || activeExam.classLevel,
        answers: currentAnswers,
        doubtQuestions: doubts,
        currentQuestionIdx: qIdx,
        timeRemainingSeconds: remainingSecs,
        lastSavedAt: Date.now(),
        startTimeEpoch: startTimeEpoch || Date.now(),
        violations: curViolations,
        violationLogs: curLogs,
        isDisconnected: typeof navigator !== 'undefined' ? !navigator.onLine : false,
      };

      // Save to localStorage
      saveStudentExamSession(sessionData);

      // Keep ongoingSession in React state synced
      setOngoingSession(sessionData);

      // Update appData ongoingSessions in background
      const updatedOngoing = {
        ...(appData.ongoingSessions || {}),
        [`${currentUser.username}_${activeExam.id}`]: sessionData,
      };
      onUpdateData({
        ...appData,
        ongoingSessions: updatedOngoing,
      });
    },
    [activeExam, currentUser, startTimeEpoch, appData, onUpdateData]
  );

  // Auto-fetch latest exam package from server on mount so student Chromebooks always have the latest 25 questions
  useEffect(() => {
    fetchServerData().then((serverData) => {
      if (serverData && serverData.exams && serverData.exams.length > 0) {
        onUpdateData({
          ...appData,
          exams: serverData.exams,
          bankQuestions: serverData.bankQuestions || appData.bankQuestions,
        });
      }
    });
  }, []);

  // 1. Detect ongoing unsubmitted exam session on load or when appData/currentUser changes
  useEffect(() => {
    if (currentUser?.username) {
      const existing = getStudentExamSession(currentUser.username, undefined, appData);
      if (existing) {
        // Verify this exam exists and hasn't been submitted yet
        const alreadySubmitted = (appData.submissions || []).some(
          (s) => s.examId === existing.examId && s.studentUsername === currentUser.username
        );
        const examExists = (appData.exams || []).some((e) => e.id === existing.examId);

        if (alreadySubmitted || !examExists) {
          clearStudentExamSession(currentUser.username, existing.examId);
          setOngoingSession(null);
        } else {
          setOngoingSession(existing);
        }
      } else {
        setOngoingSession(null);
      }
    }
  }, [currentUser?.username, appData.submissions, appData.exams]);

  // 2. Real-time Online & Offline Listeners for instant disconnect handling
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      onShowToast('Koneksi internet kembali terhubung! Jawaban & sisa waktu Anda tersinkronisasi.', 'success');
      if (studentStep === 'exam' && activeExam) {
        persistSession(answers, timeRemaining, currentQuestionIdx, doubtQuestions, violations, violationLogs);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      onShowToast(
        'Koneksi internet terputus! Mode Offline Otomatis aktif: Jawaban dan sisa waktu Anda tersimpan aman.',
        'warning'
      );
      if (studentStep === 'exam' && activeExam) {
        persistSession(answers, timeRemaining, currentQuestionIdx, doubtQuestions, violations, violationLogs);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [studentStep, activeExam, answers, timeRemaining, currentQuestionIdx, doubtQuestions, violations, violationLogs, persistSession, onShowToast]);

  // 3. Save on beforeunload / pagehide (when tab closed, browser killed, or page reloaded)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (studentStep === 'exam' && activeExam) {
        // Synchronous write to localStorage to guarantee data survival on sudden shutdown
        const sessionData: OngoingExamSession = {
          examId: activeExam.id,
          examCode: activeExam.code,
          examTitle: activeExam.title,
          studentUsername: currentUser.username,
          studentName: currentUser.name,
          studentClass: currentUser.classLevel || activeExam.classLevel,
          answers,
          doubtQuestions,
          currentQuestionIdx,
          timeRemainingSeconds: timeRemaining,
          lastSavedAt: Date.now(),
          startTimeEpoch: startTimeEpoch || Date.now(),
          violations,
          violationLogs,
          isDisconnected: true,
        };
        saveStudentExamSession(sessionData);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [studentStep, activeExam, answers, timeRemaining, currentQuestionIdx, doubtQuestions, violations, violationLogs, currentUser, startTimeEpoch]);

  // 4. Exam Timer Effect (ticks every second and auto-saves remaining time continuously)
  useEffect(() => {
    if (studentStep === 'exam' && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleFinalSubmit('Waktu Habis');
            return 0;
          }
          const nextTime = prev - 1;

          // Auto-save session every 2 seconds to guarantee accurate remaining seconds
          if (nextTime % 2 === 0 && activeExam) {
            saveStudentExamSession({
              examId: activeExam.id,
              examCode: activeExam.code,
              examTitle: activeExam.title,
              studentUsername: currentUser.username,
              studentName: currentUser.name,
              studentClass: currentUser.classLevel || activeExam.classLevel,
              answers,
              doubtQuestions,
              currentQuestionIdx,
              timeRemainingSeconds: nextTime,
              lastSavedAt: Date.now(),
              startTimeEpoch: startTimeEpoch || Date.now(),
              violations,
              violationLogs,
              isDisconnected: !navigator.onLine,
            });
          }

          return nextTime;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [studentStep, activeExam, answers, doubtQuestions, currentQuestionIdx, violations, violationLogs, startTimeEpoch, currentUser]);

  // 5. Anti-Cheat / Kiosk Mode Listeners
  useEffect(() => {
    if (studentStep !== 'exam' || !activeExam) return;

    const recordViolation = (reason: string) => {
      const timeStr = new Date().toLocaleTimeString('id-ID');
      const updatedViolations = violations + 1;
      setViolations(updatedViolations);
      const newLog = { time: timeStr, reason };
      const updatedLogs = [...violationLogs, newLog];
      setViolationLogs(updatedLogs);

      // Persist immediately
      persistSession(answers, timeRemaining, currentQuestionIdx, doubtQuestions, updatedViolations, updatedLogs);

      // Add to global appData audit logs
      const newAudit: AuditLog = {
        id: `aud-${Date.now()}`,
        time: `${new Date().toLocaleDateString('id-ID')} ${timeStr}`,
        user: `${currentUser.name} (${currentUser.classLevel || 'Siswa'})`,
        action: 'Pelanggaran Kiosk Mode',
        detail: `${reason} pada ujian ${activeExam.title}`,
        severity: 'warning',
      };
      onUpdateData({
        ...appData,
        auditLogs: [newAudit, ...appData.auditLogs],
      });

      if (updatedViolations >= activeExam.maxViolations) {
        setKioskWarning(null);
        handleFinalSubmit('Ditangguhkan (Pelanggaran)');
        onShowToast(
          'Ujian dihentikan otomatis karena telah melampaui batas pelanggaran Kiosk Mode!',
          'error'
        );
      } else {
        setKioskWarning({
          isOpen: true,
          reason: `${reason}. Peringatan ke-${updatedViolations} dari ${activeExam.maxViolations}. Harap tetap fokus pada lembar ujian!`,
        });
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation('Berpindah tab atau meminimumkan browser');
      }
    };

    const handleWindowBlur = () => {
      recordViolation('Jendela browser kehilangan fokus (Window Blur / Alt-Tab)');
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        recordViolation('Keluar dari mode Layar Penuh (Fullscreen)');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [studentStep, activeExam, violations, violationLogs, answers, timeRemaining, currentQuestionIdx, doubtQuestions, persistSession, currentUser, appData, onUpdateData, onShowToast]);

  // 6. Countdown timer to return to Login screen after exam is finished
  const [autoLogoutSeconds, setAutoLogoutSeconds] = useState<number>(15);
  useEffect(() => {
    if (studentStep !== 'finished') {
      setAutoLogoutSeconds(15);
      return;
    }
    const interval = setInterval(() => {
      setAutoLogoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onLogout) {
            onLogout();
          } else {
            setStudentStep('portal');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [studentStep, onLogout]);

  // Save answer handler
  const handleSaveAnswer = (questionId: string, val: string) => {
    const updated = { ...answers, [questionId]: val };
    setAnswers(updated);
    if (activeExam) {
      persistSession(updated, timeRemaining, currentQuestionIdx, doubtQuestions, violations, violationLogs);
    }
  };

  // Toggle doubt handler
  const handleToggleDoubt = (questionId: string) => {
    const updated = {
      ...doubtQuestions,
      [questionId]: !doubtQuestions[questionId],
    };
    setDoubtQuestions(updated);
    if (activeExam) {
      persistSession(answers, timeRemaining, currentQuestionIdx, updated, violations, violationLogs);
    }
  };

  // Navigate question handler
  const handleNavigateQuestion = (idx: number) => {
    setCurrentQuestionIdx(idx);
    if (activeExam) {
      persistSession(answers, timeRemaining, idx, doubtQuestions, violations, violationLogs);
    }
  };

  // Resume unsubmitted ongoing session (WITHOUT restarting from scratch)
  const handleResumeExam = (sessionToResume?: OngoingExamSession) => {
    const targetSession = sessionToResume || ongoingSession;
    if (!targetSession) return;

    const exam = appData.exams.find((e) => e.id === targetSession.examId);
    if (!exam) {
      onShowToast('Paket ujian tidak ditemukan dalam daftar ujian aktif.', 'error');
      return;
    }

    // Request fullscreen for kiosk mode
    const docEl = document.documentElement;
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen().catch(() => {});
    }

    // Restore exact progress, answers, doubts, and remaining time
    setActiveExam(exam);
    setAnswers(targetSession.answers || {});
    setDoubtQuestions(targetSession.doubtQuestions || {});
    setCurrentQuestionIdx(Math.min(targetSession.currentQuestionIdx || 0, Math.max(0, exam.questions.length - 1)));

    // Restore remaining seconds (guaranteed >= 30s)
    const restoredTime = targetSession.timeRemainingSeconds > 0 ? targetSession.timeRemainingSeconds : exam.durationMinutes * 60;
    setTimeRemaining(restoredTime);

    setViolations(targetSession.violations || 0);
    setViolationLogs(targetSession.violationLogs || []);
    setStartTimeEpoch(targetSession.startTimeEpoch || Date.now());
    setStudentStep('exam');

    const answeredCount = Object.keys(targetSession.answers || {}).filter((k) => targetSession.answers[k]?.trim() !== '').length;
    onShowToast(
      `Sesi dipulihkan! Melanjutkan ujian "${exam.title}" (${answeredCount} soal terjawab tersimpan, sisa waktu: ${formatTimer(restoredTime)}).`,
      'success'
    );
  };

  // Trigger PIN verification or direct resume
  const handleSelectExam = (exam: Exam) => {
    // Check if there is an active unsubmitted session for this exam
    const existing = getStudentExamSession(currentUser.username, exam.id, appData);
    if (existing && Object.keys(existing.answers || {}).length > 0) {
      // Direct resume without asking for PIN again
      handleResumeExam(existing);
      return;
    }

    setPinExamCandidate(exam);
    setEnteredPin('');
    setIsPinModalOpen(true);
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinExamCandidate) return;
    if (enteredPin.trim() !== pinExamCandidate.pin.trim()) {
      onShowToast('PIN Ujian salah! Silakan tanyakan PIN yang benar ke Guru pengampu.', 'error');
      return;
    }
    setIsPinModalOpen(false);
    setActiveExam(pinExamCandidate);
    setStudentStep('instructions');
    onShowToast(`PIN Berhasil diverifikasi untuk ${pinExamCandidate.title}.`, 'success');
  };

  // Start exam from instructions
  const handleStartExam = () => {
    if (!activeExam) return;

    // Check if there's an existing draft/session for this exam
    const existingSession = getStudentExamSession(currentUser.username, activeExam.id, appData);
    if (existingSession && Object.keys(existingSession.answers || {}).length > 0) {
      // Resume existing answers and remaining time!
      handleResumeExam(existingSession);
      return;
    }

    // Brand new start
    const docEl = document.documentElement;
    if (docEl.requestFullscreen) {
      docEl.requestFullscreen().catch(() => {});
    }

    const initialSecs = activeExam.durationMinutes * 60;
    const now = Date.now();

    setAnswers({});
    setDoubtQuestions({});
    setCurrentQuestionIdx(0);
    setViolations(0);
    setViolationLogs([]);
    setTimeRemaining(initialSecs);
    setStartTimeEpoch(now);

    // Persist brand-new session
    const initialSession: OngoingExamSession = {
      examId: activeExam.id,
      examCode: activeExam.code,
      examTitle: activeExam.title,
      studentUsername: currentUser.username,
      studentName: currentUser.name,
      studentClass: currentUser.classLevel || activeExam.classLevel,
      answers: {},
      doubtQuestions: {},
      currentQuestionIdx: 0,
      timeRemainingSeconds: initialSecs,
      lastSavedAt: now,
      startTimeEpoch: now,
      violations: 0,
      violationLogs: [],
      isDisconnected: !navigator.onLine,
    };
    saveStudentExamSession(initialSession);
    setOngoingSession(initialSession);

    setStudentStep('exam');
  };

  // Final Exam Submission Calculation
  const handleFinalSubmit = (statusReason: 'Selesai' | 'Ditangguhkan (Pelanggaran)' | 'Waktu Habis' = 'Selesai') => {
    if (!activeExam) return;
    if (timerRef.current) clearInterval(timerRef.current);

    // Exit fullscreen if active
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    // Calculate score
    let earnedScore = 0;
    let maxScore = 0;

    activeExam.questions.forEach((q) => {
      maxScore += q.score;
      const givenAns = answers[q.id];
      if (givenAns !== undefined && givenAns.trim() !== '') {
        if (q.type === 'pg' || q.type === 'bs') {
          if (givenAns.trim().toLowerCase() === q.answer.trim().toLowerCase()) {
            earnedScore += q.score;
          }
        } else if (q.type === 'isian') {
          if (givenAns.trim().toLowerCase() === q.answer.trim().toLowerCase()) {
            earnedScore += q.score;
          }
        } else {
          // Uraian default partial credit for attempted answers
          earnedScore += Math.round(q.score * 0.85);
        }
      }
    });

    const finalScore = maxScore > 0 ? Math.round((earnedScore / maxScore) * 100) : 0;
    const durationSpent = Math.max(10, Math.floor((Date.now() - startTimeEpoch) / 1000));

    const submission: Submission = {
      id: `sub-${Date.now()}`,
      examId: activeExam.id,
      examTitle: activeExam.title,
      studentUsername: currentUser.username,
      studentName: currentUser.name,
      studentClass: currentUser.classLevel || 'Kelas Umum',
      score: finalScore,
      status: statusReason,
      violations: violations,
      violationLogs: violationLogs,
      answers: answers,
      submittedAt: new Date().toLocaleString('id-ID'),
      durationSpentSeconds: durationSpent,
    };

    // Remove active ongoing session since exam is officially submitted
    clearStudentExamSession(currentUser.username, activeExam.id);
    setOngoingSession(null);

    const updatedOngoing = { ...(appData.ongoingSessions || {}) };
    delete updatedOngoing[`${currentUser.username}_${activeExam.id}`];

    // Push submission to server endpoint directly
    syncSubmissionToServer(submission);

    onUpdateData({
      ...appData,
      submissions: [submission, ...appData.submissions],
      ongoingSessions: updatedOngoing,
    });

    setLastSubmission(submission);
    setStudentStep('finished');
    onShowToast('Ujian telah berhasil dikumpulkan! Terima kasih telah mengerjakan dengan tertib dan jujur.', 'success');
  };

  // Filtered exams for portal
  const filteredExams = appData.exams.filter((ex) => {
    const matchesClass = classFilter === 'Semua' || ex.classLevel === classFilter;
    const matchesSearch =
      ex.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesSearch;
  });

  // ==========================================
  // RENDER STEP 1: PORTAL UJIAN
  // ==========================================
  if (studentStep === 'portal') {
    return (
      <div className="space-y-6">
        {/* Welcome Card */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg border border-blue-800/60 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300">
                Portal Asesmen Siswa CBT
              </span>
              <span className="text-blue-300">•</span>
              <div className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/30">
                {isOnline ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-amber-400" />}
                <span>{isOnline ? 'Terhubung (Online)' : 'Mode Offline (Jawaban Aman)'}</span>
              </div>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
              Selamat datang, {currentUser.name}!
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed mb-4">
              Silakan pilih paket ujian Informatika di bawah ini sesuai dengan tingkat kelas Anda.
              Sistem dilengkapi <strong>Proteksi Disconnect & Auto-Save</strong>: jika internet terputus, jawaban dan sisa waktu Anda tersimpan aman dan dapat dilanjutkan tanpa mengulang dari awal.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-xl text-xs font-semibold text-blue-200 border border-white/10">
              <Shield className="w-3.5 h-3.5" />
              <span>Sistem Ujian Terproteksi Kiosk Mode & Anti-Disconnect</span>
            </div>
          </div>
        </div>

        {/* 🌟 ONGOING / DISCONNECTED SESSION RESUME BANNER */}
        {ongoingSession && (
          <div className="bg-gradient-to-r from-amber-500/15 via-blue-600/15 to-indigo-600/15 border-2 border-amber-400/90 rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden backdrop-blur-xs animate-in fade-in duration-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-800 font-bold rounded-full text-xs border border-amber-400/50">
                  <History className="w-3.5 h-3.5 text-amber-600" />
                  <span>Sesi Ujian Sebelumnya Ditemukan • Terputus Koneksi</span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Lanjutkan: {ongoingSession.examTitle}
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Sesi ujian Anda sebelumnya sempat terputus dari internet atau jendela tertutup. Seluruh <strong>{Object.keys(ongoingSession.answers || {}).filter(k => ongoingSession.answers[k]?.trim() !== '').length} jawaban sebelumnya</strong> dan <strong>sisa waktu terakhir ({formatTimer(ongoingSession.timeRemainingSeconds)})</strong> telah disimpan aman tanpa harus mengulang dari awal!
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
                  <span className="flex items-center gap-1.5 font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200">
                    <Clock className="w-4 h-4 text-blue-600" />
                    Sisa Waktu Terakhir: {formatTimer(ongoingSession.timeRemainingSeconds)}
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {Object.keys(ongoingSession.answers || {}).filter(k => ongoingSession.answers[k]?.trim() !== '').length} Soal Sudah Terjawab
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    Tersimpan otomatis: {new Date(ongoingSession.lastSavedAt).toLocaleTimeString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleResumeExam(ongoingSession)}
                  className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <PlayCircle className="w-5 h-5 text-white" />
                  <span>Lanjutkan Ujian (Sisa Waktu: {formatTimer(ongoingSession.timeRemainingSeconds)})</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari ujian / materi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48 sm:w-60"
              />
            </div>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
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
          <div className="text-xs text-slate-500">
            Ditemukan <strong>{filteredExams.length}</strong> paket ujian aktif
          </div>
        </div>

        {/* Exams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredExams.map((exam) => {
            const mySubmission = appData.submissions.find(
              (s) => s.examId === exam.id && s.studentUsername === currentUser.username
            );
            const isThisExamOngoing = ongoingSession && ongoingSession.examId === exam.id && !mySubmission;

            return (
              <div
                key={exam.id}
                className={`bg-white rounded-3xl border transition-all p-5 flex flex-col justify-between shadow-xs hover:shadow-md ${
                  isThisExamOngoing
                    ? 'border-amber-400 ring-2 ring-amber-400/30 bg-amber-50/20'
                    : 'border-slate-200/90'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                      {exam.classLevel} • {exam.subject}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
                      {exam.code}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug mb-2">
                    {exam.title}
                  </h3>
                  <div className="text-xs text-slate-500 space-y-1 mb-4">
                    <div className="flex items-center gap-3">
                      <span><Clock className="w-3.5 h-3.5 inline mr-1 text-slate-400" />{exam.durationMinutes} Menit</span>
                      <span>{exam.questions.length} Butir Soal</span>
                      <span>KKM: <strong className="text-emerald-700">{exam.passingScore}</strong></span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Guru Pengampu: {exam.teacherName || 'SOHIBUL UMAM S.Kom'}
                    </div>
                  </div>

                  {/* Ongoing session badge */}
                  {isThisExamOngoing && (
                    <div className="mb-4 p-3 bg-amber-50 rounded-2xl border border-amber-300 text-xs text-amber-900 space-y-1">
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5 text-amber-800">
                          <History className="w-3.5 h-3.5 text-amber-600" />
                          <span>Ujian Sedang Berjalan</span>
                        </span>
                        <span className="text-blue-700 font-mono">
                          Sisa: {formatTimer(ongoingSession.timeRemainingSeconds)}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-700">
                        {Object.keys(ongoingSession.answers || {}).filter(k => ongoingSession.answers[k]?.trim() !== '').length} butir jawaban tersimpan. Lanjutkan langsung dari soal terakhir.
                      </p>
                    </div>
                  )}

                  {mySubmission && (
                    <div className="mb-4 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-850 flex items-center justify-between">
                      <span className="font-semibold flex items-center gap-1.5 text-emerald-900">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Sudah Selesai Dikerjakan
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200">
                        Tersimpan di Server
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100">
                  {isThisExamOngoing ? (
                    <button
                      type="button"
                      onClick={() => handleResumeExam(ongoingSession)}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-600 to-blue-600 hover:from-amber-700 hover:to-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>Lanjutkan Ujian (Sisa {formatTimer(ongoingSession.timeRemainingSeconds)})</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectExam(exam)}
                      className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>{mySubmission ? 'Kerjakan Ulang Ujian' : 'Mulai Ujian Sekarang'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredExams.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
            Tidak ada paket ujian untuk kelas ini saat ini.
          </div>
        )}

        {/* PIN VERIFICATION MODAL */}
        {isPinModalOpen && pinExamCandidate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 text-center mb-1">
                Masukkan PIN Ujian
              </h3>
              <p className="text-xs text-slate-500 text-center mb-4 leading-relaxed">
                {pinExamCandidate.title}
                <br />
                <span className="text-[11px] text-slate-400 font-mono">
                  (Default PIN: {pinExamCandidate.pin})
                </span>
              </p>

              <form onSubmit={handleVerifyPin} className="space-y-4">
                <div>
                  <input
                    type="password"
                    maxLength={10}
                    autoFocus
                    required
                    value={enteredPin}
                    onChange={(e) => setEnteredPin(e.target.value)}
                    placeholder="Masukkan 4-digit PIN"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-lg font-mono tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPinModalOpen(false)}
                    className="flex-1 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
                  >
                    Verifikasi PIN
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // RENDER STEP 2: INSTRUKSI & TATA TERTIB
  // ==========================================
  if (studentStep === 'instructions' && activeExam) {
    const existingDraft = getStudentExamSession(currentUser.username, activeExam.id, appData);
    const hasPriorDraft = existingDraft && Object.keys(existingDraft.answers || {}).length > 0;

    return (
      <div className="max-w-2xl mx-auto py-6">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xl space-y-6">
          <div className="text-center pb-4 border-b border-slate-100">
            <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
              <Shield className="w-7 h-7" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Tata Tertib & Kiosk Mode Anti-Cheat
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {activeExam.title} • Guru Pengampu: {activeExam.teacherName || 'SOHIBUL UMAM S.Kom'}
            </p>
          </div>

          {hasPriorDraft && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
              <History className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Perhatian: Draft Jawaban Sebelumnya Ditemukan!</strong>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Anda telah memiliki {Object.keys(existingDraft.answers || {}).length} butir jawaban tersimpan dengan sisa waktu {formatTimer(existingDraft.timeRemainingSeconds)}. Tombol di bawah akan langsung melanjutkan ujian tanpa memulai ulang dari awal.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3.5 text-xs text-slate-700 bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>Durasi & Proteksi Timer:</strong> Waktu pengerjaan adalah{' '}
                <strong>{activeExam.durationMinutes} menit</strong>. Jika Anda terputus dari internet, timer Anda dibekukan dan dilanjutkan saat login kembali.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong>Auto-Save Real-Time:</strong> Jawaban tersimpan otomatis di perangkat dan server setiap kali Anda memilih opsi atau mengetik.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>Layar Penuh (Fullscreen Wajib):</strong> Begitu masuk ke ruang ujian, browser akan memasuki mode fullscreen. Dilarang menekan ESC atau keluar layar penuh.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong>Kiosk Mode Terpasang:</strong> Dilarang berpindah tab browser, membuka aplikasi lain, atau meminimize browser.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong>Batas Pelanggaran:</strong> Maksimal diperbolehkan{' '}
                <strong>{activeExam.maxViolations} kali pelanggaran</strong> sebelum ujian otomatis ditangguhkan.
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={() => setStudentStep('portal')}
              className="w-full sm:w-auto px-5 py-3 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Kembali ke Portal
            </button>
            <button
              onClick={handleStartExam}
              className="w-full sm:flex-1 py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>{hasPriorDraft ? 'LANJUTKAN UJIAN SAYA SEKARANG' : 'SAYA MENGERTI, MASUK RUANG UJIAN FULLSCREEN'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER STEP 3: RUANG UJIAN (EXAM ROOM)
  // ==========================================
  if (studentStep === 'exam' && activeExam) {
    const currentQ = activeExam.questions[currentQuestionIdx];
    const isDoubt = Boolean(doubtQuestions[currentQ?.id]);
    const totalQuestionsCount = activeExam.questions.length;
    const answeredCount = Object.keys(answers).filter((k) => answers[k]?.trim() !== '').length;

    return (
      <div className="fixed inset-0 z-50 bg-slate-900 text-slate-100 flex flex-col overflow-hidden">
        {/* Disconnection Warning Bar if offline */}
        {!isOnline && (
          <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-bold flex items-center justify-between gap-2 shadow-md shrink-0">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-slate-950 animate-pulse" />
              <span>Koneksi Internet Terputus (Mode Offline Aktif). Jangan khawatir, seluruh jawaban Anda dan sisa waktu tetap tersimpan otomatis di perangkat ini!</span>
            </div>
            <span className="text-[11px] bg-slate-950/20 px-2 py-0.5 rounded font-mono">
              Auto-Save Lokal Aktif
            </span>
          </div>
        )}

        {/* Exam Header */}
        <header className="bg-slate-950/90 border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-white truncate">
              {activeExam.title}
            </h2>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span>Peserta: <strong className="text-slate-200">{currentUser.name}</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1">
                {isOnline ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                    <Wifi className="w-3 h-3" /> Online
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                    <WifiOff className="w-3 h-3" /> Offline (Tersimpan)
                  </span>
                )}
              </span>
              <span>•</span>
              <span>Pelanggaran: <strong className={`tabular-nums ${violations > 0 ? 'text-rose-400' : 'text-slate-300'}`}>{violations}/{activeExam.maxViolations}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Live Timer */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono font-bold text-sm sm:text-base tabular-nums shadow-inner ${
                timeRemaining <= 300
                  ? 'bg-rose-950/60 text-rose-400 border-rose-800 animate-pulse'
                  : 'bg-slate-900 text-blue-400 border-slate-700'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{formatTimer(timeRemaining)}</span>
            </div>

            {/* Quick Submit Button in Header */}
            <button
              type="button"
              onClick={() => setIsConfirmSubmitOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
              title="Kumpulkan dan Selesaikan Ujian"
            >
              <Check className="w-4 h-4" />
              <span className="hidden sm:inline">Selesai Ujian</span>
            </button>
          </div>
        </header>

        {/* Exam Body Grid */}
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-5 overflow-y-auto min-h-0">
          {/* Main Question Workspace */}
          <div className="lg:col-span-3 bg-slate-800/80 backdrop-blur-md rounded-3xl border border-slate-700/80 p-5 sm:p-7 flex flex-col justify-between overflow-y-auto min-h-0 shadow-2xl">
            <div>
              {/* Question metadata strip */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-700/70">
                <span className="text-xs font-semibold px-2.5 py-1 bg-blue-500/20 text-blue-300 rounded-lg border border-blue-500/30">
                  Soal No. {currentQuestionIdx + 1} dari {totalQuestionsCount}
                </span>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Tipe: <strong className="uppercase text-slate-200">{currentQ?.type}</strong></span>
                  <span>•</span>
                  <span>Bobot: <strong className="text-slate-200">{currentQ?.score}</strong> Poin</span>
                </div>
              </div>

              {/* Question Text with Table, Diagram, and Image rendering */}
              <div className="mb-6">
                <QuestionContentRenderer
                  content={currentQ?.question || ''}
                  imageUrl={currentQ?.imageUrl}
                  isDarkMode={true}
                />
              </div>

              {/* Options & Inputs */}
              {currentQ && (
                <div className="space-y-3">
                  {currentQ.type === 'pg' &&
                    currentQ.options.map((opt, oIdx) => {
                      const isSelected = answers[currentQ.id] === String(oIdx);
                      return (
                        <button
                          type="button"
                          key={oIdx}
                          onClick={() => handleSaveAnswer(currentQ.id, String(oIdx))}
                          className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600/30 border-blue-500 text-white shadow-md'
                              : 'bg-slate-900/60 hover:bg-slate-900 border-slate-700/80 text-slate-200'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 border ${
                              isSelected
                                ? 'bg-blue-500 border-blue-400 text-white'
                                : 'bg-slate-800 border-slate-700 text-slate-400'
                            }`}
                          >
                            {String.fromCharCode(65 + oIdx)}
                          </div>
                          <div className="text-sm sm:text-base leading-snug">{opt}</div>
                        </button>
                      );
                    })}

                  {currentQ.type === 'bs' && (
                    <div className="grid grid-cols-2 gap-4">
                      {['Benar', 'Salah'].map((opt) => {
                        const isSelected = answers[currentQ.id] === opt;
                        return (
                          <button
                            type="button"
                            key={opt}
                            onClick={() => handleSaveAnswer(currentQ.id, opt)}
                            className={`p-5 rounded-2xl border text-center font-bold text-base transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600/30 border-blue-500 text-white shadow-md'
                                : 'bg-slate-900/60 hover:bg-slate-900 border-slate-700/80 text-slate-200'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {(currentQ.type === 'isian' || currentQ.type === 'uraian') && (
                    <div>
                      <textarea
                        rows={5}
                        value={answers[currentQ.id] || ''}
                        onChange={(e) => handleSaveAnswer(currentQ.id, e.target.value)}
                        placeholder="Ketikkan jawaban Anda di sini..."
                        className="w-full p-4 bg-slate-900/90 border border-slate-700 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-6 mt-6 border-t border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleNavigateQuestion(Math.max(0, currentQuestionIdx - 1))}
                  disabled={currentQuestionIdx === 0}
                  className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:pointer-events-none text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Sebelumnya</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleDoubt(currentQ.id)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isDoubt
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{isDoubt ? 'Ragu-ragu (Aktif)' : 'Ragu-ragu'}</span>
                </button>
              </div>

              <div>
                {currentQuestionIdx < totalQuestionsCount - 1 ? (
                  <button
                    type="button"
                    onClick={() => handleNavigateQuestion(Math.min(totalQuestionsCount - 1, currentQuestionIdx + 1))}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Selanjutnya</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsConfirmSubmitOpen(true)}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    <span>Selesai & Kumpulkan Ujian</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Question Navigation Matrix */}
          <div className="bg-slate-800/80 backdrop-blur-md rounded-3xl border border-slate-700/80 p-5 flex flex-col justify-between shadow-2xl min-h-0 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Navigasi Soal
                </h3>
                <span className="text-xs text-slate-400 tabular-nums">
                  {answeredCount}/{totalQuestionsCount} Terjawab
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden mb-4">
                <div
                  className="bg-blue-500 h-full transition-all duration-300"
                  style={{ width: `${(answeredCount / totalQuestionsCount) * 100}%` }}
                />
              </div>

              {/* Grid of question buttons */}
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-64 overflow-y-auto p-1">
                {activeExam.questions.map((q, idx) => {
                  const qAnswered = answers[q.id] !== undefined && answers[q.id]?.trim() !== '';
                  const qDoubt = Boolean(doubtQuestions[q.id]);
                  const isCurrent = idx === currentQuestionIdx;

                  let btnStyle = 'bg-slate-700/60 text-slate-300 border-slate-600';
                  if (isCurrent) {
                    btnStyle = 'bg-blue-600 text-white border-blue-400 font-bold ring-2 ring-blue-400/50';
                  } else if (qDoubt) {
                    btnStyle = 'bg-amber-600/40 text-amber-200 border-amber-500 font-bold';
                  } else if (qAnswered) {
                    btnStyle = 'bg-emerald-600/40 text-emerald-200 border-emerald-500 font-semibold';
                  }

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => handleNavigateQuestion(idx)}
                      className={`h-9 rounded-xl text-xs border transition-all flex items-center justify-center tabular-nums cursor-pointer ${btnStyle}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 pt-3 border-t border-slate-700/80 space-y-1.5 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-emerald-600/40 border border-emerald-500" />
                  <span>Sudah dijawab</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-amber-600/40 border border-amber-500" />
                  <span>Ragu-ragu</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-slate-700/60 border border-slate-600" />
                  <span>Belum dijawab</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-700/80 mt-4 space-y-2">
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>Status Jawaban:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Auto-Save Aktif
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmSubmitOpen(true)}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/25 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Selesaikan Ujian Sekarang</span>
              </button>
            </div>
          </div>
        </div>

        {/* IN-ROOM SUBMIT CONFIRMATION MODAL */}
        {isConfirmSubmitOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Konfirmasi Pengumpulan Ujian</h3>
                  <p className="text-xs text-slate-400">Pastikan seluruh jawaban Anda sudah terisi dengan benar.</p>
                </div>
              </div>

              <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700/60 text-xs space-y-2.5">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Total Butir Soal:</span>
                  <strong className="text-white tabular-nums">{totalQuestionsCount} Soal</strong>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Sudah Terjawab:</span>
                  <strong className="text-emerald-400 tabular-nums">{answeredCount} Soal</strong>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Belum Dijawab:</span>
                  <strong className={totalQuestionsCount - answeredCount > 0 ? "text-amber-400 tabular-nums font-bold" : "text-slate-400 tabular-nums"}>
                    {totalQuestionsCount - answeredCount} Soal
                  </strong>
                </div>
                {Object.keys(doubtQuestions).filter((k) => doubtQuestions[k]).length > 0 && (
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Masih Ragu-ragu:</span>
                    <strong className="text-amber-400 tabular-nums">
                      {Object.keys(doubtQuestions).filter((k) => doubtQuestions[k]).length} Soal
                    </strong>
                  </div>
                )}
                <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-slate-700/60">
                  <span>Sisa Waktu Pengerjaan:</span>
                  <strong className="text-blue-400 font-mono font-bold">{formatTimer(timeRemaining)}</strong>
                </div>
              </div>

              {totalQuestionsCount - answeredCount > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Perhatian: Masih ada <strong>{totalQuestionsCount - answeredCount} butir soal</strong> yang belum Anda jawab.
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmSubmitOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Periksa Kembali
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsConfirmSubmitOpen(false);
                    handleFinalSubmit('Selesai');
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Ya, Kumpulkan Ujian</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* KIOSK VIOLATION POPUP MODAL */}
        {kioskWarning?.isOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-slate-900 border border-rose-600 rounded-3xl p-6 max-w-md w-full shadow-2xl text-center space-y-4">
              <div className="w-14 h-14 bg-rose-500/20 border border-rose-500 text-rose-400 rounded-2xl flex items-center justify-center mx-auto text-2xl">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">
                Peringatan Pelanggaran Kiosk Mode!
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                {kioskWarning.reason}
              </p>
              <button
                type="button"
                onClick={() => {
                  setKioskWarning(null);
                  const elem = document.documentElement;
                  if (elem.requestFullscreen && !document.fullscreenElement) {
                    elem.requestFullscreen().catch(() => {});
                  }
                }}
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-colors shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                SAYA MENGERTI & KEMBALI KE UJIAN
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // RENDER STEP 4: SELESAI & BUKTI PENYERAHAN UJIAN
  // ==========================================
  if (studentStep === 'finished' && lastSubmission && activeExam) {
    const answeredCount = Object.keys(lastSubmission.answers || {}).filter(
      (k) => lastSubmission.answers[k] && lastSubmission.answers[k].trim() !== ''
    ).length;
    const totalCount = activeExam.questions.length;

    return (
      <div className="max-w-2xl mx-auto py-6 space-y-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 shadow-lg shadow-emerald-500/20 flex items-center justify-center mx-auto text-3xl">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>

          <div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-block mb-2">
              Status: Jawaban Berhasil Dikumpulkan & Tersimpan Aman
            </span>
            <h2 className="text-2xl font-bold text-slate-900 mb-1">
              Ujian Berhasil Diserahkan!
            </h2>
            <p className="text-xs text-slate-500">
              {activeExam.title} • Peserta: <strong>{currentUser.name}</strong> ({currentUser.classLevel || activeExam.classLevel})
            </p>
          </div>

          <div className="bg-gradient-to-b from-slate-50 to-emerald-50/40 rounded-2xl p-6 border border-slate-200/90 max-w-md mx-auto space-y-3 text-center">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <Shield className="w-5 h-5 text-emerald-600" />
            </div>
            <h4 className="font-bold text-slate-900 text-sm">
              Terima Kasih Atas Kejujuran & Usaha Terbaik Anda!
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Seluruh lembar jawaban Anda telah tersimpan rapi di server CBT sekolah untuk dikoreksi dan dinilai langsung oleh Guru Pengampu mata pelajaran <strong>{activeExam.subject}</strong>.
            </p>
            <div className="p-3 bg-white rounded-xl border border-emerald-100 text-[11px] text-emerald-900 font-medium italic">
              &ldquo;Tetap semangat belajar, terus eksplorasi wawasan baru, dan selalu percaya diri dengan kemampuan serta proses belajarmu!&rdquo;
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">SOAL TERJAWAB</span>
              <strong className="text-slate-800 font-mono text-sm tabular-nums">
                {answeredCount} / {totalCount}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">DURASI PENGERJAAN</span>
              <strong className="text-slate-800 font-mono text-sm tabular-nums">
                {Math.max(1, Math.round(lastSubmission.durationSpentSeconds / 60))} Menit
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">STATUS KIOSK</span>
              <strong className="text-emerald-700 font-semibold">
                {lastSubmission.violations === 0 ? 'Tertib (0 Teguran)' : `${lastSubmission.violations} Catatan`}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">WAKTU SELESAI</span>
              <strong className="text-slate-800 text-[11px] truncate block" title={lastSubmission.submittedAt}>
                {lastSubmission.submittedAt.split(',')[1] || lastSubmission.submittedAt}
              </strong>
            </div>
          </div>

          {/* Notice of auto redirect to Login page */}
          <div className="p-3.5 bg-blue-50 text-blue-900 rounded-2xl border border-blue-200/90 text-xs text-center flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 text-blue-600 animate-pulse shrink-0" />
            <span>
              Sistem akan otomatis kembali ke <strong>Halaman Login</strong> dalam{' '}
              <strong className="font-mono text-sm text-blue-700 tabular-nums">{autoLogoutSeconds} detik</strong> untuk peserta ujian berikutnya.
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={() => window.print()}
              className="w-full sm:w-auto px-5 py-3 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Bukti Penyerahan</span>
            </button>
            <button
              onClick={() => {
                if (onLogout) {
                  onLogout();
                } else {
                  setStudentStep('portal');
                  setActiveExam(null);
                  setLastSubmission(null);
                }
              }}
              className="w-full sm:flex-1 py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <LogOut className="w-4 h-4" />
              <span>Selesai & Keluar ke Halaman Login</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
