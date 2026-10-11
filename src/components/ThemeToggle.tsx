import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ui/ThemeProvider';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  onToggle?: () => void;
}

export default function ThemeToggle({ className = '', showLabel = false, onToggle }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  const handleToggle = () => {
    setTheme(isDark ? 'light' : 'dark');
    if (onToggle) onToggle();
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label="Toggle theme"
      title={isDark ? 'ნათელ რეჟიმზე გადართვა' : 'ბნელ რეჟიმზე გადართვა'}
      className={`group relative inline-flex items-center gap-2.5 p-2 rounded-xl text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors duration-300 focus:outline-none select-none ${className}`}
    >
      <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
        {/* Sun Icon */}
        <Sun
          className={`w-5 h-5 text-amber-500 transition-all duration-500 ease-in-out transform ${
            isDark
              ? 'rotate-90 scale-0 opacity-0 -translate-y-1'
              : 'rotate-0 scale-100 opacity-100 translate-y-0'
          }`}
          strokeWidth={2}
        />
        {/* Moon Icon */}
        <Moon
          className={`absolute w-5 h-5 text-indigo-400 dark:text-blue-400 transition-all duration-500 ease-in-out transform ${
            isDark
              ? 'rotate-0 scale-100 opacity-100 translate-y-0'
              : '-rotate-90 scale-0 opacity-0 translate-y-1'
          }`}
          strokeWidth={2}
        />
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
          {isDark ? 'ნათელი რეჟიმი' : 'ბნელი რეჟიმი'}
        </span>
      )}
    </button>
  );
}
