import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-500 mx-auto flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 id="confirm-modal-title" className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{title}</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{message}</p>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700 flex items-center gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
          >
            გაუქმება
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white bg-rose-500 hover:bg-rose-600 shadow-sm transition-colors"
          >
            დადასტურება
          </button>
        </div>
      </div>
    </div>
  );
}

