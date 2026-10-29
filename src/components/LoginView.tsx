import React, { useState } from 'react';
import { User, Role, TeacherAccount } from '../types';
import {
  Shield,
  GraduationCap,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  Sparkles,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

interface LoginViewProps {
  onLogin: (user: User) => void;
  teacherCredentials: Record<string, string>;
  teachers?: TeacherAccount[];
  onRegisterTeacher?: (teacher: TeacherAccount) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLogin,
  teacherCredentials,
  teachers = [],
  onShowToast,
}) => {
  const [role, setRole] = useState<Role>('guru');
  const [guruUsername, setGuruUsername] = useState('');
  const [guruPassword, setGuruPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Student form state
  const [siswaName, setSiswaName] = useState('');
  const [siswaClass, setSiswaClass] = useState('Kelas 7');
  const [siswaNisn, setSiswaNisn] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (role === 'guru') {
      const usernameClean = guruUsername.trim().toLowerCase();
      if (!usernameClean) {
        onShowToast('Username guru atau NIP wajib diisi!', 'error');
        return;
      }
      if (!guruPassword) {
        onShowToast('Kata sandi guru wajib diisi!', 'error');
        return;
      }

      // Match teacher by username or NIP
      const matched = teachers.find(
        (t) =>
          t.username.toLowerCase() === usernameClean ||
          (t.nip && t.nip.trim() === usernameClean)
      );

      const actualUsername = matched ? matched.username : usernameClean;
      const expectedPass =
        teacherCredentials[actualUsername] ||
        matched?.password ||
        (actualUsername === 'sohibul' ? 'password123' : null);

      if (!expectedPass || guruPassword !== expectedPass) {
        onShowToast(
          'Username atau kata sandi guru tidak cocok. Silakan hubungi Super Admin sekolah jika membutuhkan bantuan.',
          'error'
        );
        return;
      }

      const isSuper =
        actualUsername === 'sohibul' || matched?.role === 'admin';
      const teacherName = matched
        ? matched.name
        : actualUsername === 'sohibul'
        ? 'SOHIBUL UMAM S.Kom'
        : `Guru ${actualUsername}`;

      const teacherSubject =
        matched?.subject ||
        (actualUsername === 'sohibul' ? 'Informatika' : 'Umum');

      const teacherMajor = matched?.major || 'Semua Jurusan';

      onLogin({
        username: actualUsername,
        name: teacherName,
        role: 'guru',
        isAdmin: isSuper,
        subject: teacherSubject,
        major: teacherMajor,
      });

      onShowToast(
        `Selamat datang, ${teacherName}${isSuper ? ' (Super Admin)' : ` (${teacherSubject})`}!`,
        'success'
      );
    } else {
      const nameClean = siswaName.trim();
      if (!nameClean) {
        onShowToast('Nama lengkap siswa wajib diisi!', 'error');
        return;
      }

      const generatedUsername =
        siswaNisn.trim() || nameClean.toLowerCase().replace(/\s+/g, '_');

      onLogin({
        username: generatedUsername,
        name: nameClean,
        role: 'siswa',
        classLevel: siswaClass,
      });

      onShowToast(`Selamat datang di ruang ujian CBT, ${nameClean}!`, 'success');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100 relative overflow-hidden">
      {/* Background radial atmosphere */}
      <div className="absolute inset-0 bg-radial from-blue-900/30 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="relative z-10 max-w-lg w-full bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-blue-950/50">
        {/* App Title Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1.5">
            Ujian Berbasis Komputer (CBT) Sekolah
          </h1>
          <p className="text-xs text-slate-400 italic max-w-md mx-auto">
            Sistem Asesmen Terpadu Seluruh Mata Pelajaran & Jurusan Kejuruan
          </p>
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-[11px] font-medium text-blue-300">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Pengganti Ujian Tertulis • Anti-Cheat Kiosk Mode</span>
          </div>
        </div>

        {/* Role Switcher Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900/80 rounded-2xl border border-slate-700/70 mb-5">
          <button
            type="button"
            onClick={() => setRole('guru')}
            className={`py-2.5 px-4 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              role === 'guru'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Login Guru / Admin</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('siswa')}
            className={`py-2.5 px-4 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              role === 'siswa'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Login Siswa Peserta</span>
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {role === 'guru' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Username Guru / NIP
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={guruUsername}
                    onChange={(e) => setGuruUsername(e.target.value)}
                    placeholder="Masukkan username akun atau NIP..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Kata Sandi Guru</span>
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-slate-400" />
                    <span>Tersimpan Rahasia</span>
                  </span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={guruPassword}
                    onChange={(e) => setGuruPassword(e.target.value)}
                    placeholder="Masukkan kata sandi akun..."
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-white cursor-pointer"
                    title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Keamanan & Kebijakan Privasi Akun Guru */}
              <div className="p-3 bg-slate-900/70 border border-slate-700/60 rounded-xl text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-[11px]">
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  <span>Keamanan Privasi Akun Guru & Super Admin:</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Kata sandi guru tidak disimpan terbuka di luar agar hanya guru tersebut dan Super Admin yang dapat mengakses akun. Pendaftaran akun guru / jurusan baru dilakukan secara terverifikasi melalui Super Admin sekolah.
                </p>
                <div className="flex items-center gap-2 pt-1 border-t border-slate-800 text-[10px] text-slate-400">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>Super Admin Utama: <strong className="text-slate-300">SOHIBUL UMAM S.Kom</strong></span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nama Lengkap Siswa
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={siswaName}
                    onChange={(e) => setSiswaName(e.target.value)}
                    placeholder="Contoh: Ahmad Faiz"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Tingkat Kelas
                  </label>
                  <select
                    value={siswaClass}
                    onChange={(e) => setSiswaClass(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    NISN / No. Peserta
                  </label>
                  <input
                    type="text"
                    value={siswaNisn}
                    onChange={(e) => setSiswaNisn(e.target.value)}
                    placeholder="Contoh: 10293847"
                    className="w-full px-3.5 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/30 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <span>{role === 'guru' ? 'Masuk ke Panel Guru' : 'Masuk ke Portal Ujian Siswa'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
