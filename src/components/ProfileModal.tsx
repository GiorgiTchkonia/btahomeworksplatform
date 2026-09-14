import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  User as UserIcon,
  Mail,
  Phone,
  BookOpen,
  GraduationCap,
  Lock,
  Shield,
  School,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Settings,
} from 'lucide-react';
import { User, SafeUser, SafeTeacherUser, SafeStudentUser } from '@/types';
import { updateProfile } from '@/lib/api';
import { supabase } from '@/lib/supabase';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | SafeUser;
  onUserUpdated: (updatedUser: SafeUser) => void;
}

export default function ProfileModal({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
}: ProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'INFO' | 'PASSWORD'>('INFO');

  // Personal Info form
  const [name, setName] = useState(currentUser.name || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [phone, setPhone] = useState((currentUser as SafeTeacherUser).phone || '');
  const [subject, setSubject] = useState((currentUser as SafeTeacherUser).subject || '');
  const [grade, setGrade] = useState((currentUser as SafeStudentUser).grade || 'X კლასი');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setPhone((currentUser as SafeTeacherUser).phone || '');
      setSubject((currentUser as SafeTeacherUser).subject || '');
      setGrade((currentUser as SafeStudentUser).grade || 'X კლასი');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setSuccessMsg('');
    }
  }, [isOpen, currentUser]);

  // Lock body scroll and handle Escape key for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const isTeacher = currentUser.role === 'TEACHER';
  const isStudent = currentUser.role === 'STUDENT';
  const isAdmin = currentUser.role === 'ADMIN';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // If changing password, validate match
    if (activeTab === 'PASSWORD' || newPassword) {
      if (!currentPassword) {
        setError('გთხოვთ შეიყვანოთ მიმდინარე პაროლი');
        return;
      }
      if (newPassword.length < 6) {
        setError('ახალი პაროლი უნდა შეიცავდეს მინიმუმ 6 სიმბოლოს');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('ახალი პაროლები არ ემთხვევა ერთმანეთს');
        return;
      }
    }

    setLoading(true);

    try {
      const payload: any = {
        name: name.trim(),
      };

      if (email.trim() !== currentUser.email) {
        payload.email = email.trim();
      }

      if (isTeacher) {
        payload.phone = phone.trim();
        payload.subject = subject.trim();
      } else if (isStudent) {
        payload.grade = grade.trim();
      }

      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const updatedProfile = await updateProfile(
        currentUser.id,
        currentUser.email,
        payload,
        currentPassword || undefined
      );
      setSuccessMsg('პროფილის მონაცემები წარმატებით განახლდა!');
      onUserUpdated(updatedProfile as SafeUser);

      if (newPassword) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }

      setTimeout(() => {
        setSuccessMsg('');
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'სერვერთან კავშირი შეწყდა');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full max-h-[calc(100vh-2.5rem)] sm:max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 shrink-0 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-bold text-lg text-white shadow-md shrink-0 ${
                  isAdmin
                    ? 'bg-gradient-to-tr from-amber-600 to-orange-500 shadow-amber-200'
                    : isTeacher
                    ? 'bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-indigo-200'
                    : 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-200'
                }`}
              >
                {currentUser.name ? currentUser.name.charAt(0) : '?'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                    {currentUser.name}
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                      isAdmin
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : isTeacher
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {isAdmin ? (
                      <>
                        <Shield className="w-3 h-3" />
                        ადმინი
                      </>
                    ) : isTeacher ? (
                      <>
                        <School className="w-3 h-3" />
                        მასწავლებელი
                      </>
                    ) : (
                      <>
                        <GraduationCap className="w-3 h-3" />
                        მოსწავლე
                      </>
                    )}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">{currentUser.email}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Fixed Tabs */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl mt-4">
            <button
              type="button"
              onClick={() => {
                setActiveTab('INFO');
                setError('');
                setSuccessMsg('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-bold text-xs sm:text-sm transition-all ${
                activeTab === 'INFO'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>პირადი მონაცემები</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('PASSWORD');
                setError('');
                setSuccessMsg('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-bold text-xs sm:text-sm transition-all ${
                activeTab === 'PASSWORD'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>პაროლის შეცვლა</span>
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 sm:p-6 py-4 overflow-y-auto flex-1 space-y-4">
            {/* Alerts */}
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{successMsg}</span>
              </div>
            )}

            {activeTab === 'INFO' ? (
              <>
                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    სახელი და გვარი
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl text-slate-900 text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    ელექტრონული ფოსტა
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl text-slate-900 text-sm outline-none transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    გამოიყენება სისტემაში ავტორიზაციისთვის
                  </p>
                </div>

                {/* Teacher Fields */}
                {isTeacher && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                        საგანი
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          required
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl text-slate-900 text-sm outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                        ტელეფონის ნომერი
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Phone className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+995 599 00 11 22"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl text-slate-900 text-sm outline-none transition-all"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Student Fields */}
                {isStudent && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                      კლასი
                    </label>
                    <select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl text-slate-900 text-sm outline-none transition-all"
                    >
                      <option value="VII კლასი">VII კლასი</option>
                      <option value="VIII კლასი">VIII კლასი</option>
                      <option value="IX კლასი">IX კლასი</option>
                      <option value="X კლასი">X კლასი</option>
                      <option value="XI კლასი">XI კლასი</option>
                      <option value="XII კლასი">XII კლასი</option>
                    </select>
                  </div>
                )}
              </>
            ) : (
              /* Password Tab */
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    მიმდინარე პაროლი *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="შეიყვანეთ ძველი პაროლი"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl text-slate-900 text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    ახალი პაროლი * (მინიმუმ 6 სიმბოლო)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="შეიყვანეთ ახალი პაროლი"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl text-slate-900 text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
                    გაიმეორეთ ახალი პაროლი *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="გაიმეორეთ ახალი პაროლი"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl text-slate-900 text-sm outline-none transition-all"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Fixed Footer */}
          <div className="p-4 sm:p-5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors"
            >
              დახურვა
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-100 transition-all disabled:opacity-60 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>ინახება...</span>
                </>
              ) : (
                <span>ცვლილებების შენახვა</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
