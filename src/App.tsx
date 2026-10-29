import { useState, useEffect } from 'react';
import { AppData, User, TeacherAccount } from './types';
import {
  getStoredData,
  saveStoredData,
  resetToDefaultData,
  fetchServerData,
  syncDataToServer,
  getPersistentTeacherCredentials,
  savePersistentTeacherCredentials,
  cleanDemoTeachers,
  DEMO_SAMPLE_USERNAMES,
} from './utils/storage';
import { Navbar } from './components/Navbar';
import { LoginView } from './components/LoginView';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { StudentPortal } from './components/student/StudentPortal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { Modal } from './components/Modal';

export default function App() {
  const [appData, setAppData] = useState<AppData>(() => getStoredData());
  const [activeTeacherTab, setActiveTeacherTab] = useState<string>('exams');

  // Synchronize with server on startup (enables real-time cross-device sync between PC and HP)
  useEffect(() => {
    fetchServerData().then((serverData) => {
      if (serverData && Array.isArray(serverData.exams)) {
        setAppData((prev) => {
          // Merge local submissions that aren't on server
          const serverSubIds = new Set((serverData.submissions || []).map((s) => s.id));
          const localOnlySubs = (prev.submissions || []).filter((s) => !serverSubIds.has(s.id));
          const mergedSubmissions = [...localOnlySubs, ...(serverData.submissions || [])];

          // Clean demo teachers from both server and local state
          const cleanedServer = cleanDemoTeachers(serverData);
          const cleanedLocal = cleanDemoTeachers(prev);

          // Merge teachers: combine unique non-demo teachers from server and local
          const teacherMap = new Map<string, TeacherAccount>();
          (cleanedServer.teachers || []).forEach((t) => teacherMap.set(t.username.toLowerCase(), t));
          (cleanedLocal.teachers || []).forEach((t) => {
            if (!teacherMap.has(t.username.toLowerCase())) {
              teacherMap.set(t.username.toLowerCase(), t);
            } else {
              const existing = teacherMap.get(t.username.toLowerCase())!;
              teacherMap.set(t.username.toLowerCase(), {
                ...existing,
                ...t,
                biodata: t.biodata || existing.biodata,
                schedules: t.schedules && t.schedules.length > 0 ? t.schedules : existing.schedules,
              });
            }
          });

          const teachersList = Array.from(teacherMap.values());

          // Merge credentials: start with persistent, then merge server, then freshest local state
          const persistentCreds = getPersistentTeacherCredentials();
          const mergedCreds = {
            ...persistentCreds,
            ...(cleanedServer.teacherCredentials || {}),
            ...(cleanedLocal.teacherCredentials || {}),
          };
          DEMO_SAMPLE_USERNAMES.forEach((uname) => {
            delete mergedCreds[uname];
            delete mergedCreds[uname.toLowerCase()];
          });

          const mergedBankQuestions = Array.isArray(cleanedServer.bankQuestions)
            ? cleanedServer.bankQuestions
            : (Array.isArray(prev.bankQuestions) ? prev.bankQuestions : []);

          const mergedExams = Array.isArray(cleanedServer.exams)
            ? cleanedServer.exams
            : (prev.exams || []);

          const mergedData: AppData = {
            ...cleanedServer,
            bankQuestions: mergedBankQuestions,
            exams: mergedExams,
            teachers: teachersList.map((t) => {
              const customPwd = mergedCreds[t.username] || t.password;
              return customPwd ? { ...t, password: customPwd } : t;
            }),
            teacherCredentials: mergedCreds,
            submissions: mergedSubmissions,
            currentUser: prev.currentUser, // preserve session
          };

          saveStoredData(mergedData);
          savePersistentTeacherCredentials(mergedCreds);
          if (prev.currentUser?.role === 'guru' || prev.currentUser?.isAdmin) {
            syncDataToServer(mergedData);
          }
          return mergedData;
        });
      } else {
        // Seed server only if user is teacher
        if (appData.currentUser?.role === 'guru' || appData.currentUser?.isAdmin) {
          syncDataToServer(appData);
        }
      }
    });
  }, []);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Confirmation Modal
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastMessage = { id, type, message };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const showModal = (config: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  }) => {
    setModalConfig({
      isOpen: true,
      ...config,
    });
  };

  const closeModal = () => {
    setModalConfig((prev) => ({ ...prev, isOpen: false }));
  };

  const handleUpdateData = (newData: AppData) => {
    let cleaned = cleanDemoTeachers(newData);
    // Sync current logged in teacher avatar & name
    if (cleaned.currentUser?.role === 'guru') {
      const matchT = (cleaned.teachers || []).find(
        (t) => t.username.toLowerCase() === cleaned.currentUser?.username.toLowerCase()
      );
      if (matchT) {
        const av = matchT.avatarUrl || matchT.biodata?.avatarUrl;
        cleaned = {
          ...cleaned,
          currentUser: {
            ...cleaned.currentUser,
            avatarUrl: av,
            name: matchT.name || cleaned.currentUser.name,
          },
        };
      }
    }
    setAppData(cleaned);
    saveStoredData(cleaned);
    if (cleaned.teacherCredentials && Object.keys(cleaned.teacherCredentials).length > 0) {
      savePersistentTeacherCredentials(cleaned.teacherCredentials);
    }
    // Background sync to server - ONLY FOR TEACHER OR SUPER ADMIN
    const isTeacher =
      cleaned.currentUser?.role === 'guru' ||
      Boolean(cleaned.currentUser?.isAdmin) ||
      (cleaned.currentUser?.username || '').toLowerCase() === 'sohibul';
    if (isTeacher) {
      syncDataToServer(cleaned);
    }
  };

  const handleLogin = (user: User) => {
    let userWithAvatar = user;
    if (user.role === 'guru') {
      const matchT = (appData.teachers || []).find(
        (t) => t.username.toLowerCase() === user.username.toLowerCase()
      );
      if (matchT) {
        userWithAvatar = {
          ...user,
          avatarUrl: matchT.avatarUrl || matchT.biodata?.avatarUrl,
        };
      }
    }
    const updated = { ...appData, currentUser: userWithAvatar };
    setAppData(updated);
    saveStoredData(updated);
    if (user.role === 'guru' || user.isAdmin) {
      syncDataToServer(updated);
    }
  };

  const handleRegisterTeacher = (newTeacher: TeacherAccount) => {
    setAppData((prev) => {
      const cleanUsername = newTeacher.username.trim().toLowerCase();
      const filteredExisting = (prev.teachers || []).filter((t) => t.username.toLowerCase() !== cleanUsername);
      const updatedTeachers = [...filteredExisting, newTeacher];
      const updatedCredentials = {
        ...prev.teacherCredentials,
        [cleanUsername]: newTeacher.password || 'password123',
      };
      const updated: AppData = cleanDemoTeachers({
        ...prev,
        teachers: updatedTeachers,
        teacherCredentials: updatedCredentials,
      });
      saveStoredData(updated);
      savePersistentTeacherCredentials(updated.teacherCredentials);
      const isTeacher =
        updated.currentUser?.role === 'guru' ||
        Boolean(updated.currentUser?.isAdmin) ||
        (updated.currentUser?.username || '').toLowerCase() === 'sohibul';
      if (isTeacher) {
        syncDataToServer(updated);
      }
      return updated;
    });
  };

  const handleLogout = () => {
    showModal({
      title: 'Konfirmasi Keluar Sesi',
      message: 'Apakah Anda yakin ingin keluar dari sesi pengguna saat ini?',
      type: 'warning',
      confirmLabel: 'Ya, Keluar',
      onConfirm: () => {
        const updated = { ...appData, currentUser: null };
        setAppData(updated);
        saveStoredData(updated);
        showToast('Berhasil keluar sesi.', 'info');
      },
    });
  };

  // Immediate logout when student completes the exam
  const handleDirectStudentLogout = () => {
    const updated = { ...appData, currentUser: null };
    handleUpdateData(updated);
    showToast('Ujian selesai dikumpulkan. Berhasil kembali ke halaman login.', 'success');
  };

  const handleResetData = () => {
    showModal({
      title: 'Reset Data ke Standar Awal',
      message: 'Tindakan ini akan mengembalikan seluruh bank soal, akun guru seluruh mapel & jurusan, jadwal ujian kelas 7-12, dan log ke data sampel standar sekolah. Lanjutkan?',
      type: 'danger',
      confirmLabel: 'Ya, Reset Data',
      onConfirm: () => {
        const resetData = resetToDefaultData();
        setAppData(resetData);
        showToast('Data aplikasi berhasil dikembalikan ke standar awal!', 'success');
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased selection:bg-blue-500 selection:text-white">
      {/* Toast Notification Layer */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Global Confirmation Modal */}
      <Modal
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmLabel={modalConfig.confirmLabel}
        cancelLabel={modalConfig.cancelLabel}
        type={modalConfig.type}
        onConfirm={() => {
          modalConfig.onConfirm();
          closeModal();
        }}
        onCancel={closeModal}
      />

      {/* Main View Router based on currentUser */}
      {!appData.currentUser ? (
        <LoginView
          onLogin={handleLogin}
          teacherCredentials={appData.teacherCredentials || { sohibul: 'password123' }}
          teachers={appData.teachers || []}
          onRegisterTeacher={handleRegisterTeacher}
          onShowToast={showToast}
        />
      ) : (
        <>
          <Navbar
            currentUser={appData.currentUser}
            onLogout={handleLogout}
            activeTab={activeTeacherTab}
            onTabChange={(tab) => setActiveTeacherTab(tab)}
          />

          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            {appData.currentUser.role === 'guru' ? (
              <TeacherDashboard
                appData={appData}
                activeTab={activeTeacherTab}
                onTabChange={setActiveTeacherTab}
                onUpdateData={handleUpdateData}
                onShowToast={showToast}
                onShowModal={showModal}
              />
            ) : (
              <StudentPortal
                currentUser={appData.currentUser}
                appData={appData}
                onUpdateData={handleUpdateData}
                onShowToast={showToast}
                onShowModal={showModal}
                onLogout={handleDirectStudentLogout}
              />
            )}
          </main>

          {/* Clean Footer */}
          <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
              <div>
                CBT Mandiri Sekolah • 2026 • Platform Ujian Berbasis Komputer Antar-Mapel & Jurusan (Kelas 7 – 12)
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={handleResetData}
                  className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  Reset Contoh Data
                </button>
                <span>•</span>
                <span>Kiosk Mode Anti-Cheat Aktif</span>
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
