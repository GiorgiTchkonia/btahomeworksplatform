import React, { useState } from 'react';
import { BookOpen, Plus, X } from 'lucide-react';

export default function TeacherSubjectPicker({ value, onChange }: { value: string[]; onChange: (subjects: string[]) => void }) {
  const [draft,setDraft]=useState('');
  const [error,setError]=useState('');
  const add=()=>{
    const name=draft.trim();
    if(!name)return;
    if(name.length>100){setError('მაქსიმუმ 100 სიმბოლო');return;}
    if(value.some(item=>item.toLocaleLowerCase()===name.toLocaleLowerCase())){setError('ეს საგანი უკვე დამატებულია');return;}
    if(value.length>=12){setError('დასაშვებია მაქსიმუმ 12 საგანი');return;}
    onChange([...value,name]);setDraft('');setError('');
  };
  return <fieldset className="space-y-3"><legend className="text-sm font-semibold mb-2">მასწავლებლის საგნები *</legend>
    <div className="flex flex-wrap gap-2">{value.map((subject,index)=><span key={index} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300"><BookOpen size={14} />{subject}<button type="button" onClick={()=>onChange(value.filter((_,i)=>i!==index))} aria-label={`${subject} — სიიდან მოხსნა`} className="p-0.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900"><X size={14} /></button></span>)}</div>
    <div className="flex gap-2"><input aria-label="ახალი საგნის დასახელება" value={draft} onChange={e=>{setDraft(e.target.value);setError('');}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add();}}} placeholder="მაგ. ფიზიკა" maxLength={100} className="min-w-0 flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" /><button type="button" onClick={add} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"><Plus size={15} />დამატება</button></div>
    <p className="text-xs text-slate-500">თითო საგანი დაამატეთ ცალ-ცალკე. მაგალითად: ფიზიკა და მათემატიკა. შემდეგ დააჭირეთ შენახვას.</p>
    {error&&<p role="alert" className="text-xs text-red-600">{error}</p>}
  </fieldset>;
}
