/**
 * Utilities for teacher profile avatar upload, compression, and online validation.
 */

export async function compressImageFile(
  file: File,
  maxDimension = 400,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Berkas harus berupa gambar (JPG, PNG, WEBP, GIF).'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) {
        return reject(new Error('Berkas gambar kosong.'));
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Format gambar tidak didukung atau rusak.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio preserved dimensions
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(result); // Fallback to raw base64
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to web-optimized JPEG data URL
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const compressedBase64 = canvas.toDataURL(mimeType, quality);
        resolve(compressedBase64);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

export function testOnlineImageUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!url || !url.trim().startsWith('http')) {
      return resolve(false);
    }
    const img = new Image();
    const timer = setTimeout(() => resolve(false), 8000);
    img.onload = () => {
      clearTimeout(timer);
      resolve(true);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };
    img.src = url.trim();
  });
}

export interface PresetAvatarOption {
  id: string;
  label: string;
  url: string;
  category: 'formal' | 'ilustrasi' | 'pendidik';
}

export const PRESET_TEACHER_AVATARS: PresetAvatarOption[] = [
  {
    id: 'avatar-teacher-1',
    label: 'Guru Pria Formal (Jas & Dasi)',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    category: 'formal',
  },
  {
    id: 'avatar-teacher-2',
    label: 'Guru Wanita Formal (Kemeja)',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    category: 'formal',
  },
  {
    id: 'avatar-teacher-3',
    label: 'Guru Pria Kacamata / IT',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    category: 'pendidik',
  },
  {
    id: 'avatar-teacher-4',
    label: 'Guru Wanita Berhijab / Muslimah',
    url: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=300&q=80',
    category: 'formal',
  },
  {
    id: 'avatar-teacher-5',
    label: 'Guru Pria Kasual Ceria',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    category: 'pendidik',
  },
  {
    id: 'avatar-teacher-6',
    label: 'Guru Wanita Edukator Kreatif',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
    category: 'pendidik',
  },
];
