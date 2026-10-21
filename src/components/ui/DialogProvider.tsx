import React, { createContext, useContext, useState, ReactNode } from 'react';
import ConfirmModal from './ConfirmModal';
import { localizeError } from '@/lib/messages';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

interface DialogContextType {
  showAlert: (message: string, type?: 'error' | 'success' | 'info') => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) throw new Error('useDialog must be used within DialogProvider');
  return context;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [alertState, setAlertState] = useState<{ isOpen: boolean; message: string; type: 'error' | 'success' | 'info' }>({
    isOpen: false,
    message: '',
    type: 'info'
  });

  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showAlert = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
    setAlertState({ isOpen: true, message: type==='error'?localizeError(message):message, type });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmState({ isOpen: true, title, message, onConfirm });
  };

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm }}>
      {children}

      {/* Alert Modal */}
      {alertState.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-alert-title"
            className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-200"
          >
            <div className="p-6 text-center relative">
              <button 
                type="button"
                onClick={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
                aria-label="დახურვა"
                className="absolute top-4 right-4 p-2 text-slate-400 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 ${alertState.type === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400' : alertState.type === 'success' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'}`}>
                {alertState.type === 'success' ? <CheckCircle2 className="w-8 h-8" aria-hidden="true" /> : alertState.type === 'error' ? <AlertCircle className="w-8 h-8" aria-hidden="true" /> : <Info className="w-8 h-8" aria-hidden="true" />}
              </div>
              <h3 id="dialog-alert-title" className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">{alertState.type === 'error' ? 'ვერ შესრულდა' : alertState.type === 'success' ? 'დადასტურებულია' : 'შეტყობინება'}</h3>
              <p role={alertState.type === 'error' ? 'alert' : 'status'} className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{alertState.message}</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
                className="w-full px-4 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
              >
                გასაგებია
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={() => {
          confirmState.onConfirm();
          setConfirmState(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />
    </DialogContext.Provider>
  );
}

