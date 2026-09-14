import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { GraduationCap, LogOut, User, Users, Shield, Settings } from 'lucide-react';
import { User as UserType, SafeTeacherUser, SafeStudentUser } from '@/types';
import { supabase } from '@/lib/supabase';
import ProfileModal from './ProfileModal';

interface NavbarProps {
  user: UserType | null;
  onLogout?: () => void;
  onUserUpdated?: (user: UserType) => void;
}

export default function Navbar({ user, onLogout, onUserUpdated }: NavbarProps) {
  const [location, navigate] = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      if (onLogout) onLogout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isLoginPage = location === '/login';

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                აკადემია
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                საშინაო დავალებები
              </span>
            </div>
          </Link>

          {/* User Section */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Whitelist Directory Link */}
            {user && (
              <Link
                href="/whitelist"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-lg border border-slate-200 transition-colors"
                title="სია (Whitelist)"
              >
                <Users className="w-4 h-4 text-slate-500" />
                <span className="hidden md:inline">სია (Whitelist)</span>
              </Link>
            )}

            {/* Admin Dashboard Quick Link */}
            {user?.role === 'ADMIN' && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
                title="ადმინ პანელი"
              >
                <Shield className="w-4 h-4 text-indigo-600" />
                <span className="hidden md:inline">ადმინ პანელი</span>
              </Link>
            )}

            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Profile Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(true)}
                  className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-200 text-left group hover:opacity-90 transition-opacity"
                  title="პროფილის ნახვა და რედაქტირება"
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ring-2 ring-transparent group-hover:ring-indigo-300 transition-all ${
                      user.role === 'ADMIN'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    {user.name ? user.name.charAt(0) : '?'}
                  </div>
                  <div className="hidden sm:block text-left min-w-0">
                    <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[130px] md:max-w-[190px] group-hover:text-indigo-600 transition-colors">
                      {user.name}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500 truncate max-w-[130px] md:max-w-[190px]">
                      {user.role === 'ADMIN'
                        ? '🛡️ ადმინისტრატორი'
                        : user.role === 'TEACHER'
                        ? `👨‍🏫 ${(user as SafeTeacherUser).subject || 'მასწავლებელი'}`
                        : `🎓 ${(user as SafeStudentUser).grade || 'მოსწავლე'}`}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setIsProfileOpen(true)}
                  className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-lg border border-slate-200 transition-colors"
                  title="პროფილის რედაქტირება"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-500" />
                  <span>პროფილი</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-rose-200/60"
                  title="სისტემიდან გამოსვლა"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">გამოსვლა</span>
                </button>
              </div>
            ) : !isLoginPage ? (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-all"
              >
                <User className="w-4 h-4" />
                შესვლა
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </header>

    {/* Profile Modal mounted at top level */}
    {user && (
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={user}
        onUserUpdated={(updatedUser) => {
          if (onUserUpdated) onUserUpdated(updatedUser as UserType);
        }}
      />
    )}
  </>
  );
}
