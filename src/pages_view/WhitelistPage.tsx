import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { School, GraduationCap, ArrowLeft, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { SafeTeacherUser, SafeStudentUser, Role } from '@/types';
import { getWhitelist } from '@/lib/api';

interface WhitelistPageProps {
  onLoginSuccess?: () => void;
}

export default function WhitelistPage({ onLoginSuccess }: WhitelistPageProps) {
  const [, navigate] = useLocation();
  const [teachers, setTeachers] = useState<SafeTeacherUser[]>([]);
  const [students, setStudents] = useState<SafeStudentUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWhitelist()
      .then((data) => {
        setTeachers(data.teachers as SafeTeacherUser[]);
        setStudents(data.students as SafeStudentUser[]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const loginAs = async (email: string, role: Role) => {
    // Whitelist page no longer stores or uses passwords —
    // redirect to login page for security
    navigate('/login');
  };

  return (
    <div className="space-y-8 pb-16">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          მთავარ გვერდზე დაბრუნება
        </Link>
      </div>

      {/* Info Card */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>მომხმარებელთა ავტორიზებული სია (Whitelist)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            აკადემიის მასწავლებლები და მოსწავლეები
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
            პლატფორმა იყენებს მარტივ და დაცულ Whitelist მოდელს. ნებისმიერი ახალი მასწავლებლის ან მოსწავლის დამატება ხდება პირდაპირ <code className="bg-white/10 px-1.5 py-0.5 rounded text-indigo-300">data/whitelist.json</code> ფაილში.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md px-5 py-4 rounded-2xl border border-white/10 shrink-0 text-center">
          <div className="text-xs uppercase font-bold text-slate-400">სულ რეგისტრირებული</div>
          <div className="text-2xl font-black text-white mt-1">
            {teachers.length + students.length} მომხმარებელი
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Teachers Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
              <School className="w-5 h-5 text-indigo-600" />
              <h2>მასწავლებლების სია ({teachers.length})</h2>
            </div>

            <div className="space-y-3">
              {teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900">{teacher.name}</span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {teacher.subject}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium min-w-0">
                      <span className="flex items-center gap-1 min-w-0 truncate">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{teacher.email}</span>
                      </span>
                    </div>
                  </div>

                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white font-bold text-xs transition-colors shadow-sm shrink-0"
                  >
                    <span>შესვლა</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Students Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
              <GraduationCap className="w-5 h-5 text-emerald-600" />
              <h2>მოსწავლეების სია ({students.length})</h2>
            </div>

            <div className="space-y-3">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900">{student.name}</span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {student.grade}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium min-w-0">
                      <span className="flex items-center gap-1 min-w-0 truncate">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{student.email}</span>
                      </span>
                    </div>
                  </div>

                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white font-bold text-xs transition-colors shadow-sm shrink-0"
                  >
                    <span>შესვლა</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
