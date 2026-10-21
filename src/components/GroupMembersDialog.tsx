import { localizeError } from '@/lib/messages';
import React, { useState } from 'react';
import { CollegeGroup, SafeStudentUser } from '@/types';
import { assignStudentsToGroup } from '@/lib/groups';
import { AlertCircle, ArrowRight, Check, Search, Users, X } from 'lucide-react';
import { useDialog } from './ui/DialogProvider';
import CustomCheckbox from './ui/CustomCheckbox';

export default function GroupMembersDialog({ group, groups, students, onClose, onSaved }: {
  group: CollegeGroup; groups: CollegeGroup[]; students: SafeStudentUser[]; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const { showAlert } = useDialog();
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const members = students.filter(s => s.group_id === group.id);
  const available = students.filter(s => s.group_id !== group.id && `${s.name} ${s.email}`.toLowerCase().includes(search.toLowerCase()));
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!selected.length || busy) return;
    setBusy(true); setError('');
    try {
      await assignStudentsToGroup(group.id, selected);
      await onSaved(); onClose(); showAlert(`${selected.length} სტუდენტის ჯგუფში დამატება დადასტურებულია.`, 'success');
    } catch (failure: any) { setError(localizeError(failure, 'სტუდენტების დამატება ვერ მოხერხდა')); }
    finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => { if (!busy) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="group-members-title" className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-white/10 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
      <header className="p-5 sm:p-7 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start gap-4"><div className="flex items-center gap-3"><span className="rounded-2xl p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300"><Users size={22} /></span><div><p className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 mb-1">{group.code}</p><h2 id="group-members-title" className="text-xl font-bold">სტუდენტების დამატება</h2></div></div><button type="button" disabled={busy} onClick={onClose} aria-label="დახურვა" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><X size={20} /></button></header>
      <form onSubmit={save} className="flex flex-col min-h-0">
        <div className="p-5 sm:p-7 overflow-y-auto space-y-5">
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">აირჩიეთ სტუდენტები, რომლებსაც ამ ჯგუფში დაამატებთ. არჩეული სტუდენტები წინა ჯგუფიდან გადმოვლენ; თითოეულს მხოლოდ ერთი ჯგუფი ექნება.</p>
          {error && <p role="alert" className="flex gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 text-sm"><AlertCircle className="shrink-0" size={18} />{error}</p>}
          <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-4"><p className="text-xs font-bold text-slate-500 mb-2">უკვე ჯგუფშია · {members.length}</p><div className="flex flex-wrap gap-2">{members.map(s => <span key={s.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"><Check size={13} className="text-emerald-500" />{s.name}</span>)}{!members.length && <span className="text-sm text-slate-400">სტუდენტები ჯერ არ დამატებულან</span>}</div></div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 bg-slate-50 dark:bg-slate-900"><Search size={17} className="text-slate-400" /><input aria-label="სტუდენტის ძებნა" placeholder="სახელი ან ელფოსტა…" value={search} onChange={e => setSearch(e.target.value)} className="w-full py-3 bg-transparent text-sm outline-none" /></div>
          <div className="space-y-2">{available.map(s => <div key={s.id} className={`rounded-2xl border p-4 transition-colors ${selected.includes(s.id)?'border-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/30':'border-slate-200 dark:border-slate-700'}`}><CustomCheckbox checked={selected.includes(s.id)} onChange={checked => setSelected(prev => checked?[...prev,s.id]:prev.filter(id=>id!==s.id))} label={s.name} description={`${s.email} · ${groups.find(g=>g.id===s.group_id)?.code || 'ჯგუფი მითითებული არ არის'}`} /></div>)}{!available.length && <p className="text-center text-sm text-slate-400 py-6">დასამატებელი სტუდენტი ვერ მოიძებნა</p>}</div>
        </div>
        <footer className="p-5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/50"><span className="text-sm text-slate-500">არჩეულია: <strong className="text-indigo-600 dark:text-indigo-300">{selected.length}</strong></span><button disabled={busy || !selected.length} className="inline-flex items-center gap-2 rounded-xl px-5 py-3 bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 disabled:opacity-40">{busy?'ინახება…':'ჯგუფში დამატება'}<ArrowRight size={16} /></button></footer>
      </form>
    </section>
  </div>;
}
