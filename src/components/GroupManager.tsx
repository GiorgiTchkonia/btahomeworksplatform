import { localizeError } from '@/lib/messages';
import React, { useEffect, useRef, useState } from 'react';
import { CollegeGroup, SafeStudentUser, SafeTeacherUser } from '@/types';
import { programmeLabel, saveCollegeGroup } from '@/lib/groups';
import { supabase } from '@/lib/supabase';
import CustomCheckbox from './ui/CustomCheckbox';
import { useDialog } from './ui/DialogProvider';
import { AlertCircle, Plus, Pencil, Users, Layers3, ArrowUpRight, Archive, X, Check, GraduationCap } from 'lucide-react';
import GroupMembersDialog from './GroupMembersDialog';

const blank = { code: '', programme_type: 'INTEGRATED' as const, programme_name: '', active: true };
const input = 'w-full mt-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-colors';
export default function GroupManager({ groups, teachers, students, onSaved }: {
  groups: CollegeGroup[]; teachers: SafeTeacherUser[]; students: SafeStudentUser[]; onSaved: () => Promise<void>;
}) {
  const { showAlert } = useDialog();
  const [draft, setDraft] = useState<Partial<CollegeGroup> | null>(null);
  const [teacherIds, setTeacherIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [membersGroup, setMembersGroup] = useState<CollegeGroup | null>(null);
  const busyRef = useRef(busy);
  busyRef.current = busy;
  useEffect(() => {
    if (!draft && !membersGroup) return;
    const overflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented && !busyRef.current) { setDraft(null); setMembersGroup(null); } };
    window.addEventListener('keydown', escape);
    return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown', escape); previousFocus?.focus(); };
  }, [Boolean(draft), Boolean(membersGroup)]);
  const edit = async (group?: CollegeGroup) => {
    setError(''); setBusy(true);
    try {
      const { data, error: failure } = group ? await supabase.from('teacher_groups').select('teacher_id').eq('group_id', group.id) : { data: [], error: null };
      if (failure) throw failure;
      setTeacherIds((data || []).map(t => t.teacher_id)); setDraft(group || { ...blank });
    } catch { showAlert('ჯგუფის მასწავლებლების ჩატვირთვა ვერ მოხერხდა', 'error'); }
    finally { setBusy(false); }
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!draft) return;
    setBusy(true); setError('');
    try { await saveCollegeGroup(draft, teacherIds); setDraft(null); await onSaved(); showAlert('ჯგუფის შენახვა დადასტურებულია', 'success'); }
    catch (failure: any) { setError(localizeError(failure, 'ჯგუფი ვერ შეინახა')); }
    finally { setBusy(false); }
  };
  return <section className="space-y-5">
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3"><span className="rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 p-3 text-indigo-600 dark:text-indigo-300"><Layers3 size={24} /></span><div><h2 className="text-xl font-black">კოლეჯის ჯგუფები <span className="ml-2 text-sm text-slate-400 font-semibold">{groups.length}</span></h2><p className="text-xs text-slate-500 dark:text-slate-400 mt-1">შექმენით ჯგუფები და ხელით დაამატეთ სტუდენტები</p></div></div>
      <button disabled={busy} onClick={() => void edit()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 text-sm font-bold shadow-sm transition-colors disabled:opacity-50"><Plus size={17} />ჯგუფის შექმნა</button>
    </header>
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{groups.map(group => <article key={group.id} className="group rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
      <div className="p-5 space-y-4"><div className="flex items-start justify-between gap-2"><span className={group.programme_type==='INTEGRATED'?'rounded-xl bg-indigo-50 dark:bg-indigo-950/50 p-2.5 text-indigo-600 dark:text-indigo-300':'rounded-xl bg-teal-50 dark:bg-teal-950/50 p-2.5 text-teal-600 dark:text-teal-300'}><GraduationCap size={22} /></span><span className="rounded-lg px-2 py-1 bg-slate-100 dark:bg-slate-900 text-[10px] font-bold text-slate-500">{group.active?programmeLabel(group.programme_type):'არქივში'}</span></div>
      <div><h3 className="text-xl font-black tracking-tight break-words">{group.code}</h3><p className="text-sm text-slate-500 dark:text-slate-400 mt-1 min-h-5">{group.programme_name || 'პროგრამა მითითებული არ არის'}</p></div>
      <div className="flex items-center gap-2 text-sm text-slate-500"><Users size={16} /><strong className="text-slate-800 dark:text-slate-200">{students.filter(s=>s.group_id===group.id).length}</strong> სტუდენტი</div></div>
      <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-3 flex items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-900/30"><button type="button" disabled={!group.active || busy} onClick={()=>setMembersGroup(group)} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-300 px-2 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg disabled:opacity-40"><Plus size={14} />სტუდენტების დამატება<ArrowUpRight size={14} /></button><button type="button" disabled={busy} onClick={()=>void edit(group)} aria-label={group.code+' — რედაქტირება'} className="p-2.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"><Pencil size={16} /></button></div>
    </article>)}</div>
    {!groups.length && <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-10 text-center"><Layers3 size={32} className="mx-auto text-slate-300 mb-3" /><h3 className="font-bold">შექმენით პირველი ჯგუფი</h3><p className="text-sm text-slate-500 mt-2">მიუთითეთ ჯგუფის კოდი, პროგრამა და მასწავლებლები.</p></div>}
    {membersGroup && <GroupMembersDialog group={membersGroup} groups={groups} students={students} onClose={()=>setMembersGroup(null)} onSaved={onSaved} />}
    {draft && <div className="fixed inset-0 z-[70] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={()=>{if(!busy)setDraft(null);}}>
      <section role="dialog" aria-modal="true" aria-labelledby="group-editor-title" className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border border-white/10 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden" onClick={e=>e.stopPropagation()}>
        <header className="p-5 sm:p-7 border-b border-slate-100 dark:border-slate-700 flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 p-3"><Layers3 size={22} /></span><div><h3 id="group-editor-title" className="text-xl font-black">{draft.id?'ჯგუფის რედაქტირება':'ჯგუფის ხელით შექმნა'}</h3><p className="text-xs text-slate-500 mt-1">შეავსეთ ჯგუფის მონაცემები</p></div></div><button disabled={busy} type="button" onClick={()=>setDraft(null)} aria-label="დახურვა" className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><X size={20} /></button></header>
        <form onSubmit={save} className="flex flex-col min-h-0"><div className="p-5 sm:p-7 overflow-y-auto space-y-6">
        {error && <p role="alert" className="flex gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 p-3 text-red-600 text-sm"><AlertCircle size={18} className="shrink-0" />{error}</p>}
        <label className="block text-xs font-bold text-slate-500">ჯგუფის კოდი *<input autoFocus required maxLength={60} placeholder="მაგ. I14-25/1" value={draft.code} onChange={e=>setDraft({...draft,code:e.target.value})} className={input} /><span className="block text-[11px] font-normal mt-2">კოდი შეიყვანეთ ხელით. I აღნიშნავს ინტეგრირებულ ჯგუფს.</span></label>
        <fieldset><legend className="text-xs font-bold text-slate-500 mb-3">სწავლების ტიპი</legend><div className="grid grid-cols-2 gap-3">{(['INTEGRATED','NON_INTEGRATED'] as const).map(type=><button key={type} type="button" aria-pressed={draft.programme_type===type} onClick={()=>setDraft({...draft,programme_type:type})} className={draft.programme_type===type?'flex items-center justify-between gap-2 p-4 rounded-2xl text-left border border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-sm font-bold':'flex items-center justify-between gap-2 p-4 rounded-2xl text-left border border-slate-200 dark:border-slate-700 text-slate-500 text-sm font-semibold'}>{programmeLabel(type)}{draft.programme_type===type&&<Check size={17} className="shrink-0" />}</button>)}</div></fieldset>
        <label className="block text-xs font-bold text-slate-500">სასწავლო პროგრამა<input maxLength={200} placeholder="მაგ. ინფორმაციის ტექნოლოგია" value={draft.programme_name} onChange={e=>setDraft({...draft,programme_name:e.target.value})} className={input} /></label>
        <fieldset><legend className="text-xs font-bold text-slate-500 mb-3">ჯგუფის მასწავლებლები · {teacherIds.length} არჩეული</legend><div className="grid sm:grid-cols-2 gap-3">{teachers.map(t=><div key={t.id} className={teacherIds.includes(t.id)?'p-3 rounded-xl border border-indigo-300 bg-indigo-50/60 dark:bg-indigo-950/30':'p-3 rounded-xl border border-slate-200 dark:border-slate-700'}><CustomCheckbox label={t.name} description={t.subject} checked={teacherIds.includes(t.id)} onChange={checked=>setTeacherIds(prev=>checked?[...prev,t.id]:prev.filter(id=>id!==t.id))} /></div>)}</div></fieldset>
        {draft.id && <div className="border-t border-slate-100 dark:border-slate-700 pt-4"><button type="button" onClick={()=>setDraft({...draft,active:!draft.active})} className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-amber-600"><Archive size={16} />{draft.active?'ჯგუფის არქივში გადატანა':'ჯგუფის აღდგენა არქივიდან'}</button><p className="text-xs text-slate-400 mt-2">{draft.active?'ისტორია შენარჩუნდება.':'ჯგუფი შენახვის შემდეგ არქივში იქნება. აღსადგენად დააჭირეთ ზემოთ.'}</p></div>}
        </div><footer className="flex justify-end gap-3 p-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50"><button disabled={busy} type="button" onClick={()=>setDraft(null)} className="rounded-xl px-5 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700">გაუქმება</button><button disabled={busy} className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 text-sm font-bold disabled:opacity-50">{busy?'ინახება…':draft.id?'ცვლილებების შენახვა':'ჯგუფის შექმნა'}</button></footer></form>
      </section>
    </div>}
  </section>;
}
