import React from 'react';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
  children?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  onConfirm,
  onCancel,
  type = 'info',
  children,
}) => {
  if (!isOpen) return null;

  let iconBg = 'bg-blue-100 text-blue-600';
  let Icon = Info;
  let confirmBtnClass = 'bg-blue-600 hover:bg-blue-700 text-white';

  if (type === 'danger') {
    iconBg = 'bg-rose-100 text-rose-600';
    Icon = AlertCircle;
    confirmBtnClass = 'bg-rose-600 hover:bg-rose-700 text-white';
  } else if (type === 'warning') {
    iconBg = 'bg-amber-100 text-amber-600';
    Icon = AlertTriangle;
    confirmBtnClass = 'bg-amber-600 hover:bg-amber-700 text-white';
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 transform transition-all">
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            {message && <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-line">{message}</p>}
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {children && <div className="mb-4">{children}</div>}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer ${confirmBtnClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
