import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[110] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let bgStyle = 'bg-slate-900 text-white border-slate-700';
        let Icon = Info;
        if (toast.type === 'success') {
          bgStyle = 'bg-emerald-950 text-emerald-100 border-emerald-800';
          Icon = CheckCircle2;
        } else if (toast.type === 'error') {
          bgStyle = 'bg-rose-950 text-rose-100 border-rose-800';
          Icon = AlertCircle;
        } else if (toast.type === 'warning') {
          bgStyle = 'bg-amber-950 text-amber-100 border-amber-800';
          Icon = AlertTriangle;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl text-sm transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${bgStyle}`}
          >
            <Icon className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs leading-relaxed">{toast.message}</div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-white/60 hover:text-white shrink-0 p-0.5 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
