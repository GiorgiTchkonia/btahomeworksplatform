import React from 'react';
import { CollegeGroup } from '@/types';
import CustomCheckbox from './ui/CustomCheckbox';
import { programmeLabel } from '@/lib/groups';

export default function GroupPicker({ groups, selected, onChange }: { groups: CollegeGroup[]; selected: string[]; onChange: (ids: string[]) => void }) {
  return <fieldset className="space-y-3"><legend className="font-bold text-sm mb-2">დავალების ჯგუფები *</legend>
    <p className="text-xs text-slate-500">მონიშნეთ ერთი ან რამდენიმე ჯგუფი. სხვა ჯგუფების სტუდენტები დავალებას ვერ ნახავენ.</p>
    <div className="grid sm:grid-cols-2 gap-3">{groups.filter(g => g.active || selected.includes(g.id)).map(g => <div key={g.id} className={`rounded-2xl p-4 border transition-colors ${selected.includes(g.id) ? 'border-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-sm' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-indigo-300'}`}><CustomCheckbox label={g.code} description={programmeLabel(g.programme_type)} checked={selected.includes(g.id)} onChange={checked => onChange(checked ? [...selected, g.id] : selected.filter(id => id !== g.id))} /></div>)}</div>
    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">არჩეული ჯგუფები: {selected.length}</p>
    {!groups.some(g => g.active) && <p className="text-amber-700 text-sm">მოქმედი ჯგუფი არ გაქვთ. დაუკავშირდით ადმინისტრატორს.</p>}
  </fieldset>;
}
