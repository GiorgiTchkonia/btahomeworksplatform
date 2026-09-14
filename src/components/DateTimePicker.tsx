import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  Check, 
  Sparkles,
  RotateCcw
} from 'lucide-react';

interface DateTimePickerProps {
  value: string; // ISO or YYYY-MM-DDTHH:mm
  onChange: (value: string) => void;
  required?: boolean;
}

const MONTH_NAMES = [
  'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
  'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'
];

const WEEKDAY_NAMES = ['ორშ', 'სამ', 'ოთხ', 'ხუთ', 'პარ', 'შაბ', 'კვი'];

const TIME_SHORTCUTS = [
  { label: '23:59 (დღის ბოლო)', hour: 23, minute: 59 },
  { label: '18:00 (საღამო)', hour: 18, minute: 0 },
  { label: '14:00 (შუადღე)', hour: 14, minute: 0 },
  { label: '12:00 (შესვენება)', hour: 12, minute: 0 },
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatValue(year: number, month: number, day: number, hour: number, minute: number): string {
  const d = new Date(year, month, day, hour, minute);
  return d.toISOString();
}

export default function DateTimePicker({ value, onChange }: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parsed state
  let initialDate = value ? new Date(value) : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // Default to +2 days
  if (isNaN(initialDate.getTime())) {
    initialDate = new Date();
  }
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [selectedDay, setSelectedDay] = useState(initialDate.getDate());
  const [selectedHour, setSelectedHour] = useState(value && !isNaN(new Date(value).getTime()) ? new Date(value).getHours() : 23);
  const [selectedMinute, setSelectedMinute] = useState(value && !isNaN(new Date(value).getTime()) ? new Date(value).getMinutes() : 59);

  // Sync from props if value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
        setSelectedDay(d.getDate());
        setSelectedHour(d.getHours());
        setSelectedMinute(d.getMinutes());
      }
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Apply changes to parent
  const emitChange = (year: number, month: number, day: number, hour: number, minute: number) => {
    const formatted = formatValue(year, month, day, hour, minute);
    onChange(formatted);
  };

  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
    emitChange(viewYear, viewMonth, day, selectedHour, selectedMinute);
  };

  const handleSelectTime = (hour: number, minute: number) => {
    setSelectedHour(hour);
    setSelectedMinute(minute);
    emitChange(viewYear, viewMonth, selectedDay, hour, minute);
  };

  // Quick Presets
  const applyPreset = (daysOffset: number, hour: number = 23, minute: number = 59) => {
    const target = new Date();
    target.setDate(target.getDate() + daysOffset);
    const y = target.getFullYear();
    const m = target.getMonth();
    const d = target.getDate();

    setViewYear(y);
    setViewMonth(m);
    setSelectedDay(d);
    setSelectedHour(hour);
    setSelectedMinute(minute);
    emitChange(y, m, d, hour, minute);
  };

  // Navigation
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Generate days matrix
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  // Monday-first index: Mon = 0, ..., Sun = 6
  const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Formatted display text
  const formatDisplay = () => {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;

    const dayName = d.toLocaleDateString('ka-GE', { weekday: 'short' });
    const monthName = MONTH_NAMES[d.getMonth()];
    const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return {
      dateStr: `${d.getDate()} ${monthName}, ${d.getFullYear()} (${dayName})`,
      timeStr,
    };
  };

  const display = formatDisplay();

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-white border rounded-2xl transition-all text-left shadow-sm ${
          isOpen
            ? 'border-indigo-500 ring-4 ring-indigo-100/70 bg-white'
            : 'border-slate-200 hover:border-indigo-300'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-100">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div className="truncate">
            {display ? (
              <>
                <p className="text-sm font-bold text-slate-900 truncate">
                  {display.dateStr}
                </p>
                <p className="text-xs font-semibold text-indigo-600 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>ჩაბარების დრო: {display.timeStr}</span>
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-slate-700">
                  აირჩიეთ ჩაბარების ვადა
                </p>
                <p className="text-xs text-slate-400">
                  დააწკაპუნეთ კალენდრისა და დროის ასარჩევად
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-3">
          <span className="hidden sm:inline-block px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
            {isOpen ? 'დახურვა' : 'არჩევა'}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-indigo-600' : ''
            }`}
          />
        </div>
      </button>

      {/* Expandable Calendar & Time Picker */}
      {isOpen && (
        <div className="mt-3 w-full bg-slate-50/90 rounded-2xl p-4 sm:p-5 border border-indigo-100 shadow-sm transition-all animate-in fade-in duration-150">
          {/* Header with Quick Presets */}
          <div className="pb-3 border-b border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                სწრაფი არჩევა (1-დაწკაპუნებით)
              </span>
              <button
                type="button"
                onClick={() => applyPreset(1, 23, 59)}
                className="text-[11px] font-semibold text-indigo-600 hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                ხვალ
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset(1, 23, 59)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white transition-colors border border-indigo-100"
              >
                ხვალ (23:59)
              </button>
              <button
                type="button"
                onClick={() => applyPreset(3, 23, 59)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white transition-colors border border-indigo-100"
              >
                3 დღეში
              </button>
              <button
                type="button"
                onClick={() => applyPreset(7, 23, 59)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white transition-colors border border-indigo-100"
              >
                1 კვირაში
              </button>
              <button
                type="button"
                onClick={() => applyPreset(14, 23, 59)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white transition-colors border border-indigo-100"
              >
                2 კვირაში
              </button>
            </div>
          </div>

          {/* Calendar Month Navigation */}
          <div className="py-2.5 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h4 className="text-sm font-extrabold text-slate-900">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </h4>
            </div>
            <button
              type="button"
              onClick={nextMonth}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEKDAY_NAMES.map((dayName, idx) => (
              <span
                key={dayName}
                className={`text-[11px] font-bold py-1 ${
                  idx >= 5 ? 'text-rose-500' : 'text-slate-400'
                }`}
              >
                {dayName}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Empty slots before day 1 */}
            {Array.from({ length: startDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8 w-8 sm:h-9 sm:w-9 mx-auto" />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNumber = i + 1;
              const dateObj = new Date(viewYear, viewMonth, dayNumber);
              const isPast = dateObj < today;
              const isSelected =
                dayNumber === selectedDay &&
                viewMonth === new Date(value || Date.now()).getMonth() &&
                viewYear === new Date(value || Date.now()).getFullYear();
              const isToday =
                dayNumber === today.getDate() &&
                viewMonth === today.getMonth() &&
                viewYear === today.getFullYear();

              return (
                <button
                  key={`day-${dayNumber}`}
                  type="button"
                  disabled={isPast}
                  onClick={() => handleSelectDay(dayNumber)}
                  className={`h-8 w-8 sm:h-9 sm:w-9 mx-auto rounded-xl text-xs font-bold flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105'
                      : isPast
                      ? 'text-slate-300 cursor-not-allowed'
                      : isToday
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-extrabold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {dayNumber}
                </button>
              );
            })}
          </div>

          {/* Time Picker Section */}
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                ჩაბარების დრო
              </span>
              <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                {pad(selectedHour)}:{pad(selectedMinute)}
              </span>
            </div>

            {/* Hours & Minutes Selectors */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  საათი
                </label>
                <select
                  value={selectedHour}
                  onChange={(e) => handleSelectTime(Number(e.target.value), selectedMinute)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={`hour-${h}`} value={h}>
                      {pad(h)}:00 ({h >= 12 ? 'დღე/საღამო' : 'დილა'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  წუთი
                </label>
                <select
                  value={selectedMinute}
                  onChange={(e) => handleSelectTime(selectedHour, Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {[0, 15, 30, 45, 59].map((m) => (
                    <option key={`minute-${m}`} value={m}>
                      {pad(m)} წუთი
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Time Shortcuts */}
            <div className="flex flex-wrap gap-1 pt-1">
              {TIME_SHORTCUTS.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => handleSelectTime(t.hour, t.minute)}
                  className={`text-[11px] px-2 py-1 rounded-lg font-medium transition-all ${
                    selectedHour === t.hour && selectedMinute === t.minute
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Confirm Button */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              დააჭირეთ მზადყოფნისთვის
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-95"
            >
              <Check className="w-3.5 h-3.5" />
              დადასტურება
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
