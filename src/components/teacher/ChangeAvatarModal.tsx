import React, { useState, useRef, useEffect } from 'react';
import { TeacherAccount } from '../../types';
import {
  X,
  Upload,
  Link as LinkIcon,
  Check,
  Trash2,
  Camera,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Eye,
} from 'lucide-react';
import {
  compressImageFile,
  testOnlineImageUrl,
  PRESET_TEACHER_AVATARS,
  PresetAvatarOption,
} from '../../utils/imageUtils';

interface ChangeAvatarModalProps {
  isOpen: boolean;
  teacher: TeacherAccount | null;
  onClose: () => void;
  onSaveAvatar: (teacherUsername: string, newAvatarUrl: string | undefined) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const ChangeAvatarModal: React.FC<ChangeAvatarModalProps> = ({
  isOpen,
  teacher,
  onClose,
  onSaveAvatar,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'online' | 'preset'>('upload');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [onlineUrlInput, setOnlineUrlInput] = useState<string>('');
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [isUrlValid, setIsUrlValid] = useState<boolean | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (teacher) {
      const current = teacher.avatarUrl || teacher.biodata?.avatarUrl || '';
      setPreviewUrl(current);
      setOnlineUrlInput(current.startsWith('http') ? current : '');
      setIsUrlValid(current.startsWith('http') ? true : null);
      setSelectedFileName('');
    }
  }, [teacher, isOpen]);

  if (!isOpen || !teacher) return null;

