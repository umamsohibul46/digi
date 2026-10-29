import React, { useState, useRef } from 'react';
import { TeacherAccount, TeachingSchedule, TeacherBiodata, User } from '../../types';
import {
  Users,
  Calendar,
  Clock,
  BookOpen,
  MapPin,
  Phone,
  Mail,
  GraduationCap,
  Shield,
  Lock,
  Plus,
  Edit,
  Trash2,
  Search,
  Eye,
  EyeOff,
  Key,
  Printer,
  X,
  Check,
  Layers,
  FileText,
  UserCheck,
  AlertCircle,
  Camera,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  RefreshCw,
} from 'lucide-react';
import { ChangeAvatarModal } from './ChangeAvatarModal';
import { compressImageFile } from '../../utils/imageUtils';

interface TeacherDirectoryAndScheduleProps {
  teachers: TeacherAccount[];
  currentUser: User;
  teacherCredentials: Record<string, string>;
  onUpdateTeachers: (updatedTeachers: TeacherAccount[]) => void;
  onUpdateCredentials: (updatedCredentials: Record<string, string>) => void;
  onUpdateTeachersAndCredentials?: (updatedTeachers: TeacherAccount[], updatedCredentials?: Record<string, string>) => void;
  onDeleteTeacher?: (teacher: TeacherAccount) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onShowModal: (config: {
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
    confirmLabel?: string;
    cancelLabel?: string;
  }) => void;
  onCreateExamForTeacher: (teacher: TeacherAccount) => void;
}

