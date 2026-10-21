import { localizeError } from '@/lib/messages';
import React, { useState } from 'react';
import { Link } from 'wouter';
import { Eye, EyeOff, ArrowRight, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useDialog } from '@/components/ui/DialogProvider';

interface LoginPageProps {
  onLoginSuccess?: () => void;
}

function validateEmail(emailStr: string): boolean {
  if (!emailStr || typeof emailStr !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(emailStr.trim());
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const { showAlert } = useDialog();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot password modal state
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError || !data.user) {
        let msg = authError?.message || 'ელ.ფოსტა ან პაროლი არასწორია';
        if (msg.includes('Invalid login credentials')) {
          msg = 'ელ.ფოსტა ან პაროლი არასწორია. სცადეთ ხელახლა.';
        }
        showAlert(msg, 'error');
        setLoading(false);
        return;
      }

      if (!data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        showAlert('შესვლამდე დაადასტურეთ ელფოსტა მიღებული მოწვევის ბმულით.', 'error');
        setLoading(false);
        return;
      }
      setLoading(false);
      if (onLoginSuccess) onLoginSuccess();

    } catch (err) {
      console.error(err);
      showAlert('სისტემური შეცდომა. გთხოვთ სცადოთ მოგვიანებით.', 'error');
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    if (!validateEmail(resetEmail)) {
      setResetError('გთხოვთ მიუთითოთ ვალიდური ელფოსტის მისამართი');
      return;
    }

    setResetLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('password-recovery', {
        body: { email: resetEmail.trim().toLowerCase() },
      });

      if (error) {
        let message = 'პაროლის აღდგენა ვერ მოხერხდა. სცადეთ მოგვიანებით.';
        if ('context' in error && error.context instanceof Response) {
          try { const payload = await error.context.json(); if (typeof payload.error === 'string') message = payload.error; } catch { /* Preserve fallback for network failures. */ }
        }
        setResetError(message);
        return;
      }

      if (!data?.success) { setResetError('პაროლის აღდგენა ვერ მოხერხდა. სცადეთ მოგვიანებით.'); return; }
      setResetSuccess('მოთხოვნა დადასტურებულია. პაროლის აღდგენის ბმული გაიგზავნა თქვენს ელფოსტაზე.');
    } catch (err: any) {
      setResetError(localizeError(err, 'შეცდომა პაროლის აღდგენისას'));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-5 sm:px-8 py-8 sm:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 overflow-hidden rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">

      {/* ── Left: Branding panel (desktop only) ── */}
      <div className="hidden lg:flex flex-col justify-between gap-10 bg-[#111827] p-10 xl:p-14 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        {/* Blue accent blob */}
        <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full bg-[#2B4EFF]/15 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <h2 className="text-[38px] font-black text-white leading-tight tracking-tight mb-5">
            ბიზნესისა და<br />ტექნოლოგიების<br />
            <span className="text-[#2B4EFF]">აკადემია</span>
          </h2>
          <p className="text-gray-500 dark:text-slate-400 text-[14px] leading-relaxed max-w-xs">
            30 წელზე მეტი გამოცდილების კოლეჯი, სადაც სწავლება ახლა ციფრულ ეპოქაშია.
          </p>
        </div>

        <div className="relative z-10">
          <img
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=700&q=80&fit=crop"
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            alt="სტუდენტები"
            className="w-full rounded-2xl object-cover shadow-2xl opacity-60"
            style={{ height: 220 }}
          />
        </div>
      </div>

      {/* ── Right: Login form ── */}
      <div className="flex items-center justify-center px-5 sm:px-10 py-10 sm:py-14 bg-white dark:bg-slate-900 transition-colors duration-300">
        <div className="w-full max-w-[400px]">

          {/* Header */}
          <div className="mb-9">
            <h1 className="text-[28px] font-black text-[#111827] dark:text-white tracking-tight leading-tight mb-2">
              სისტემაში შესვლა
            </h1>
            <p className="text-[14px] text-gray-400 dark:text-slate-400">
              შეიყვანეთ BTA-ს მიერ გაცემული მონაცემები
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-email-input" className="block text-[12px] font-semibold text-gray-500 dark:text-slate-300 mb-2 uppercase tracking-wide">
                ელ. ფოსტა
              </label>
              <input
                id="login-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mail@bta.ge"
                autoComplete="email"
                className="w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:border-[#2B4EFF] focus:bg-white dark:focus:bg-slate-800 rounded-xl text-[14px] text-gray-800 dark:text-white font-medium transition-all outline-none placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="login-password-input" className="block text-[12px] font-semibold text-gray-500 dark:text-slate-300 uppercase tracking-wide">
                  პაროლი
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email.trim());
                    setResetError('');
                    setResetSuccess('');
                    setForgotModalOpen(true);
                  }}
                  className="text-[12px] font-semibold text-[#2B4EFF] hover:underline transition-colors"
                >
                  დაგავიწყდათ პაროლი?
                </button>
              </div>
              <div className="relative">
                <input
                  id="login-password-input"
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full px-4 pr-12 py-3.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:border-[#2B4EFF] focus:bg-white dark:focus:bg-slate-800 rounded-xl text-[14px] text-gray-800 dark:text-white font-medium transition-all outline-none placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  tabIndex={-1}
                  aria-label={showPass ? 'პაროლის დამალვა' : 'პაროლის ჩვენება'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 p-1.5 rounded-lg transition-colors"
                >
                  {showPass
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 text-[14px] font-semibold text-white bg-[#2B4EFF] hover:bg-[#1a35d9] disabled:opacity-60 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm hover:shadow-md hover:shadow-blue-500/25 active:scale-[0.98] mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  მიმდინარეობს შესვლა...
                </>
              ) : (
                <>
                  შესვლა
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-[12px] text-center text-gray-400 dark:text-slate-500 leading-relaxed">
            პლატფორმა განკუთვნილია <span className="font-semibold text-gray-500 dark:text-slate-400">BTA-ს</span> სტუდენტებისა და მასწავლებლებისთვის.
          </p>

          {/* Legal links in LoginPage */}
          <div className="mt-4 flex items-center justify-center gap-3 text-[12px] text-gray-400 dark:text-slate-500">
            <Link href="/privacy" className="hover:text-[#2B4EFF] dark:hover:text-[#2B4EFF] transition-colors underline">
              კონფიდენციალურობის პოლიტიკა
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-[#2B4EFF] dark:hover:text-[#2B4EFF] transition-colors underline">
              გამოყენების წესები
            </Link>
          </div>
        </div>
      </div>

      </div>
      {/* ── Modal: Password Recovery ("პაროლის აღდგენა") ── */}
      {forgotModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setForgotModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgot-password-modal-title"
            className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-150 text-left p-6 sm:p-7 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 id="forgot-password-modal-title" className="text-xl font-black text-gray-900 dark:text-slate-100">
                  პაროლის აღდგენა
                </h2>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                  შეიყვანეთ თქვენი რეგისტრირებული ელ. ფოსტა
                </p>
              </div>
              <button
                type="button"
                onClick={() => setForgotModalOpen(false)}
                aria-label="დახურვა"
                className="w-9 h-9 rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetSuccess ? (
              <div role="status" className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-semibold space-y-3 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mx-auto" />
                <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">{resetSuccess}</p>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(false)}
                  className="mt-2 px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  დახურვა
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} noValidate className="space-y-4">
                {resetError && (
                  <div role="alert" className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs font-semibold rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{resetError}</span>
                  </div>
                )}

                <div>
                  <label htmlFor="reset-email-field" className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    ელ. ფოსტის მისამართი *
                  </label>
                  <input
                    id="reset-email-field"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => { setResetEmail(e.target.value); setResetError(''); }}
                    aria-invalid={Boolean(resetError)}
                    placeholder="mail@bta.ge"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:border-[#2B4EFF] focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 rounded-xl text-sm outline-none transition-all text-gray-900 dark:text-slate-100"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    გაუქმება
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-5 py-2.5 rounded-xl bg-[#2B4EFF] hover:bg-[#1a35d9] text-white text-xs font-bold shadow-md shadow-blue-200 dark:shadow-none disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {resetLoading ? 'იგზავნება...' : 'ბმულის გაგზავნა'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