  const initials = teacher.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowToast('Silakan pilih berkas gambar yang valid (JPG, PNG, atau WEBP).', 'error');
      return;
    }

    try {
      setIsProcessingFile(true);
      setSelectedFileName(`${file.name} (${Math.round(file.size / 1024)} KB)`);
      const compressedBase64 = await compressImageFile(file, 400, 0.85);
      setPreviewUrl(compressedBase64);
      onShowToast(`Foto "${file.name}" berhasil dimuat & dioptimalkan!`, 'success');
    } catch (err: any) {
      console.error('Error compressing image:', err);
      onShowToast(err?.message || 'Gagal memproses gambar.', 'error');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleTestOnlineUrl = async () => {
    const trimmed = onlineUrlInput.trim();
    if (!trimmed) {
      onShowToast('Masukkan alamat URL gambar online terlebih dahulu.', 'warning');
      return;
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      onShowToast('URL harus diawali dengan http:// atau https://', 'warning');
      return;
    }

    setIsTestingUrl(true);
    const valid = await testOnlineImageUrl(trimmed);
    setIsTestingUrl(false);
    setIsUrlValid(valid);

    if (valid) {
      setPreviewUrl(trimmed);
      onShowToast('URL gambar online valid dan berhasil dimuat!', 'success');
    } else {
      onShowToast('Gambar tidak dapat dimuat dari tautan tersebut. Pastikan link dapat diakses publik.', 'error');
    }
  };

  const handleSelectPreset = (preset: PresetAvatarOption) => {
    setPreviewUrl(preset.url);
    setOnlineUrlInput(preset.url);
    setIsUrlValid(true);
    onShowToast(`Preset avatar "${preset.label}" dipilih.`, 'info');
  };

  const handleRemovePhoto = () => {
    setPreviewUrl('');
    setOnlineUrlInput('');
    setSelectedFileName('');
    setIsUrlValid(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onShowToast('Foto profil dihapus (menggunakan inisial nama standar).', 'info');
  };

  const handleSave = () => {
    const finalAvatar = previewUrl.trim() || undefined;
    onSaveAvatar(teacher.username, finalAvatar);
    onShowToast(`Foto profil guru "${teacher.name}" berhasil diperbarui!`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Ubah Foto Profil Guru</h3>
              <p className="text-xs text-slate-500 truncate max-w-[260px] sm:max-w-xs">
                {teacher.name} ({teacher.subject})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Preview Box */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 mb-4 flex items-center gap-4">
          <div className="relative shrink-0">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={teacher.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-md ring-2 ring-blue-500/30"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-700 flex items-center justify-center text-white font-black text-xl shadow-md border-2 border-white ring-2 ring-blue-500/30">
                {initials || 'GR'}
              </div>
            )}
            {previewUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                title="Hapus foto saat ini"
                className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center shadow-sm cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>Pratinjau Tampilan Foto</span>
            </div>
            <div className="text-xs text-slate-600 truncate font-semibold mt-0.5">{teacher.name}</div>
            <div className="text-[11px] text-slate-400">
              {previewUrl ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Foto siap diterapkan
                </span>
              ) : (
                'Belum ada foto (menggunakan inisial nama)'
              )}
            </div>
          </div>
        </div>

        {/* Source Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-2xl mb-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Berkas</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('online')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'online'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Link Online</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preset')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'preset'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pilihan Avatar</span>
          </button>
        </div>

        {/* TAB 1: UPLOAD DARI KOMPUTER / HP */}
        {activeTab === 'upload' && (
          <div className="space-y-3 text-xs">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 p-6 rounded-2xl text-center cursor-pointer transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-xs">
                {isProcessingFile ? (
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                ) : (
                  <Upload className="w-6 h-6" />
                )}
              </div>
              <p className="font-bold text-slate-800">
                {selectedFileName ? 'Ganti Foto yang Dipilih' : 'Klik untuk Pilih Foto dari Komputer / HP'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Mendukung file JPG, PNG, atau WEBP. Gambar otomatis dikompresi & disesuaikan.
              </p>
              {selectedFileName && (
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-[11px] font-semibold">
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="truncate max-w-[200px]">{selectedFileName}</span>
                </div>
              )}
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl text-[11px] text-blue-800 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Kompresi Cerdas Otomatis:</strong> Foto langsung dioptimalkan agar tidak membebani memori dan langsung tersinkronkan ke HP siswa.
              </span>
            </div>
          </div>
        )}

        {/* TAB 2: LINK GAMBAR ONLINE */}
        {activeTab === 'online' && (
          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">
                Alamat URL Gambar Online (Direct Link)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="url"
                    value={onlineUrlInput}
                    onChange={(e) => {
                      setOnlineUrlInput(e.target.value);
                      setIsUrlValid(null);
                    }}
                    placeholder="https://contoh.com/foto-guru.jpg"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-[11px]"
                  />
                </div>
                <button
                  type="button"
                  disabled={isTestingUrl || !onlineUrlInput.trim()}
                  onClick={handleTestOnlineUrl}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {isTestingUrl ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Terapkan</span>
                </button>
              </div>
            </div>

            {isUrlValid === true && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Gambar berhasil dimuat dan siap disimpan.</span>
              </div>
            )}

            {isUrlValid === false && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Gambar gagal dimuat. Periksa kembali link gambar atau gunakan upload file.</span>
              </div>
            )}

            <div className="text-[11px] text-slate-500">
              *Tips: Anda dapat menyalin tautan foto dari Google Drive (direct link), Unsplash, atau website sekolah Anda.
            </div>
          </div>
        )}

        {/* TAB 3: PILIHAN AVATAR PENDIDIK */}
        {activeTab === 'preset' && (
          <div className="space-y-2.5 text-xs">
            <label className="block font-semibold text-slate-700">
              Pilih Karakter Avatar Guru Profesional:
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {PRESET_TEACHER_AVATARS.map((preset) => {
                const isSelected = previewUrl === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-2 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-400 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      className="w-14 h-14 rounded-xl object-cover shadow-xs"
                    />
                    <span className="text-[10px] text-slate-700 font-medium line-clamp-1 leading-tight">
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-xs">
          <button
            type="button"
            onClick={handleRemovePhoto}
            disabled={!previewUrl}
            className="px-3 py-2 text-rose-600 hover:bg-rose-50 disabled:opacity-40 disabled:hover:bg-transparent rounded-xl font-semibold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Foto</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Foto Profil</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
