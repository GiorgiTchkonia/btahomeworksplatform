import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import ModalPortal from './ModalPortal';

export default function DashboardDialog({ title, subtitle, onClose, children }: {
  title: string; subtitle?: string; onClose: () => void; children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close.current();
      if (event.key !== 'Tab') return;
      const items = ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, [tabindex="0"]');
      if (!items?.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, []);
  return <ModalPortal><div className="modal-overlay fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" onClick={onClose}>
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()} className="flex flex-col w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
      <header className="shrink-0 flex items-start justify-between gap-4 border-b border-slate-100 bg-white p-5 sm:p-6 dark:border-slate-700 dark:bg-slate-800"><div className="min-w-0"><h2 className="text-xl font-black break-words">{title}</h2>{subtitle && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}</div><button type="button" aria-label="დახურვა" onClick={onClose} className="shrink-0 rounded-xl p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600"><X size={20}/></button></header>
      <div className="flex min-h-0 flex-col overflow-hidden p-1.5"><div className="modal-scroll min-h-0 overflow-y-auto overscroll-contain p-3.5 sm:p-[1.125rem] space-y-5">{children}</div></div>
    </div>
  </div></ModalPortal>;
}
