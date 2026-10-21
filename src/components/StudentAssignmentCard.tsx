import React, { useState } from 'react';
import { BookOpen, CheckCircle2, Clock, Eye, RotateCcw, Upload, AlertCircle, Award } from 'lucide-react';
import { StudentAssignmentWithStatus } from '@/types';
import DashboardDialog from './DashboardDialog';
import StorageFileButton from './StorageFileButton';

export default function StudentAssignmentCard({ assignment: a, now, onSubmit, onCancel }: {
  assignment: StudentAssignmentWithStatus; now: number; onSubmit: () => void; onCancel: () => void;
}) {
  const [viewing, setViewing] = useState(false);
  const s = a.submission;
  const expired = new Date(a.dueDate).getTime() < now;
  const status = s?.status || (expired ? 'OVERDUE' : 'TODO');
  const labels = { APPROVED: 'დადასტურებულია', SUBMITTED: 'განსახილველია', DECLINED: 'დაბრუნებულია', OVERDUE: 'ვადაგასულია', TODO: 'ჩასაბარებელია' };
  const tone = status === 'APPROVED' ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300' : status === 'DECLINED' || status === 'OVERDUE' ? 'text-rose-700 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-300' : status === 'SUBMITTED' ? 'text-amber-700 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-300' : 'text-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-300';
  const Icon = status === 'APPROVED' ? CheckCircle2 : status === 'OVERDUE' || status === 'DECLINED' ? AlertCircle : Clock;
  const button = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-400/40';
  return <>
    <article className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-600 sm:p-6">
      <div className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400"><BookOpen size={15}/>{a.subjectName}</span><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}><Icon size={13}/>{labels[status]}</span></div>
      <h3 className="my-5 flex-1 text-lg font-extrabold leading-relaxed text-slate-900 dark:text-slate-100 break-words">{a.title}</h3>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-700">
        <span className="text-xs text-slate-500 dark:text-slate-400">{s?.grade != null ? <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400"><Award size={15}/>{s.grade}/10 ქულა</span> : new Date(a.dueDate).toLocaleDateString('ka-GE', { day:'numeric', month:'short' })}</span>
        {!s && !expired ? <button type="button" onClick={onSubmit} className={`${button} bg-indigo-600 hover:bg-indigo-700 text-white`}><Upload size={16}/>დავალების ჩაბარება</button> : <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setViewing(true)} className={`${button} bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600`}><Eye size={16}/>დავალების ნახვა</button>{status === 'DECLINED' && !expired && <button type="button" onClick={onSubmit} className={`${button} bg-rose-600 hover:bg-rose-700 text-white`}><RotateCcw size={16}/>ხელახლა ჩაბარება</button>}</div>}
      </div>
    </article>
    {viewing && <DashboardDialog title={a.title} subtitle={`${a.subjectName} · ${a.teacherName}`} onClose={() => setViewing(false)}>
      <div className="flex flex-wrap items-center gap-3 text-xs"><span className={`rounded-full px-3 py-1.5 font-bold ${tone}`}>{labels[status]}</span><span>ვადა: {new Date(a.dueDate).toLocaleString('ka-GE')}</span></div>
      <p className="whitespace-pre-line break-words text-sm leading-7 text-slate-600 dark:text-slate-300">{a.description}</p>
      {a.attachmentUrl && <StorageFileButton file={a.attachmentUrl} className={`${button} bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300`}>დამხმარე მასალა: {a.attachmentName || 'ფაილის გახსნა'}</StorageFileButton>}
      {s && <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/50"><h3 className="font-bold">ჩემი ნამუშევარი</h3>
        {s.fileUrl && <StorageFileButton file={s.fileUrl} className="block text-sm font-bold text-indigo-600 dark:text-indigo-300 break-all">{s.fileName || 'ფაილის გახსნა'}</StorageFileButton>}
        {s.submissionLink && <a href={s.submissionLink} target="_blank" rel="noreferrer" className="block text-sm font-bold text-indigo-600 dark:text-indigo-300">ნამუშევრის ბმული ↗</a>}
        {s.studentComment && <p className="text-sm whitespace-pre-line break-words">{s.studentComment}</p>}<p className="text-xs text-slate-500">ჩაბარებულია: {new Date(s.submittedAt).toLocaleString('ka-GE')}</p>
      </section>}
      {s && (s.teacherFeedback || s.grade != null) && <section className={`rounded-2xl p-5 space-y-2 ${tone}`}><h3 className="font-bold">მასწავლებლის შეფასება {s.grade != null && `· ${s.grade}/10`}</h3><p className="text-sm whitespace-pre-line break-words">{s.teacherFeedback}</p></section>}
      {expired && status !== 'APPROVED' && <p className="text-sm text-rose-600 dark:text-rose-400">ჩაბარების ვადა ამოიწურა. ცვლილებისთვის მიმართეთ მასწავლებელს.</p>}
      {s && s.status !== 'APPROVED' && !expired && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setViewing(false); onSubmit(); }} className={`${button} bg-indigo-600 text-white hover:bg-indigo-700`}>{status === 'DECLINED' ? 'ხელახლა ჩაბარება' : 'ფაილის შეცვლა'}</button><button type="button" onClick={() => { setViewing(false); onCancel(); }} className={`${button} text-rose-600 bg-rose-50 dark:bg-rose-950/50`}>ჩაბარების გაუქმება</button></div>}
    </DashboardDialog>}
  </>;
}
