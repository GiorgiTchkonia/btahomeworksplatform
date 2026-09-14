import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { GraduationCap, School, KeyRound, Mail, AlertCircle, ArrowRight, Shield } from 'lucide-react';
import { Role } from '@/types';
import { supabase } from '@/lib/supabase';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [, navigate] = useLocation();
  const [role, setRole] = useState<Role>('TEACHER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !data.user) {
        setError(authError?.message || 'არასწორი ელ. ფოსტა ან პაროლი');
        setLoading(false);
        return;
      }

      // We no longer need to check role manually here because App.tsx 
      // will trigger checkUser() via onAuthStateChange and redirect appropriately.
      if (onLoginSuccess) onLoginSuccess();
      
    } catch (err) {
      console.error(err);
      setError('დაფიქსირდა შეცდომა, სცადეთ თავიდან');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center py-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-xl shadow-indigo-100 mb-4">
            <GraduationCap className="w-9 h-9" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            საშინაო დავალებების პორტალი
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            გთხოვთ აირჩიოთ თქვენი სტატუსი და გაიაროთ ავტორიზაცია
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-6 sm:p-8">
          {/* Role Toggle */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 text-center">
              ვინ ბრძანდებით?
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setRole('TEACHER');
                  setError('');
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg font-bold text-xs sm:text-sm transition-all ${
                  role === 'TEACHER'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <School className="w-4 h-4" />
                <span className="truncate">მასწავლებელი</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole('STUDENT');
                  setError('');
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg font-bold text-xs sm:text-sm transition-all ${
                  role === 'STUDENT'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span className="truncate">მოსწავლე</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRole('ADMIN');
                  setError('');
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg font-bold text-xs sm:text-sm transition-all ${
                  role === 'ADMIN'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span className="truncate">ადმინი</span>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                ელექტრონული ფოსტა (Email)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={role === 'ADMIN' ? 'admin@academy.ge' : role === 'TEACHER' ? 'nino.gelashvili@academy.ge' : 'luka.beridze@academy.ge'}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl text-slate-900 text-sm transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                პაროლი
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="შეიყვანეთ პაროლი"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl text-slate-900 text-sm transition-all outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all flex items-center justify-center gap-2 disabled:opacity-60 text-base"
            >
              {loading ? (
                <span>მოწმდება...</span>
              ) : (
                <>
                  <span>სისტემაში შესვლა</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