export const TeacherDirectoryAndSchedule: React.FC<TeacherDirectoryAndScheduleProps> = ({
  teachers = [],
  currentUser,
  teacherCredentials = {},
  onUpdateTeachers,
  onUpdateCredentials,
  onUpdateTeachersAndCredentials,
  onDeleteTeacher,
  onShowToast,
  onShowModal,
  onCreateExamForTeacher,
}) => {
  // Check if current logged-in user is Super Admin Sohibul strictly
  const isSohibul = currentUser.username.toLowerCase() === 'sohibul';
  const isSuperAdmin = isSohibul || Boolean(currentUser.isAdmin);

  // View modes: 'biodata' (Direktori Biodata), 'jadwal' (Jadwal Mengajar), 'keamanan' (Manajemen Akun & Sandi)
  const [subTab, setSubTab] = useState<'biodata' | 'jadwal' | 'keamanan'>('biodata');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('Semua');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'Semua' | 'Umum' | 'Kejuruan'>('Semua');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('Semua');

  // Avatar Modal State
  const [avatarTargetTeacher, setAvatarTargetTeacher] = useState<TeacherAccount | null>(null);

  // Modals state
  const [viewingBiodataTeacher, setViewingBiodataTeacher] = useState<TeacherAccount | null>(null);
  const [editingBiodataTeacher, setEditingBiodataTeacher] = useState<TeacherAccount | null>(null);
  const [biodataForm, setBiodataForm] = useState<TeacherBiodata & { name: string; subject: string; major: string; nip: string }>({
    name: '',
    subject: '',
    major: '',
    nip: '',
    nuptk: '',
    email: '',
    phone: '',
    gender: 'Laki-laki',
    birthPlaceDate: '',
    lastEducation: '',
    address: '',
    bioNotes: '',
    avatarUrl: '',
  });

  // Schedule Modal
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleTargetTeacherId, setScheduleTargetTeacherId] = useState<string>('');
  const [scheduleEditingId, setScheduleEditingId] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState<TeachingSchedule>({
    id: '',
    day: 'Senin',
    startTime: '07:30',
    endTime: '09:00',
    classLevel: 'Kelas 7A',
    room: 'Lab Komputer 1',
    subject: 'Informatika',
    notes: '',
  });

  // Password Modal
  const [passwordModalTeacher, setPasswordModalTeacher] = useState<TeacherAccount | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // Add new teacher modal
  const [isAddTeacherModalOpen, setIsAddTeacherModalOpen] = useState(false);
  const [newTeacherForm, setNewTeacherForm] = useState({
    name: '',
    username: '',
    password: 'password123',
    subject: 'Bahasa Indonesia',
    customSubject: '',
    major: 'Umum / Semua Jurusan',
    customMajor: '',
    nip: '',
    phone: '',
    email: '',
    lastEducation: '',
    bioNotes: '',
    avatarUrl: '',
  });

  const editBioFileInputRef = useRef<HTMLInputElement>(null);
  const newTeacherFileInputRef = useRef<HTMLInputElement>(null);

  const handleEditBioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 400, 0.85);
      setBiodataForm((prev) => ({ ...prev, avatarUrl: compressed }));
      onShowToast('Foto profil dari berkas komputer berhasil diproses!', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Gagal memproses gambar.', 'error');
    }
  };

  const handleNewTeacherFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 400, 0.85);
      setNewTeacherForm((prev) => ({ ...prev, avatarUrl: compressed }));
      onShowToast('Foto profil dari berkas komputer berhasil diproses!', 'success');
    } catch (err: any) {
      onShowToast(err.message || 'Gagal memproses gambar.', 'error');
    }
  };

  const togglePasswordVisibility = (username: string) => {
    // SECURITY CHECK: If target is sohibul and current user is NOT sohibul, deny!
    if (username.toLowerCase() === 'sohibul' && !isSohibul) {
      onShowToast('Akses Ditolak: Password Super User Sohibul hanya terlihat di panel Pak Sohibul!', 'error');
      return;
    }
    setShowPasswordMap((prev) => ({
      ...prev,
      [username]: !prev[username],
    }));
  };

  // Open Biodata Detail
  const handleOpenBiodataDetail = (teacher: TeacherAccount) => {
    setViewingBiodataTeacher(teacher);
  };

  // Open Edit Biodata Form
  const handleOpenEditBiodata = (teacher: TeacherAccount) => {
    // Only super admin or the teacher himself can edit
    if (!isSuperAdmin && currentUser.username !== teacher.username) {
      onShowToast('Anda hanya berhak mengubah biodata akun Anda sendiri.', 'warning');
      return;
    }

    setEditingBiodataTeacher(teacher);
    setBiodataForm({
      name: teacher.name,
      subject: teacher.subject,
      major: teacher.major || 'Umum / Semua Jurusan',
      nip: teacher.nip || '',
      nuptk: teacher.biodata?.nuptk || '',
      email: teacher.biodata?.email || '',
      phone: teacher.phone || teacher.biodata?.phone || '',
      gender: teacher.biodata?.gender || 'Laki-laki',
      birthPlaceDate: teacher.biodata?.birthPlaceDate || '',
      lastEducation: teacher.biodata?.lastEducation || '',
      address: teacher.biodata?.address || '',
      bioNotes: teacher.biodata?.bioNotes || '',
      avatarUrl: teacher.avatarUrl || teacher.biodata?.avatarUrl || '',
    });
  };

  // Save Biodata
  const handleSaveBiodataSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBiodataTeacher) return;

    const finalAvatar = biodataForm.avatarUrl?.trim() || undefined;

    const updated = teachers.map((t) => {
      if (t.username.toLowerCase() === editingBiodataTeacher.username.toLowerCase()) {
        const updatedBio: TeacherBiodata = {
          nuptk: biodataForm.nuptk?.trim() || undefined,
          email: biodataForm.email?.trim() || undefined,
          phone: biodataForm.phone?.trim() || undefined,
          gender: biodataForm.gender,
          birthPlaceDate: biodataForm.birthPlaceDate?.trim() || undefined,
          lastEducation: biodataForm.lastEducation?.trim() || undefined,
          address: biodataForm.address?.trim() || undefined,
          bioNotes: biodataForm.bioNotes?.trim() || undefined,
          avatarUrl: finalAvatar,
        };

        return {
          ...t,
          name: biodataForm.name.trim() || t.name,
          subject: biodataForm.subject.trim() || t.subject,
          major: biodataForm.major.trim() || t.major,
          nip: biodataForm.nip.trim() || undefined,
          phone: biodataForm.phone?.trim() || t.phone,
          avatarUrl: finalAvatar,
          biodata: updatedBio,
        };
      }
      return t;
    });

    onUpdateTeachers(updated);
    onShowToast(`Biodata guru ${biodataForm.name} berhasil diperbarui!`, 'success');
    setEditingBiodataTeacher(null);
  };

  // Dedicated Save Teacher Avatar (invoked from ChangeAvatarModal)
  const handleSaveTeacherAvatar = (teacherUsername: string, newAvatarUrl: string | undefined) => {
    const updated = teachers.map((t) => {
      if (t.username.toLowerCase() === teacherUsername.toLowerCase()) {
        const updatedBio: TeacherBiodata = {
          ...(t.biodata || {}),
          avatarUrl: newAvatarUrl,
        };
        return {
          ...t,
          avatarUrl: newAvatarUrl,
          biodata: updatedBio,
        };
      }
      return t;
    });

    onUpdateTeachers(updated);

    if (viewingBiodataTeacher && viewingBiodataTeacher.username.toLowerCase() === teacherUsername.toLowerCase()) {
      setViewingBiodataTeacher((prev) =>
        prev
          ? {
              ...prev,
              avatarUrl: newAvatarUrl,
              biodata: { ...(prev.biodata || {}), avatarUrl: newAvatarUrl },
            }
          : null
      );
    }
    if (editingBiodataTeacher && editingBiodataTeacher.username.toLowerCase() === teacherUsername.toLowerCase()) {
      setEditingBiodataTeacher((prev) =>
        prev
          ? {
              ...prev,
              avatarUrl: newAvatarUrl,
              biodata: { ...(prev.biodata || {}), avatarUrl: newAvatarUrl },
            }
          : null
      );
      setBiodataForm((prev) => ({ ...prev, avatarUrl: newAvatarUrl || '' }));
    }
  };

  // Open Schedule Modal
  const handleOpenScheduleModal = (teacher: TeacherAccount, scheduleToEdit?: TeachingSchedule) => {
    if (!isSuperAdmin && currentUser.username !== teacher.username) {
      onShowToast('Hanya Super Admin Sohibul atau guru bersangkutan yang dapat mengatur jadwal.', 'warning');
      return;
    }

    setScheduleTargetTeacherId(teacher.id || teacher.username);
    if (scheduleToEdit) {
      setScheduleEditingId(scheduleToEdit.id);
      setScheduleForm({ ...scheduleToEdit });
    } else {
      setScheduleEditingId(null);
      setScheduleForm({
        id: `sch-${Date.now()}`,
        day: 'Senin',
        startTime: '07:30',
        endTime: '09:00',
        classLevel: 'Kelas 7A',
        room: teacher.subject.toLowerCase().includes('komputer') || teacher.subject.toLowerCase().includes('informatika') ? 'Lab Komputer 1' : 'Ruang Kelas',
        subject: teacher.subject,
        notes: '',
      });
    }
    setIsScheduleModalOpen(true);
  };

  // Save Schedule
  const handleSaveScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleTargetTeacherId) return;

    const updated = teachers.map((t) => {
      if (t.id === scheduleTargetTeacherId || t.username === scheduleTargetTeacherId) {
        const currentSchedules = t.schedules || [];
        let newSchedules: TeachingSchedule[];

        if (scheduleEditingId) {
          newSchedules = currentSchedules.map((s) =>
            s.id === scheduleEditingId ? { ...scheduleForm, id: scheduleEditingId } : s
          );
        } else {
          newSchedules = [...currentSchedules, { ...scheduleForm, id: `sch-${Date.now()}` }];
        }

        return { ...t, schedules: newSchedules };
      }
      return t;
    });

    onUpdateTeachers(updated);
    onShowToast('Jadwal mengajar berhasil disimpan!', 'success');
    setIsScheduleModalOpen(false);
  };

  // Delete Schedule
  const handleDeleteSchedule = (teacher: TeacherAccount, scheduleId: string) => {
    if (!isSuperAdmin && currentUser.username !== teacher.username) {
      onShowToast('Hanya Super Admin Sohibul atau guru bersangkutan yang dapat menghapus jadwal.', 'warning');
      return;
    }

    onShowModal({
      title: 'Hapus Jadwal Mengajar',
      message: 'Apakah Anda yakin ingin menghapus jadwal mengajar ini?',
      type: 'danger',
      onConfirm: () => {
        const updated = teachers.map((t) => {
          if (t.username === teacher.username) {
            return {
              ...t,
              schedules: (t.schedules || []).filter((s) => s.id !== scheduleId),
            };
          }
          return t;
        });
        onUpdateTeachers(updated);
        onShowToast('Jadwal mengajar berhasil dihapus.', 'info');
      },
    });
  };

  // Open Password Modal
  const handleOpenPasswordModal = (teacher: TeacherAccount) => {
    // SECURITY CHECK:
    // If target is sohibul, ONLY sohibul can change it!
    if (teacher.username.toLowerCase() === 'sohibul' && !isSohibul) {
      onShowToast('DITOLAK: Anda tidak memiliki hak akses untuk mengubah kata sandi Super User Sohibul!', 'error');
      return;
    }

    // If current user is not Sohibul, they can only change their own password
    if (!isSohibul && currentUser.username.toLowerCase() !== teacher.username.toLowerCase()) {
      onShowToast('Anda hanya diizinkan mengubah kata sandi akun Anda sendiri.', 'warning');
      return;
    }

    setPasswordModalTeacher(teacher);
    setNewPasswordInput(teacherCredentials[teacher.username] || 'password123');
  };

  // Save Password
  const handleSavePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalTeacher) return;

    // Strict security check
    if (passwordModalTeacher.username.toLowerCase() === 'sohibul' && !isSohibul) {
      onShowToast('Operasi Ditolak: Hanya Super User Sohibul yang berwenang mengubah password ini.', 'error');
      setPasswordModalTeacher(null);
      return;
    }

    if (newPasswordInput.length < 4) {
      onShowToast('Kata sandi minimal 4 karakter!', 'error');
      return;
    }

    const updatedCreds = {
      ...teacherCredentials,
      [passwordModalTeacher.username]: newPasswordInput,
    };

    const updatedTeachers = teachers.map((t) =>
      t.username.toLowerCase() === passwordModalTeacher.username.toLowerCase()
        ? { ...t, password: newPasswordInput }
        : t
    );

    if (onUpdateTeachersAndCredentials) {
      onUpdateTeachersAndCredentials(updatedTeachers, updatedCreds);
    } else {
      onUpdateTeachers(updatedTeachers);
      onUpdateCredentials(updatedCreds);
    }
    onShowToast(`Kata sandi untuk ${passwordModalTeacher.name} berhasil diperbarui!`, 'success');
    setPasswordModalTeacher(null);
  };

  // Delete Teacher Account
  const handleDeleteTeacherAccount = (teacher: TeacherAccount) => {
    if (teacher.username.toLowerCase() === 'sohibul') {
      onShowToast('Akun Super Admin Utama (Sohibul) tidak dapat dihapus demi keamanan dan integritas sistem CBT!', 'error');
      return;
    }

    if (!isSuperAdmin) {
      onShowToast('Akses Ditolak: Hanya Super Administrator yang berhak menghapus akun guru!', 'error');
      return;
    }

    if (onDeleteTeacher) {
      onDeleteTeacher(teacher);
      return;
    }

    onShowModal({
      title: 'Hapus Akun Guru',
      message: `Apakah Anda yakin ingin menghapus akun guru "${teacher.name}" (${teacher.subject}) dari sistem CBT sekolah? Seluruh data profil dan akses login akan dihapus secara permanen.`,
      type: 'danger',
      confirmLabel: 'Ya, Hapus Akun',
      onConfirm: () => {
        const remaining = teachers.filter((t) => t.username.toLowerCase() !== teacher.username.toLowerCase());
        const updatedCreds = { ...teacherCredentials };
        delete updatedCreds[teacher.username];
        delete updatedCreds[teacher.username.toLowerCase()];
        if (onUpdateTeachersAndCredentials) {
          onUpdateTeachersAndCredentials(remaining, updatedCreds);
        } else {
          onUpdateTeachers(remaining);
          onUpdateCredentials(updatedCreds);
        }
        onShowToast(`Akun guru ${teacher.name} telah berhasil dihapus dari sistem.`, 'info');
      },
    });
  };

  // Add new teacher
  const handleSaveNewTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = newTeacherForm.username.trim().toLowerCase().replace(/\s+/g, '_');
    const cleanName = newTeacherForm.name.trim();

    if (!cleanName || !cleanUsername) {
      onShowToast('Nama guru dan username login wajib diisi!', 'error');
      return;
    }

    if (teachers.some((t) => t.username.toLowerCase() === cleanUsername)) {
      onShowToast(`Username "${cleanUsername}" sudah digunakan oleh guru lain!`, 'error');
      return;
    }

    const finalSub =
      newTeacherForm.subject === 'Lainnya'
        ? newTeacherForm.customSubject.trim() || 'Mata Pelajaran'
        : newTeacherForm.subject;

    const finalMaj =
      newTeacherForm.major === 'Lainnya'
        ? newTeacherForm.customMajor.trim() || 'Umum / Semua Jurusan'
        : newTeacherForm.major;

    const newTeacher: TeacherAccount = {
      id: `tch-${Date.now()}`,
      username: cleanUsername,
      name: cleanName,
      password: newTeacherForm.password,
      subject: finalSub,
      major: finalMaj,
      nip: newTeacherForm.nip.trim() || undefined,
      phone: newTeacherForm.phone.trim() || undefined,
      role: 'guru',
      createdAt: new Date().toISOString().slice(0, 10),
      avatarUrl: newTeacherForm.avatarUrl?.trim() || undefined,
      biodata: {
        email: newTeacherForm.email.trim() || undefined,
        phone: newTeacherForm.phone.trim() || undefined,
        lastEducation: newTeacherForm.lastEducation.trim() || undefined,
        bioNotes: newTeacherForm.bioNotes.trim() || undefined,
        avatarUrl: newTeacherForm.avatarUrl?.trim() || undefined,
      },
      schedules: [],
    };

    const updatedTeachers = [...teachers, newTeacher];
    const updatedCreds = {
      ...teacherCredentials,
      [cleanUsername]: newTeacherForm.password,
    };

    if (onUpdateTeachersAndCredentials) {
      onUpdateTeachersAndCredentials(updatedTeachers, updatedCreds);
    } else {
      onUpdateTeachers(updatedTeachers);
      onUpdateCredentials(updatedCreds);
    }
    onShowToast(`Guru baru ${cleanName} (${finalSub}) berhasil didaftarkan!`, 'success');
    setIsAddTeacherModalOpen(false);
  };

  // Filtered teachers list
  const filteredTeachers = teachers.filter((t) => {
    const matchesCategory =
      selectedCategoryFilter === 'Semua' ||
      (selectedCategoryFilter === 'Umum'
        ? !t.major || t.major.includes('Umum')
        : t.major && !t.major.includes('Umum'));

    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.nip && t.nip.includes(searchQuery)) ||
      (t.biodata?.nuptk && t.biodata.nuptk.includes(searchQuery)) ||
      (t.biodata?.lastEducation && t.biodata.lastEducation.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  // Extract all schedules for the unified schedule view
  const allSchedulesWithTeacher = teachers.flatMap((t) =>
    (t.schedules || []).map((s) => ({
      ...s,
      teacherName: t.name,
      teacherUsername: t.username,
      teacherSubject: t.subject,
      teacherRole: t.role,
      teacherObject: t,
    }))
  );

  const filteredSchedules = allSchedulesWithTeacher.filter((s) => {
    const matchesDay = selectedDayFilter === 'Semua' || s.day === selectedDayFilter;
    const matchesClass = selectedClassFilter === 'Semua' || s.classLevel.includes(selectedClassFilter);
    const matchesSearch =
      s.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.classLevel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.room && s.room.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesDay && matchesClass && matchesSearch;
  });

  // Sort schedules by Day order then start time
  const dayOrder: Record<string, number> = {
    Senin: 1,
    Selasa: 2,
    Rabu: 3,
    Kamis: 4,
    Jumat: 5,
    Sabtu: 6,
  };

  filteredSchedules.sort((a, b) => {
    const dDiff = (dayOrder[a.day] || 99) - (dayOrder[b.day] || 99);
    if (dDiff !== 0) return dDiff;
    return a.startTime.localeCompare(b.startTime);
  });

  return (
    <div className="space-y-6">
      {/* Top Banner: Info Hak Akses & Super User Protection Alert */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-md border border-slate-800 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-semibold mb-2.5 border border-blue-500/30">
              <Shield className="w-3.5 h-3.5" />
              <span>Direktori Terpadu Guru & Jadwal Mengajar Sekolah</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Pusat Data Guru, Biodata & Jadwal Pembelajaran
            </h2>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Memuat profil lengkap dewan guru seluruh mata pelajaran & kejuruan, biodata akademik, kontak, serta jadwal mengajar tatap muka & CBT kelas 7–12.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setIsAddTeacherModalOpen(true)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Daftarkan Guru Baru</span>
              </button>
            )}
          </div>
        </div>

        {/* Security Notice for Super User Password Isolation */}
        <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-amber-300">
            <Lock className="w-4 h-4 shrink-0 text-amber-400" />
            <span>
              <strong>Proteksi Sandi Super User:</strong> Kata sandi akun utama <strong>SOHIBUL UMAM S.Kom</strong> diisolasi ketat. Guru lain tidak dapat melihat atau mengubah password Super Admin.
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            Login Aktif: <strong className="text-white">{currentUser.name}</strong> ({isSuperAdmin ? 'Super Administrator' : 'Guru Pengampu'})
          </div>
        </div>
      </div>

      {/* Sub-Tabs Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto p-1">
          <button
            type="button"
            onClick={() => setSubTab('biodata')}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              subTab === 'biodata'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Biodata & Profil Guru ({teachers.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('jadwal')}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              subTab === 'jadwal'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Jadwal Mengajar Terpadu ({allSchedulesWithTeacher.length} Sesi)</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('keamanan')}
            className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              subTab === 'keamanan'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Akun & Keamanan Kata Sandi</span>
          </button>
        </div>

        {/* Universal Search Box */}
        <div className="relative p-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder={
              subTab === 'jadwal'
                ? 'Cari jadwal guru, kelas, ruang...'
                : 'Cari nama guru, mapel, NIP, pendidikan...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-56 sm:w-68"
          />
        </div>
      </div>

      {/* ==================================================== */}
      {/* SUB-TAB 1: BIODATA & PROFIL GURU */}
      {/* ==================================================== */}
      {subTab === 'biodata' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Filter Kategori:</span>
              {(['Semua', 'Umum', 'Kejuruan'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                    selectedCategoryFilter === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="text-slate-500 text-[11px]">
              Menampilkan <strong>{filteredTeachers.length}</strong> guru terdaftar
            </div>
          </div>

          {/* Teacher Profile Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTeachers.map((teacher) => {
              const isSuper = teacher.username === 'sohibul';
              const bio = teacher.biodata || {};
              const schedules = teacher.schedules || [];
              const initials = teacher.name
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((n) => n[0])
                .join('')
                .toUpperCase();

              return (
                <div
                  key={teacher.username}
                  className={`bg-white rounded-3xl border transition-all duration-200 flex flex-col justify-between shadow-xs hover:shadow-md ${
                    isSuper
                      ? 'border-blue-300 ring-2 ring-blue-500/20'
                      : 'border-slate-200/90'
                  }`}
                >
                  <div className="p-5 space-y-4">
                    {/* Header: Avatar, Name, Subject */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative group shrink-0">
                          {teacher.avatarUrl || teacher.biodata?.avatarUrl ? (
                            <img
                              src={teacher.avatarUrl || teacher.biodata?.avatarUrl}
                              alt={teacher.name}
                              className="w-12 h-12 rounded-2xl object-cover shadow-sm border border-slate-200"
                            />
                          ) : (
                            <div
                              className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-base shadow-sm shrink-0 ${
                                isSuper
                                  ? 'bg-gradient-to-tr from-blue-700 to-indigo-700'
                                  : 'bg-gradient-to-tr from-slate-700 to-slate-900'
                              }`}
                            >
                              {initials || 'GR'}
                            </div>
                          )}

                          {/* Quick Change Avatar button */}
                          {(isSuperAdmin || currentUser.username === teacher.username) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAvatarTargetTeacher(teacher);
                              }}
                              title="Ubah Foto Profil (Upload dari Komputer / Link Online)"
                              className="absolute -bottom-1 -right-1 p-1 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-full border border-slate-200 shadow-sm transition-transform hover:scale-110 cursor-pointer"
                            >
                              <Camera className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 text-sm leading-snug truncate">
                            {teacher.name}
                          </h3>
                          <div className="text-[11px] text-blue-700 font-semibold mt-0.5 truncate">
                            {teacher.subject}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            @{teacher.username} {teacher.nip ? `• NIP: ${teacher.nip}` : ''}
                          </div>
                        </div>
                      </div>

                      {isSuper ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200 shrink-0">
                          Super Admin
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 shrink-0">
                          {teacher.major?.includes('Umum') ? 'Umum' : 'Kejuruan'}
                        </span>
                      )}
                    </div>

                    {/* Key Biodata Facts */}
                    <div className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-100 space-y-2 text-xs">
                      {bio.nuptk && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">NUPTK:</span>
                          <span className="font-mono font-semibold text-slate-800">{bio.nuptk}</span>
                        </div>
                      )}

                      {bio.lastEducation && (
                        <div className="flex items-start gap-2 text-[11px] text-slate-700">
                          <GraduationCap className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{bio.lastEducation}</span>
                        </div>
                      )}

                      {bio.phone && (
                        <div className="flex items-center gap-2 text-[11px] text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{bio.phone}</span>
                        </div>
                      )}

                      {bio.email && (
                        <div className="flex items-center gap-2 text-[11px] text-slate-700">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{bio.email}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                        <span className="text-slate-500">Beban Mengajar:</span>
                        <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {schedules.length} Sesi / Minggu
                        </span>
                      </div>
                    </div>

                    {/* Brief Bio Notes */}
                    {bio.bioNotes && (
                      <p className="text-[11px] text-slate-600 line-clamp-2 italic leading-relaxed">
                        &ldquo;{bio.bioNotes}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="p-3 bg-slate-50/50 rounded-b-3xl border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleOpenBiodataDetail(teacher)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span>Biodata Lengkap</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenScheduleModal(teacher)}
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-xl transition-colors flex items-center gap-1 cursor-pointer text-[11px]"
                        title="Atur jadwal mengajar guru ini"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Jadwal</span>
                      </button>

                      {(isSuperAdmin || currentUser.username === teacher.username) && (
                        <>
                          <button
                            type="button"
                            onClick={() => setAvatarTargetTeacher(teacher)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Ubah Foto Profil Guru (Upload dari Komputer / Link Online)"
                          >
                            <Camera className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditBiodata(teacher)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Biodata & Profil"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {/* Tombol Hapus Akun Guru */}
                      {isSuperAdmin && !isSuper && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTeacherAccount(teacher)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title={`Hapus Akun Guru ${teacher.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUB-TAB 2: JADWAL MENGAJAR TERPADU */}
      {/* ==================================================== */}
      {subTab === 'jadwal' && (
        <div className="space-y-4">
          {/* Controls Bar for Teaching Schedule */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-700">Hari:</span>
              {['Semua', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDayFilter(day)}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
                    selectedDayFilter === day
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {day}
                </button>
              ))}

              <div className="h-4 w-[1px] bg-slate-300 mx-1 hidden sm:block"></div>

              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
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

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Cetak Jadwal</span>
              </button>
            </div>
          </div>

          {/* Timetable Matrix */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5 w-24">Hari</th>
                    <th className="px-5 py-3.5 w-32">Jam Pelajaran</th>
                    <th className="px-5 py-3.5">Mata Pelajaran & Kelas</th>
                    <th className="px-5 py-3.5">Guru Pengampu</th>
                    <th className="px-5 py-3.5">Ruangan / Lab</th>
                    <th className="px-5 py-3.5">Keterangan / Materi</th>
                    <th className="px-5 py-3.5 text-right w-24">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSchedules.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 align-top">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 inline-block">
                          {item.day}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 align-top font-mono font-bold text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.startTime} - {item.endTime}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        <div className="font-bold text-slate-900 text-sm">
                          {item.subject || item.teacherSubject}
                        </div>
                        <div className="inline-block mt-0.5 px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-semibold">
                          {item.classLevel}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        <div className="font-semibold text-slate-900">{item.teacherName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">@{item.teacherUsername}</div>
                      </td>
                      <td className="px-5 py-3.5 align-top">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>{item.room || 'Ruang Kelas'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 align-top text-slate-500 italic">
                        {item.notes || '-'}
                      </td>
                      <td className="px-5 py-3.5 text-right align-top whitespace-nowrap">
                        {(isSuperAdmin || currentUser.username === item.teacherUsername) ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenScheduleModal(item.teacherObject, item)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit Jadwal"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSchedule(item.teacherObject, item.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Jadwal"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Terjadwal</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredSchedules.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-xs">
                Tidak ada jadwal mengajar yang sesuai dengan filter pencarian.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUB-TAB 3: AKUN & KEAMANAN PASSWORD GURU */}
      {/* ==================================================== */}
      {subTab === 'keamanan' && (
        <div className="space-y-4">
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-4.5 h-4.5 text-blue-600" />
              <span>Sistem Proteksi Akses & Manajemen Kata Sandi Guru</span>
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Super Admin <strong>SOHIBUL UMAM S.Kom</strong> memiliki privasi penuh atas kredensial akun utamanya. Guru lain yang masuk ke sistem tidak dapat mengakses, melihat, ataupun mereset kata sandi Super Admin.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {teachers.map((teacher) => {
              const isSuper = teacher.username.toLowerCase() === 'sohibul';
              const currentPass = teacherCredentials[teacher.username] || 'password123';
              const isPasswordVisible = Boolean(showPasswordMap[teacher.username]);

              // SECURITY RULE IMPLEMENTATION:
              // - If target is Sohibul: STRICTLY ONLY Sohibul himself (isSohibul) can view or edit!
              // - If target is other teacher: Sohibul or the teacher himself can view or edit!
              const canViewAndEdit =
                isSuper
                  ? isSohibul // STRICTLY ONLY SOHIBUL CAN SEE/EDIT SOHIBUL'S PASSWORD!
                  : isSohibul || currentUser.username.toLowerCase() === teacher.username.toLowerCase();

              return (
                <div
                  key={teacher.username}
                  className={`bg-white rounded-3xl border p-5 shadow-xs flex flex-col justify-between ${
                    isSuper
                      ? 'border-blue-400 ring-2 ring-blue-500/20 bg-blue-50/20'
                      : 'border-slate-200/90'
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm leading-snug">
                            {teacher.name}
                          </h4>
                          {isSuper && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-600 text-white">
                              Super Admin
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          @{teacher.username} {teacher.nip ? `• NIP: ${teacher.nip}` : ''}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 mb-4 space-y-1">
                      <div>Mata Pelajaran: <strong>{teacher.subject}</strong></div>
                      <div>Jurusan: <strong>{teacher.major || 'Umum'}</strong></div>
                    </div>

                    {/* PASSWORD DISPLAY BOX */}
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-slate-500" />
                          <span>Kata Sandi Akun:</span>
                        </span>

                        {canViewAndEdit && (
                          <button
                            type="button"
                            onClick={() => handleOpenPasswordModal(teacher)}
                            className="text-blue-600 hover:text-blue-800 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <Key className="w-3 h-3" />
                            <span>Ubah Sandi</span>
                          </button>
                        )}
                      </div>

                      {canViewAndEdit ? (
                        <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-slate-200">
                          <span className="font-mono font-bold text-slate-900 tracking-wider">
                            {isPasswordVisible ? currentPass : '••••••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(teacher.username)}
                            className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                            title={isPasswordVisible ? 'Sembunyikan' : 'Tampilkan sandi'}
                          >
                            {isPasswordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-amber-800">
                            <Shield className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>{isSuper ? 'Dirahasiakan (Super User)' : 'Terkunci'}</span>
                          </div>
                          <p className="text-[10px] text-amber-700 leading-relaxed">
                            {isSuper
                              ? 'Password Super User hanya dapat dilihat dan diubah di panel Pak Sohibul. Guru lain tidak dapat melihat atau mengubah password Super User.'
                              : 'Password akun ini terproteksi. Hanya pemilik akun atau Super Admin yang dapat mengelola sandi ini.'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 mt-4 text-xs">
                    <button
                      type="button"
                      onClick={() => onCreateExamForTeacher(teacher)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Buat Ujian</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenBiodataDetail(teacher)}
                        className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-colors cursor-pointer"
                      >
                        Lihat Profil
                      </button>

                      {isSuperAdmin && !isSuper && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTeacherAccount(teacher)}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                          title={`Hapus Akun Guru ${teacher.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span className="hidden sm:inline">Hapus</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: DETAIL & CETAK BIODATA LENGKAP GURU */}
      {/* ==================================================== */}
      {viewingBiodataTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 border border-slate-100 my-8 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xl shadow-md">
                  {viewingBiodataTeacher.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Biodata Lengkap Pendidik & Tenaga Kependidikan
                  </h3>
                  <p className="text-xs text-slate-500">
                    {viewingBiodataTeacher.name} • {viewingBiodataTeacher.subject}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingBiodataTeacher(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content to Print / View */}
            <div className="space-y-6 text-xs text-slate-800">
              {/* Profile Photo & Identity Banner */}
              <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-3xl p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4 shadow-sm">
                <div className="relative shrink-0">
                  {viewingBiodataTeacher.avatarUrl || viewingBiodataTeacher.biodata?.avatarUrl ? (
                    <img
                      src={viewingBiodataTeacher.avatarUrl || viewingBiodataTeacher.biodata?.avatarUrl}
                      alt={viewingBiodataTeacher.name}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-white/80 shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-white/10 border-2 border-white/40 flex items-center justify-center text-white font-black text-2xl shadow-md">
                      {viewingBiodataTeacher.name
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase() || 'GR'}
                    </div>
                  )}
                  {(isSuperAdmin || currentUser.username === viewingBiodataTeacher.username) && (
                    <button
                      type="button"
                      onClick={() => setAvatarTargetTeacher(viewingBiodataTeacher)}
                      title="Ubah Foto Profil Guru"
                      className="absolute -bottom-1 -right-1 p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full border-2 border-white shadow-md cursor-pointer transition-transform hover:scale-110"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                    <h3 className="text-lg font-bold text-white">{viewingBiodataTeacher.name}</h3>
                    {viewingBiodataTeacher.username === 'sohibul' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                        Super Administrator
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-blue-200 font-semibold">{viewingBiodataTeacher.subject}</p>
                  <p className="text-[11px] text-slate-300 font-mono mt-0.5">
                    @{viewingBiodataTeacher.username} • {viewingBiodataTeacher.major || 'Semua Jurusan'}
                  </p>

                  {(isSuperAdmin || currentUser.username === viewingBiodataTeacher.username) && (
                    <div className="mt-3 flex items-center justify-center sm:justify-start gap-2">
                      <button
                        type="button"
                        onClick={() => setAvatarTargetTeacher(viewingBiodataTeacher)}
                        className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Ubah Foto Profil (Komputer / Online)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Profile Card */}
              <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <span className="text-[11px] text-slate-500 block">Nama Lengkap & Gelar:</span>
                  <strong className="text-sm text-slate-900">{viewingBiodataTeacher.name}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Mata Pelajaran yang Diampu:</span>
                  <strong className="text-sm text-blue-700">{viewingBiodataTeacher.subject}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">NIP (Nomor Induk Pegawai):</span>
                  <span className="font-mono font-semibold">{viewingBiodataTeacher.nip || '-'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">NUPTK:</span>
                  <span className="font-mono font-semibold">{viewingBiodataTeacher.biodata?.nuptk || '-'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Jurusan / Konsentrasi:</span>
                  <span>{viewingBiodataTeacher.major || 'Umum'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Jenis Kelamin:</span>
                  <span>{viewingBiodataTeacher.biodata?.gender || '-'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Tempat, Tanggal Lahir:</span>
                  <span>{viewingBiodataTeacher.biodata?.birthPlaceDate || '-'}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Pendidikan Terakhir:</span>
                  <strong className="text-slate-900">{viewingBiodataTeacher.biodata?.lastEducation || '-'}</strong>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">No. Telepon / WhatsApp:</span>
                  <span className="font-mono font-semibold text-emerald-700">
                    {viewingBiodataTeacher.phone || viewingBiodataTeacher.biodata?.phone || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Email Resmi:</span>
                  <span className="text-blue-600">{viewingBiodataTeacher.biodata?.email || '-'}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[11px] text-slate-500 block">Alamat Domisili:</span>
                  <span>{viewingBiodataTeacher.biodata?.address || '-'}</span>
                </div>
              </div>

              {/* Catatan Tambahan / Profil Pengampu */}
              {viewingBiodataTeacher.biodata?.bioNotes && (
                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl">
                  <span className="font-bold text-blue-900 block mb-1">Catatan Pengampu & Tugas Tambahan:</span>
                  <p className="text-xs text-blue-950 leading-relaxed">
                    {viewingBiodataTeacher.biodata.bioNotes}
                  </p>
                </div>
              )}

              {/* Jadwal Mengajar Guru Ini */}
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>Jadwal Mengajar Mingguan ({viewingBiodataTeacher.schedules?.length || 0} Sesi)</span>
                </h4>
                {viewingBiodataTeacher.schedules && viewingBiodataTeacher.schedules.length > 0 ? (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 font-bold text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5">Hari</th>
                          <th className="px-4 py-2.5">Waktu</th>
                          <th className="px-4 py-2.5">Kelas</th>
                          <th className="px-4 py-2.5">Ruangan</th>
                          <th className="px-4 py-2.5">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {viewingBiodataTeacher.schedules.map((sch) => (
                          <tr key={sch.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 font-bold text-blue-700">{sch.day}</td>
                            <td className="px-4 py-2.5 font-mono text-slate-700">{sch.startTime} - {sch.endTime}</td>
                            <td className="px-4 py-2.5 font-semibold text-slate-900">{sch.classLevel}</td>
                            <td className="px-4 py-2.5 text-slate-600">{sch.room || '-'}</td>
                            <td className="px-4 py-2.5 text-slate-500 italic">{sch.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-2xl text-center text-slate-400">
                    Belum ada jadwal mengajar yang diinput untuk guru ini.
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-100 mt-6">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span>Cetak Lembar Biodata</span>
                </button>

                {isSuperAdmin && viewingBiodataTeacher.username.toLowerCase() !== 'sohibul' && (
                  <button
                    type="button"
                    onClick={() => {
                      const t = viewingBiodataTeacher;
                      setViewingBiodataTeacher(null);
                      handleDeleteTeacherAccount(t);
                    }}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Hapus Akun Guru</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setViewingBiodataTeacher(null)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: EDIT BIODATA GURU */}
      {/* ==================================================== */}
      {editingBiodataTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-7 border border-slate-100 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Biodata & Profil Guru</h3>
                  <p className="text-xs text-slate-500">{editingBiodataTeacher.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingBiodataTeacher(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBiodataSubmit} className="space-y-3.5 text-xs">
              {/* Foto Profil Guru Section */}
              <div className="p-3.5 bg-gradient-to-r from-blue-50/70 to-slate-50 rounded-2xl border border-blue-100/80">
                <label className="block font-bold text-slate-800 mb-2">Foto Profil Guru (Komputer / Online)</label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5">
                  <div className="relative group shrink-0">
                    {biodataForm.avatarUrl ? (
                      <img
                        src={biodataForm.avatarUrl}
                        alt={biodataForm.name}
                        className="w-16 h-16 rounded-2xl object-cover ring-2 ring-blue-500/30 shadow-md bg-white"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-md ring-2 ring-blue-500/30">
                        {biodataForm.name ? biodataForm.name.charAt(0).toUpperCase() : 'G'}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => editBioFileInputRef.current?.click()}
                      className="absolute -bottom-1.5 -right-1.5 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow cursor-pointer transition-transform group-hover:scale-110"
                      title="Pilih Berkas Foto dari Komputer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <input
                      ref={editBioFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleEditBioFileChange}
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => editBioFileInputRef.current?.click()}
                        className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-slate-700 rounded-xl font-medium flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-blue-600" />
                        <span>Upload Komputer / HP</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (editingBiodataTeacher) {
                            setAvatarTargetTeacher(editingBiodataTeacher);
                          }
                        }}
                        className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-purple-400 hover:bg-purple-50/50 text-slate-700 rounded-xl font-medium flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                        <span>Buka Galeri / Preset</span>
                      </button>

                      {biodataForm.avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setBiodataForm((prev) => ({ ...prev, avatarUrl: '' }))}
                          className="px-2 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl font-medium transition-colors cursor-pointer"
                        >
                          Hapus Foto
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <input
                        type="url"
                        value={biodataForm.avatarUrl || ''}
                        onChange={(e) => setBiodataForm({ ...biodataForm, avatarUrl: e.target.value })}
                        placeholder="Atau tempel link gambar online (https://...)"
                        className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      />
                      <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar</label>
                  <input
                    type="text"
                    required
                    value={biodataForm.name}
                    onChange={(e) => setBiodataForm({ ...biodataForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mata Pelajaran</label>
                  <input
                    type="text"
                    required
                    value={biodataForm.subject}
                    onChange={(e) => setBiodataForm({ ...biodataForm, subject: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NIP (Nomor Induk Pegawai)</label>
                  <input
                    type="text"
                    value={biodataForm.nip}
                    onChange={(e) => setBiodataForm({ ...biodataForm, nip: e.target.value })}
                    placeholder="19880415..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NUPTK</label>
                  <input
                    type="text"
                    value={biodataForm.nuptk}
                    onChange={(e) => setBiodataForm({ ...biodataForm, nuptk: e.target.value })}
                    placeholder="16 digit NUPTK"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">No. WhatsApp / Telepon</label>
                  <input
                    type="text"
                    value={biodataForm.phone}
                    onChange={(e) => setBiodataForm({ ...biodataForm, phone: e.target.value })}
                    placeholder="081234567890"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Resmi</label>
                  <input
                    type="email"
                    value={biodataForm.email}
                    onChange={(e) => setBiodataForm({ ...biodataForm, email: e.target.value })}
                    placeholder="nama.guru@sekolah.sch.id"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={biodataForm.gender}
                    onChange={(e) => setBiodataForm({ ...biodataForm, gender: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tempat, Tanggal Lahir</label>
                  <input
                    type="text"
                    value={biodataForm.birthPlaceDate}
                    onChange={(e) => setBiodataForm({ ...biodataForm, birthPlaceDate: e.target.value })}
                    placeholder="Contoh: Surabaya, 15 April 1988"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pendidikan Terakhir & Kampus</label>
                <input
                  type="text"
                  value={biodataForm.lastEducation}
                  onChange={(e) => setBiodataForm({ ...biodataForm, lastEducation: e.target.value })}
                  placeholder="Contoh: S1 Pendidikan Informatika / Ilmu Komputer"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alamat Domisili</label>
                <input
                  type="text"
                  value={biodataForm.address}
                  onChange={(e) => setBiodataForm({ ...biodataForm, address: e.target.value })}
                  placeholder="Alamat tempat tinggal..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Catatan Biodata / Tugas Tambahan</label>
                <textarea
                  rows={3}
                  value={biodataForm.bioNotes}
                  onChange={(e) => setBiodataForm({ ...biodataForm, bioNotes: e.target.value })}
                  placeholder="Tugas tambahan (cth: Kepala Lab, Pembina Ekskul, Koordinator CBT)..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingBiodataTeacher(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Biodata</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: TAMBAH / EDIT JADWAL MENGAJAR */}
      {/* ==================================================== */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {scheduleEditingId ? 'Edit Jadwal Mengajar' : 'Tambah Jadwal Mengajar'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {teachers.find((t) => t.id === scheduleTargetTeacherId || t.username === scheduleTargetTeacherId)?.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveScheduleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hari Pelaksanaan</label>
                <select
                  value={scheduleForm.day}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, day: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Senin">Senin</option>
                  <option value="Selasa">Selasa</option>
                  <option value="Rabu">Rabu</option>
                  <option value="Kamis">Kamis</option>
                  <option value="Jumat">Jumat</option>
                  <option value="Sabtu">Sabtu</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    required
                    value={scheduleForm.startTime}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    required
                    value={scheduleForm.endTime}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kelas / Rombel</label>
                  <input
                    type="text"
                    required
                    value={scheduleForm.classLevel}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, classLevel: e.target.value })}
                    placeholder="Contoh: Kelas 7A / Kelas 10 RPL"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ruangan / Lab</label>
                  <input
                    type="text"
                    value={scheduleForm.room}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, room: e.target.value })}
                    placeholder="Contoh: Lab Komputer 1 / Ruang 7A"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Topik / Catatan Materi</label>
                <input
                  type="text"
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                  placeholder="Contoh: Berpikir Komputasional / Praktik Coding"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Jadwal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: UBAH KATA SANDI GURU */}
      {/* ==================================================== */}
      {passwordModalTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-slate-100 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Ubah Kata Sandi Akun</h3>
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

            {passwordModalTeacher.username === 'sohibul' && (
              <div className="mb-3.5 p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
                <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Anda sedang mengubah kata sandi akun <strong>Super Admin Utama (Pak Sohibul)</strong>. Harap jaga kerahasiaannya dengan baik.
                </span>
              </div>
            )}

            <form onSubmit={handleSavePasswordSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Kata Sandi Baru untuk Akun Ini
                </label>
                <input
                  type="text"
                  required
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
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
                      onClick={() => setNewPasswordInput(preset)}
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

      {/* ==================================================== */}
      {/* MODAL: DAFTARKAN GURU BARU */}
      {/* ==================================================== */}
      {isAddTeacherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Daftarkan Guru Baru</h3>
                  <p className="text-xs text-slate-500">Registrasi akun pengampu mapel & jadwal mengajar</p>
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

            <form onSubmit={handleSaveNewTeacherSubmit} className="space-y-3.5 text-xs">
              {/* Foto Profil Guru (Komputer / Online) */}
              <div className="p-3 bg-gradient-to-r from-blue-50/70 to-slate-50 rounded-2xl border border-blue-100/80">
                <label className="block font-bold text-slate-800 mb-2">Foto Profil Guru (Opsional)</label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="relative group shrink-0">
                    {newTeacherForm.avatarUrl ? (
                      <img
                        src={newTeacherForm.avatarUrl}
                        alt="Preview"
                        className="w-14 h-14 rounded-2xl object-cover ring-2 ring-blue-500/30 shadow-md bg-white"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-lg flex items-center justify-center shadow-md ring-2 ring-blue-500/30">
                        {newTeacherForm.name ? newTeacherForm.name.charAt(0).toUpperCase() : <Camera className="w-5 h-5 text-white/80" />}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => newTeacherFileInputRef.current?.click()}
                      className="absolute -bottom-1 -right-1 p-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow cursor-pointer transition-transform group-hover:scale-110"
                      title="Upload Berkas dari Komputer"
                    >
                      <Camera className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <input
                      ref={newTeacherFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleNewTeacherFileChange}
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => newTeacherFileInputRef.current?.click()}
                        className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-slate-700 rounded-xl font-medium flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5 text-blue-600" />
                        <span>Upload dari Komputer / HP</span>
                      </button>

                      {newTeacherForm.avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setNewTeacherForm((prev) => ({ ...prev, avatarUrl: '' }))}
                          className="px-2 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl font-medium transition-colors cursor-pointer"
                        >
                          Hapus Foto
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <input
                        type="url"
                        value={newTeacherForm.avatarUrl || ''}
                        onChange={(e) => setNewTeacherForm({ ...newTeacherForm, avatarUrl: e.target.value })}
                        placeholder="Atau tempel link gambar online (https://...)"
                        className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      />
                      <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Lengkap Guru & Gelar
                </label>
                <input
                  type="text"
                  required
                  value={newTeacherForm.name}
                  onChange={(e) => setNewTeacherForm({ ...newTeacherForm, name: e.target.value })}
                  placeholder="Contoh: Muhammad Ilham S.Pd"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Username Login (NIP / Singkatan)</label>
                  <input
                    type="text"
                    required
                    value={newTeacherForm.username}
                    onChange={(e) => setNewTeacherForm({ ...newTeacherForm, username: e.target.value })}
                    placeholder="guru_ilham"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kata Sandi Awal</label>
                  <input
                    type="text"
                    required
                    value={newTeacherForm.password}
                    onChange={(e) => setNewTeacherForm({ ...newTeacherForm, password: e.target.value })}
                    placeholder="password123"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mata Pelajaran yang Diampu</label>
                <select
                  value={newTeacherForm.subject}
                  onChange={(e) => setNewTeacherForm({ ...newTeacherForm, subject: e.target.value })}
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
                {newTeacherForm.subject === 'Lainnya' && (
                  <input
                    type="text"
                    required
                    value={newTeacherForm.customSubject}
                    onChange={(e) => setNewTeacherForm({ ...newTeacherForm, customSubject: e.target.value })}
                    placeholder="Ketik mata pelajaran..."
                    className="w-full mt-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NIP (Opsional)</label>
                  <input
                    type="text"
                    value={newTeacherForm.nip}
                    onChange={(e) => setNewTeacherForm({ ...newTeacherForm, nip: e.target.value })}
                    placeholder="1990..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">No. WhatsApp / HP</label>
                  <input
                    type="text"
                    value={newTeacherForm.phone}
                    onChange={(e) => setNewTeacherForm({ ...newTeacherForm, phone: e.target.value })}
                    placeholder="0812..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Pendidikan Terakhir & Kampus</label>
                <input
                  type="text"
                  value={newTeacherForm.lastEducation}
                  onChange={(e) => setNewTeacherForm({ ...newTeacherForm, lastEducation: e.target.value })}
                  placeholder="Contoh: S1 Pendidikan Bahasa Inggris - Universitas Negeri Surabaya"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Daftarkan Guru</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL: UBAH FOTO PROFIL GURU (KOMPUTER & ONLINE) */}
      {/* ==================================================== */}
      <ChangeAvatarModal
        isOpen={Boolean(avatarTargetTeacher)}
        teacher={avatarTargetTeacher}
        onClose={() => setAvatarTargetTeacher(null)}
        onSaveAvatar={handleSaveTeacherAvatar}
        onShowToast={onShowToast}
      />
    </div>
  );
};
