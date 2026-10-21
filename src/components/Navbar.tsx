import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { LogOut, Users, Shield, Settings, Menu, X } from 'lucide-react';
import { User as UserType, SafeTeacherUser, SafeStudentUser } from '@/types';
import { supabase } from '@/lib/supabase';
import ProfileModal from './ProfileModal';
import BtaLogo from './BtaLogo';
import ThemeToggle from './ThemeToggle';

interface NavbarProps {
  user: UserType | null;
  onLogout?: () => void;
  onUserUpdated?: (user: UserType) => void;
}

export default function Navbar({ user, onLogout, onUserUpdated }: NavbarProps) {
  const [location] = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      if (onLogout) onLogout();
      window.location.href = '/';
    } catch (err) {
      console.error(err);
    }
  };

  const isLoginPage = location === '/login';

  const roleLabel = () => {
    if (!user) return '';
    if (user.role === 'ADMIN') return 'ადმინისტრატორი';
    if (user.role === 'TEACHER') return (user as SafeTeacherUser).subject || 'მასწავლებელი';
    return (user as SafeStudentUser).grade || 'სტუდენტი';
  };

  const avatarGradient = () => {
    if (!user) return 'from-blue-500 to-indigo-600';
    if (user.role === 'ADMIN') return 'from-violet-500 to-purple-600';
    if (user.role === 'TEACHER') return 'from-teal-500 to-emerald-600';
    return 'from-blue-500 to-[#2B4EFF]';
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 shadow-[0_1px_0_0_#f3f4f6] dark:shadow-none transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between h-[60px] sm:h-[68px]">

            {/* ── Brand ── */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
              <BtaLogo size={36} />
              <div className="leading-none">
                <span className="block text-[21px] font-extrabold text-gray-900 dark:text-white tracking-tight">
                  BTA
                </span>
                <span className="block text-[10px] text-gray-400 dark:text-slate-400 font-medium tracking-wider uppercase mt-0.5 hidden sm:block">
                  სასწავლო პორტალი
                </span>
              </div>
            </Link>

            {/* ── Desktop nav ── */}
            <nav className="hidden sm:flex items-center gap-1">
              {user?.role === 'ADMIN' && (
                <Link
                  href="/whitelist"
                  className="flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-all"
                >
                  <Users className="w-3.5 h-3.5" />
                  მომხმარებლები
                </Link>
              )}
              {user?.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-all"
                >
                  <Shield className="w-3.5 h-3.5" />
                  ადმინი
                </Link>
              )}
            </nav>

            {/* ── Right section ── */}
            <div className="hidden sm:flex items-center gap-2">
              <ThemeToggle />

              {user ? (
                <>
                  <div className="w-px h-5 bg-gray-200 dark:bg-slate-700 mx-1" />

                  {/* Avatar + name button */}
                  <button
                    type="button"
                    onClick={() => setIsProfileOpen(true)}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all group"
                  >
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGradient()} flex items-center justify-center text-white text-[13px] font-bold shadow-sm`}>
                      {user.name?.charAt(0).toUpperCase() ?? '?'}
                    </div>
                    <div className="text-left hidden md:block max-w-[140px]">
                      <p className="text-[13px] font-semibold text-gray-800 dark:text-slate-200 leading-tight truncate">{user.name}</p>
                      <p className="text-[11px] text-gray-400 dark:text-slate-400 leading-tight truncate mt-0.5">{roleLabel()}</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsProfileOpen(true)}
                    className="hidden lg:flex w-8 h-8 items-center justify-center text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-all"
                  >
                    <Settings className="w-4 h-4" />
                  </button>

                  <div className="w-px h-5 bg-gray-200 dark:bg-slate-700 mx-1" />

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-gray-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    გასვლა
                  </button>
                </>
              ) : !isLoginPage ? (
                <>
                  <div className="w-px h-5 bg-gray-200 dark:bg-slate-700 mx-1" />
                  <Link
                    href="/login"
                    className="px-5 py-2.5 text-[13px] font-semibold text-white bg-[#2B4EFF] hover:bg-[#1a35d9] rounded-xl transition-all shadow-sm hover:shadow-md hover:shadow-blue-500/20 active:scale-95"
                  >
                    შესვლა
                  </Link>
                </>
              ) : null}
            </div>

            {/* ── Mobile hamburger ── */}
            <div className="sm:hidden flex items-center gap-1.5">
              <ThemeToggle />
              <button
                className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all"
                onClick={() => setMobileOpen(o => !o)}
                aria-label="მენიუს გახსნა"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

          </div>
        </div>

        {/* ── Mobile drawer ── */}
        {mobileOpen && (
          <div className="sm:hidden border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-5 py-4 space-y-2">
              {user ? (
                <>
                  <div className="flex items-center gap-3 px-3 py-3 bg-gray-50 dark:bg-slate-800 rounded-xl mb-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGradient()} flex items-center justify-center text-white font-bold text-sm`}>
                      {user.name?.charAt(0).toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{user.name}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-400">{roleLabel()}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => { setIsProfileOpen(true); setMobileOpen(false); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                  >
                    <Settings className="w-4 h-4 text-gray-400 dark:text-slate-400" />
                    პარამეტრები
                  </button>

                  {user.role === 'ADMIN' && (
                    <Link
                      href="/whitelist"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                    >
                      <Users className="w-4 h-4 text-gray-400 dark:text-slate-400" />
                      მომხმარებლები
                    </Link>
                  )}

                  {user.role === 'ADMIN' && (
                    <Link
                      href="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-all"
                    >
                      <Shield className="w-4 h-4 text-gray-400 dark:text-slate-400" />
                      ადმინი
                    </Link>
                  )}

                  <div className="pt-2 mt-2 border-t border-gray-100 dark:border-slate-800">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                      გასვლა
                    </button>
                  </div>
                </>
              ) : !isLoginPage ? (
                <div className="pt-1">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center w-full py-3 text-sm font-semibold text-white bg-[#2B4EFF] hover:bg-[#1a35d9] rounded-xl shadow-sm transition-all"
                  >
                    სისტემაში შესვლა
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </header>

      {user && (
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          currentUser={user}
          onUserUpdated={(u) => { if (onUserUpdated) onUserUpdated(u as UserType); }}
        />
      )}
    </>
  );
}
