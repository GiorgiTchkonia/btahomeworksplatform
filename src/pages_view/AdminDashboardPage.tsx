import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import {
  Shield,
  Users,
  School,
  GraduationCap,
  Search,
  Lock,
  Mail,
  BookOpen,
  Phone,
} from 'lucide-react';
import { SafeTeacherUser, SafeStudentUser, SafeAdminUser, SafeUser } from '@/types';
import { getAllUsersForAdmin } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export default function AdminDashboardPage() {
  const [, navigate] = useLocation();
  const [, setCurrentUser] = useState<SafeAdminUser | null>(null);
  const [teachers, setTeachers] = useState<SafeTeacherUser[]>([]);
  const [students, setStudents] = useState<SafeStudentUser[]>([]);
  const [admins, setAdmins] = useState<SafeAdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'TEACHER' | 'STUDENT'>('ALL');

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login');
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (!profile || profile.role !== 'ADMIN') {
        navigate('/login');
        return;
      }
      setCurrentUser(profile as SafeAdminUser);

      const data = await getAllUsersForAdmin();
      setTeachers(data.teachers as SafeTeacherUser[]);
      setStudents(data.students as SafeStudentUser[]);
      setAdmins(data.admins as SafeAdminUser[]);
      
    } catch (err) {
      console.error(err);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Combine and filter user lists
  const allUsers: SafeUser[] = [...teachers, ...students];

  const filteredUsers = allUsers.filter((u) => {
    // Role filter
    if (activeTab === 'TEACHER' && u.role !== 'TEACHER') return false;
    if (activeTab === 'STUDENT' && u.role !== 'STUDENT') return false;

    // Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchName = (u.name || '').toLowerCase().includes(q);
    const matchEmail = (u.email || '').toLowerCase().includes(q);
    const matchSubject = (u as SafeTeacherUser).subject?.toLowerCase().includes(q);
    const matchGrade = (u as SafeStudentUser).grade?.toLowerCase().includes(q);

    return matchName || matchEmail || matchSubject || matchGrade;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-sm">იტვირთება მონაცემები...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl shadow-slate-900/10 border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold tracking-wide uppercase">
              <Shield className="w-4 h-4 text-indigo-400" />
              <span>უსაფრთხო ადმინ პანელი</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              მომხმარებელთა მართვა (Whitelist)
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-xl">
              დაამატეთ ან წაშალეთ მასწავლებლები და მოსწავლეები. ყველა პაროლი დაშიფრულია bcrypt-ით.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.open('https://sazjrfsxnyxkxyxnqquv.supabase.co/project/sazjrfsxnyxkxyxnqquv/auth/users', '_blank')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all text-sm shrink-0"
            >
              <Shield className="w-5 h-5" />
              <span>მართვა Supabase-ში</span>
            </button>
          </div>
        </div>

        {/* Subtle Decorative Background Glow */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">სულ სიაში</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{allUsers.length}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <School className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">მასწავლებლები</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{teachers.length}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">მოსწავლეები</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{students.length}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">დაცვის დონე</div>
            <div className="text-sm font-black text-emerald-600 mt-0.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Supabase Auth + RLS
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Role Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'ALL'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ყველა ({allUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('TEACHER')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'TEACHER'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            მასწავლებლები ({teachers.length})
          </button>
          <button
            onClick={() => setActiveTab('STUDENT')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'STUDENT'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            მოსწავლეები ({students.length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ძებნა სახელით, მეილით ან საგნით..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl text-slate-900 text-sm transition-all outline-none"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-6">მომხმარებელი</th>
                <th className="py-4 px-6">როლი</th>
                <th className="py-4 px-6">დამატებითი ინფორმაცია</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold">მომხმარებელი ვერ მოიძებნა</p>
                    <p className="text-xs text-slate-400 mt-1">სცადეთ შეცვალოთ საძიებო პარამეტრები</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isTeacher = u.role === 'TEACHER';
                  const teacher = isTeacher ? (u as SafeTeacherUser) : null;
                  const student = !isTeacher ? (u as SafeStudentUser) : null;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                              isTeacher
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {u.name ? u.name.charAt(0) : '?'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{u.name}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3.5 h-3.5 text-slate-400" />
                              <span>{u.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        {isTeacher ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                            <School className="w-3.5 h-3.5" />
                            მასწავლებელი
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            <GraduationCap className="w-3.5 h-3.5" />
                            მოსწავლე
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        {isTeacher && teacher ? (
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                              <span>საგანი: {teacher.subject}</span>
                            </div>
                            {teacher.phone && (
                              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                <span>{teacher.phone}</span>
                              </div>
                            )}
                          </div>
                        ) : student ? (
                          <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                            <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />
                            <span>კლასი: {student.grade}</span>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Information Note */}
      <div className="bg-slate-900 text-slate-300 rounded-2xl p-6 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-white font-bold text-sm">ადმინისტრატორის ანგარიში დაცულია</div>
            <div className="text-xs text-slate-400 mt-0.5">
              ადმინისტრატორის პაროლი ინახება bcrypt-ით (Salt 12). ადმინების სია დამალულია საჯარო API-დან.
            </div>
          </div>
        </div>
        <div className="text-xs font-mono bg-slate-800 px-3 py-1.5 rounded-lg text-slate-300 border border-slate-700">
          admin@academy.ge
        </div>
      </div>
    </div>
  );
}
