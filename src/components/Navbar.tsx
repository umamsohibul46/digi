import React from 'react';
import { User } from '../types';
import { LogOut, Laptop } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  onLogout: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  activeTab,
  onTabChange,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element Brand wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
            <Laptop className="w-5 h-5" />
          </div>
          <div className="whitespace-nowrap">
            <span className="text-base font-bold tracking-tight text-slate-900 block leading-tight">
              CBT Mandiri Sekolah
            </span>
            <span className="text-[11px] text-slate-500 font-medium block truncate max-w-[220px]">
              {currentUser?.role === 'guru' && currentUser?.subject
                ? `${currentUser.name} • ${currentUser.subject}`
                : 'Ujian Berbasis Komputer Antar-Mapel & Jurusan'}
            </span>
          </div>
        </div>

        {/* Zone 2: Nav links or active role context */}
        <nav className="hidden md:flex items-center gap-5 text-xs font-semibold text-slate-600">
          {currentUser?.role === 'guru' && onTabChange ? (
            <>
              <button
                onClick={() => onTabChange('exams')}
                className={`transition-colors whitespace-nowrap hover:text-blue-600 cursor-pointer ${
                  activeTab === 'exams' ? 'text-blue-600 font-bold' : ''
                }`}
              >
                Manajemen Ujian
              </button>
              <button
                onClick={() => onTabChange('bank')}
                className={`transition-colors whitespace-nowrap hover:text-blue-600 cursor-pointer ${
                  activeTab === 'bank' ? 'text-blue-600 font-bold' : ''
                }`}
              >
                Bank Soal
              </button>
              <button
                onClick={() => onTabChange('results')}
                className={`transition-colors whitespace-nowrap hover:text-blue-600 cursor-pointer ${
                  activeTab === 'results' ? 'text-blue-600 font-bold' : ''
                }`}
              >
                Rekapitulasi Nilai
              </button>
              <button
                onClick={() => onTabChange('teachers')}
                className={`transition-colors whitespace-nowrap hover:text-blue-600 cursor-pointer ${
                  activeTab === 'teachers' ? 'text-blue-600 font-bold' : ''
                }`}
              >
                Guru, Biodata & Jadwal
              </button>
              <button
                onClick={() => onTabChange('audit')}
                className={`transition-colors whitespace-nowrap hover:text-blue-600 cursor-pointer ${
                  activeTab === 'audit' ? 'text-blue-600 font-bold' : ''
                }`}
              >
                Audit Pelanggaran
              </button>
            </>
          ) : (
            <span className="text-slate-500">
              Sistem Asesmen Berbasis Komputer Kelas 7 – 12 (Semua Jurusan)
            </span>
          )}
        </nav>

        {/* Zone 3: Single primary action / User profile & Logout */}
        <div className="flex items-center gap-3 shrink-0">
          {currentUser && (
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-9 h-9 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-700 flex items-center justify-center text-white font-bold text-xs shadow-2xs shrink-0">
                  {currentUser.name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase() || 'U'}
                </div>
              )}
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {currentUser.name}
                </div>
                <div className="text-[11px] text-slate-500 capitalize">
                  {currentUser.role === 'guru'
                    ? (currentUser.subject || 'Guru Pengampu')
                    : (currentUser.classLevel || 'Siswa')}
                </div>
              </div>
              <button
                onClick={onLogout}
                title="Keluar Sesi"
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
