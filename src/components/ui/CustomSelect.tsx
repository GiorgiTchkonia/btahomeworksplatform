import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

export interface SelectOption { value: string; label: string; description?: string }
export default function CustomSelect({ id, value, onChange, options, placeholder = 'აირჩიეთ', searchable = false, required = false }: {
  id?: string; value: string; onChange: (value: string) => void; options: SelectOption[]; placeholder?: string; searchable?: boolean; required?: boolean;
}) {
  const uid = useId();
  const listId = `${uid}-options`;
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const filtered = options.filter(o => `${o.label} ${o.description || ''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const selected = options.find(o => o.value === value);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  useEffect(() => { if (open) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' }); }, [active, open, listId]);
  const choose = (option: SelectOption) => { onChange(option.value); setOpen(false); setQuery(''); trigger.current?.focus(); };
  const toggle = () => { setQuery(''); setActive(Math.max(0, options.findIndex(o => o.value === value))); setOpen(prev => !prev); };
  return <div ref={root} className="relative" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }} onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); if (!open) { toggle(); return; } setActive(prev => Math.max(0, Math.min(filtered.length-1, prev+(event.key==='ArrowDown'?1:-1)))); }
    if (open && event.key === 'Enter') { event.preventDefault(); if (filtered[active]) choose(filtered[active]); }
  }}>
    <button ref={trigger} id={id} type="button" role="combobox" aria-expanded={open} aria-controls={listId} aria-required={required} aria-activedescendant={open && filtered[active] ? `${listId}-${active}` : undefined} onClick={toggle}
      className={`w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-semibold outline-none transition-colors focus-visible:ring-4 focus-visible:ring-indigo-500/15 ${open ? 'border-indigo-500 bg-white dark:bg-slate-900' : 'border-slate-200 bg-slate-50 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900'}`}>
      <span className={`truncate ${selected ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>{selected?.label || placeholder}</span><ChevronDown size={17} className={`shrink-0 text-slate-400 transition-transform ${open?'rotate-180':''}`} />
    </button>
    {open && <div className="absolute top-full mt-2 left-0 right-0 z-[90] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2 shadow-xl shadow-slate-900/10">
      {searchable && <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 px-3 pb-2 mb-2"><Search size={16} className="text-slate-400" /><input autoFocus aria-label="ძებნა ჩამონათვალში" value={query} onChange={e => { setQuery(e.target.value); setActive(0); }} placeholder="მოძებნეთ…" className="w-full bg-transparent py-2 text-sm outline-none" /></div>}
      <div id={listId} role="listbox" className="max-h-56 overflow-y-auto space-y-1">{filtered.map((option,index) => <button key={option.value} id={`${listId}-${index}`} role="option" aria-selected={value===option.value} tabIndex={-1} type="button" onMouseEnter={() => setActive(index)} onClick={() => choose(option)} className={`w-full rounded-xl px-3 py-2.5 flex items-center justify-between gap-3 text-left text-sm transition-colors ${index===active?'bg-indigo-50 dark:bg-indigo-950/50':'hover:bg-slate-50 dark:hover:bg-slate-700/50'} ${value===option.value?'text-indigo-600 dark:text-indigo-300 font-bold':''}`}>
        <span className="min-w-0"><span className="block truncate">{option.label}</span>{option.description && <span className="block text-xs text-slate-500 font-normal mt-0.5">{option.description}</span>}</span>{value===option.value && <Check size={16} className="shrink-0" />}
      </button>)}</div>{!filtered.length && <p className="p-4 text-sm text-slate-500 text-center">ვერ მოიძებნა</p>}
    </div>}
  </div>;
}
