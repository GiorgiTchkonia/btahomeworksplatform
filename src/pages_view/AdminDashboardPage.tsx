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
  Plus,
  Edit2,
  Trash2,
  X,
  Key
} from 'lucide-react';
import { SafeTeacherUser, SafeStudentUser, SafeAdminUser, SafeUser } from '@/types';
import { getAllUsersForAdmin, addWhitelistUser, adminUpdateUser, deleteWhitelistUser } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export default function AdminDashboardPage() {
  const [, navigate] = useLocation();
  const [currentUser, setCurrentUser] = useState<SafeAdminUser | null>(null);
  const [teachers, setTeachers] = useState<SafeTeacherUser[]>([]);
  const [students, setStudents] = useState<SafeStudentUser[]>([]);
  const [admins, setAdmins] = useState<SafeAdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'TEACHER' | 'STUDENT' | 'ADMIN'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'ADD' | 'EDIT'>('ADD');
  const [editingUser, setEditingUser] = useState<SafeUser | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STUDENT',
    subject: '',
    grade: '',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
  const allUsers: SafeUser[] = [...admins, ...teachers, ...students];

  const filteredUsers = allUsers.filter((u) => {
    // Role filter
    if (activeTab === 'ADMIN' && u.role !== 'ADMIN') return false;
    if (activeTab === 'TEACHER' && u.role !== 'TEACHER') return false;
    if (activeTab === 'STUDENT' && u.role !== 'STUDENT') return false;

    // Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchName = (u.name || '').toLowerCase().includes(q);
    const matchEmail = (u.email || '').toLowerCase().includes(q);
    
    const teacherSubject = (u as SafeTeacherUser).subject || '';
    const matchSubject = teacherSubject.toLowerCase().includes(q);
    
    const studentGrade = (u as SafeStudentUser).grade || '';
    const matchGrade = studentGrade.toLowerCase().includes(q);

    return matchName || matchEmail || matchSubject || matchGrade;
  });

  const handleOpenModal = (mode: 'ADD' | 'EDIT', user?: SafeUser) => {
    setModalMode(mode);
    setErrorMsg('');
    if (mode === 'EDIT' && user) {
      setEditingUser(user);
      setFormData({
        name: user.name || '',
        email: user.email || '',
        password: '', // Leave blank for edit
        role: user.role || 'STUDENT',
        subject: (user as SafeTeacherUser).subject || '',
        grade: (user as SafeStudentUser).grade || '',
        phone: (user as SafeTeacherUser).phone || ''
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'STUDENT',
        subject: '',
        grade: '',
        phone: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      if (modalMode === 'ADD') {
        if (!formData.password) {
          throw new Error("პაროლი სავალდებულოა ახალი მომხმარებლისთვის");
        }
        await addWhitelistUser(formData);
      } else if (modalMode === 'EDIT' && editingUser) {
        await adminUpdateUser(editingUser.id, formData);
      }
      await loadData();
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'დაფიქსირდა შეცდომა');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm("ნამდვილად გსურთ მომხმარებლის წაშლა?")) return;
    try {
      setLoading(true);
      await deleteWhitelistUser(userId);
      await loadData();
    } catch (err: any) {
      alert("წაშლისას დაფიქსირდა შეცდომა: " + (err.message || "უცნობი შეცდომა"));
      setLoading(false);
    }
  };

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
              მართეთ ადმინისტრატორები (Administrator), მასწავლებლები და მოსწავლეები პირდაპირ საიტიდან.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleOpenModal('ADD')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all text-sm shrink-0"
            >
              <Plus className="w-5 h-5" />
              <span>მომხმარებლის დამატება</span>
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
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">ადმინები</div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">{admins.length}</div>
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
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Role Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
              activeTab === 'ALL'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ყველა ({allUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('ADMIN')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
              activeTab === 'ADMIN'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ადმინები ({admins.length})
          </button>
          <button
            onClick={() => setActiveTab('TEACHER')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
              activeTab === 'TEACHER'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            მასწავლებლები ({teachers.length})
          </button>
          <button
            onClick={() => setActiveTab('STUDENT')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
              activeTab === 'STUDENT'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            მოსწავლეები ({students.length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md shrink-0">
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
                <th className="py-4 px-6 text-right">მოქმედებები</th>
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
                  const isAdmin = u.role === 'ADMIN';
                  const isTeacher = u.role === 'TEACHER';
                  const isStudent = u.role === 'STUDENT';
                  
                  const teacher = isTeacher ? (u as SafeTeacherUser) : null;
                  const student = isStudent ? (u as SafeStudentUser) : null;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                              isAdmin
                                ? 'bg-slate-200 text-slate-700'
                                : isTeacher
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {u.name ? u.name.charAt(0).toUpperCase() : '?'}
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
                        {isAdmin && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/60">
                            <Shield className="w-3.5 h-3.5" />
                            Administrator
                          </span>
                        )}
                        {isTeacher && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                            <School className="w-3.5 h-3.5" />
                            მასწავლებელი
                          </span>
                        )}
                        {isStudent && (
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
                              <span>საგანი: {teacher.subject || '-'}</span>
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
                            <span>კლასი: {student.grade || '-'}</span>
                          </div>
                        ) : isAdmin ? (
                          <div className="text-xs text-slate-500 italic">
                            სისტემის მმართველი
                          </div>
                        ) : null}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenModal('EDIT', u)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="რედაქტირება"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {currentUser?.id !== u.id && (
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="წაშლა"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Note about admin key */}
      <div className="bg-slate-900 text-slate-300 rounded-2xl p-6 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-white font-bold text-sm">ყურადღება მომხმარებლების მართვაზე</div>
            <div className="text-xs text-slate-400 mt-0.5">
              მომხმარებლების დასამატებლად / წასაშლელად საჭიროა <code>VITE_SUPABASE_SERVICE_ROLE_KEY</code> იყოს <code>.env</code> ფაილში.
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">
                {modalMode === 'ADD' ? 'ახალი მომხმარებელი' : 'რედაქტირება'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">სახელი და გვარი</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">ელ. ფოსტა</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    {modalMode === 'ADD' ? 'პაროლი' : 'ახალი პაროლი (დატოვეთ ცარიელი თუ არ ცვლით)'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Key className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required={modalMode === 'ADD'}
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">როლი</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl outline-none transition-all font-semibold text-slate-700"
                  >
                    <option value="STUDENT">მოსწავლე (Student)</option>
                    <option value="TEACHER">მასწავლებელი (Teacher)</option>
                    <option value="ADMIN">ადმინისტრატორი (Administrator)</option>
                  </select>
                </div>

                {formData.role === 'TEACHER' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">საგანი</label>
                      <input
                        type="text"
                        value={formData.subject}
                        onChange={(e) => setFormData({...formData, subject: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">ტელეფონი</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl outline-none transition-all"
                      />
                    </div>
                  </div>
                )}

                {formData.role === 'STUDENT' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">კლასი</label>
                    <input
                      type="text"
                      value={formData.grade}
                      onChange={(e) => setFormData({...formData, grade: e.target.value})}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl outline-none transition-all"
                    />
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  გაუქმება
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isSubmitting ? 'მიმდინარეობს...' : 'შენახვა'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
