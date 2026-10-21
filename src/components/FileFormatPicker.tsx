import React from 'react';
import CustomCheckbox from './ui/CustomCheckbox';
import { FileText, FileSpreadsheet, Presentation, Image, File } from 'lucide-react';

const options = [
  { label: 'PDF', values: ['.pdf'] }, { label: 'Word', values: ['.doc','.docx'] },
  { label: 'PowerPoint', values: ['.ppt','.pptx'] }, { label: 'Excel', values: ['.xls','.xlsx'] },
  { label: 'სურათი', values: ['.jpg','.jpeg','.png','.webp'] },
];
export default function FileFormatPicker({ selected, onChange }: { selected: string[]; onChange: (formats: string[]) => void }) {
  const flat = [...new Set(selected.flatMap(f => f.split(',').map(v => v.trim().toLowerCase())))];
  return <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{options.map((option,index) => { const checked=option.values.every(value=>flat.includes(value)); const Icon=[File,FileText,Presentation,FileSpreadsheet,Image][index]; return <div key={option.label} className={`rounded-2xl border p-4 transition-colors ${checked?'border-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40':'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-indigo-300'}`}>
    <Icon size={23} className={`mb-3 ${checked?'text-indigo-600 dark:text-indigo-300':'text-slate-400'}`} aria-hidden="true" />
    <CustomCheckbox label={option.label} checked={option.values.every(value => flat.includes(value))} onChange={checked => onChange(checked ? [...new Set([...flat,...option.values])] : flat.filter(value => !option.values.includes(value)))} />
    <p className="text-[10px] text-slate-400 mt-2 pl-8">{option.values.join(' · ')}</p>
  </div>;})}</div>;
}
