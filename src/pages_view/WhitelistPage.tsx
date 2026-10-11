import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { School, GraduationCap, ArrowLeft, Mail, ShieldCheck, X, AlertCircle, RefreshCw } from 'lucide-react';
import { SafeTeacherUser, SafeStudentUser } from '@/types';
import { getWhitelist } from '@/lib/api';

export default function WhitelistPage() {
  const [, navigate] = useLocation();
  const [teachers, setTeachers] = useState<SafeTeacherUser[]>([]);
  const [students, setStudents] = useState<SafeStudentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<SafeTeacherUser | SafeStudentUser | null>(null);

  const loadData = () => {
    setLoading(true);
    setLoadError(null);
    getWhitelist()
      .then((data) => {
        setTeachers(data.teachers as SafeTeacherUser[]);
        setStudents(data.students as SafeStudentUser[]);
      })
      .catch((err) => {
        console.error(err);
        setLoadError('მომხმარებელთა სიის ჩატვირთვა ვერ მოხერხდა.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-8 pb-16">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
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
            <span>მომხმარებელთა დადასტურებული სია (Whitelist)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            რეგისტრირებული მასწავლებლები და მოსწავლეები
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
            პლატფორმაზე დაშვებული მასწავლებლები და მოსწავლეების Whitelist სია. მითითებული პირები შეძლებენ პლატფორმაზე შეუფერხებლად ავტორიზაციას.
          </p>
        </div>

        <div className="bg-white/10 dark:bg-slate-800/40 backdrop-blur-md px-5 py-4 rounded-2xl border border-white/10 shrink-0 text-center">
          <div className="text-xs uppercase font-bold text-slate-400 dark:text-slate-500">სულ რეგისტრირებული</div>
          <div className="text-2xl font-black text-white mt-1">
            {teachers.length + students.length} მომხმარებელი
          </div>
        </div>
      </div>

      {loadError && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl p-6 text-center my-6">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <h3 className="text-base font-bold text-rose-900 dark:text-rose-200 mb-1">
            მონაცემების ჩატვირთვა ვერ მოხერხდა
          </h3>
          <p className="text-sm text-rose-700 dark:text-rose-300 mb-4">
            {loadError}
          </p>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            ხელახლა ცდა
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Teachers Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-lg">
              <School className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2>მასწავლებლების სია ({teachers.length})</h2>
            </div>

            <div className="space-y-3">
              {teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  onClick={() => setSelectedUser(teacher)}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{teacher.name}</span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100">
                        {teacher.subject}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium min-w-0">
                      <span className="flex items-center gap-1 min-w-0 truncate">
                        <Mail className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="truncate">{teacher.email}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Students Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-lg">
              <GraduationCap className="w-5 h-5 text-emerald-600" />
              <h2>მოსწავლეების სია ({students.length})</h2>
            </div>

            <div className="space-y-3">
              {students.map((student) => (
                <div
                  key={student.id}
                  onClick={() => setSelectedUser(student)}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/90 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{student.name}</span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100">
                        {student.grade}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium min-w-0">
                      <span className="flex items-center gap-1 min-w-0 truncate">
                        <Mail className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="truncate">{student.email}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="whitelist-modal-title"
            className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200"
          >
            {/* Header/Cover */}
            <div className={`h-24 w-full ${selectedUser.role === 'TEACHER' ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                aria-label="დახურვა"
                className="absolute top-4 right-4 p-2 bg-white/20 dark:bg-slate-800/40 hover:bg-white/30 dark:hover:bg-slate-800/60 text-white rounded-full transition-colors backdrop-blur-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Avatar */}
            <div className="px-6 flex flex-col items-center -mt-12">
              <div className={`w-24 h-24 rounded-2xl flex items-center justify-center text-4xl font-bold text-white shadow-xl border-4 border-white ${selectedUser.role === 'TEACHER' ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
                {selectedUser.name ? selectedUser.name.charAt(0) : '?'}
              </div>
              
              <h3 id="whitelist-modal-title" className="mt-3 text-xl font-bold text-slate-900 dark:text-slate-100 text-center">
                {selectedUser.name}
              </h3>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
                {selectedUser.role === 'TEACHER' ? 'მასწავლებელი' : 'მოსწავლე'}
              </p>
            </div>

            {/* Details */}
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">ელ. ფოსტა</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[150px]">{selectedUser.email}</span>
                </div>
                <div className="h-px bg-slate-200 dark:bg-slate-600"></div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    {selectedUser.role === 'TEACHER' ? 'საგანი' : 'კლასი'}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {selectedUser.role === 'TEACHER' ? (selectedUser as SafeTeacherUser).subject : (selectedUser as SafeStudentUser).grade}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
