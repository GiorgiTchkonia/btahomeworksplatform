import React from 'react';
import { Check } from 'lucide-react';

interface CustomCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
}

export default function CustomCheckbox({ checked, onChange, label, description }: CustomCheckboxProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative flex items-center justify-center shrink-0 w-5 h-5 mt-0.5">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className={"w-5 h-5 rounded border-2 transition-all duration-200 "} />
        <Check className={"absolute w-3.5 h-3.5 text-white pointer-events-none transition-transform duration-200 "} />
      </div>
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className={"text-sm font-bold transition-colors "}>{label}</span>}
          {description && <span className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-0.5">{description}</span>}
        </div>
      )}
    </label>
  );
}

