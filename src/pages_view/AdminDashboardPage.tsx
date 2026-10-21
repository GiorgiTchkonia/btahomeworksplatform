import { localizeError } from '@/lib/messages';
import React, { useState, useEffect } from 'react';
import GroupManager from '@/components/GroupManager';
import CustomSelect from '@/components/ui/CustomSelect';
import TeacherSubjectPicker from '@/components/TeacherSubjectPicker';
import { CollegeGroup } from '@/types';
import { getCollegeGroups, educationOptions, programmeLabel } from '@/lib/groups';
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
  Key,
  AlertCircle,
  RotateCcw
} from 'lucide-react';
import { SafeTeacherUser, SafeStudentUser, SafeAdminUser, SafeUser, Role } from '@/types';
import { getAllUsersForAdmin, addWhitelistUser, adminUpdateUser, deleteWhitelistUser } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useDialog } from '@/components/ui/DialogProvider';

export default function AdminDashboardPage() {
  const { showAlert, showConfirm } = useDialog();
  const [, navigate] = useLocation();
  const [currentUser, setCurrentUser] = useState<SafeAdminUser | null>(null);
  const [teachers, setTeachers] = useState<SafeTeacherUser[]>([]);
  const [students, setStudents] = useState<SafeStudentUser[]>([]);
  const [admins, setAdmins] = useState<SafeAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'TEACHER' | 'STUDENT' | 'ADMIN'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'ADD' | 'EDIT'>('ADD');
  const [editingUser, setEditingUser] = useState<SafeUser | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    password: string;
    role: Role;
    subject: string;
    grade: string;
    phone: string;
  }>({
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
  const [groups, setGroups] = useState<CollegeGroup[]>([]);
  const [studentGroup, setStudentGroup] = useState('');
  const [teacherSubjects,setTeacherSubjects] = useState<string[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
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
      setGroups(await getCollegeGroups());
      setTeachers(data.teachers as SafeTeacherUser[]);
      setStudents(data.students as SafeStudentUser[]);
      setAdmins(data.admins as SafeAdminUser[]);
      
    } catch (err: any) {
      console.error(err);
      setLoadError('მონაცემების ჩატვირთვა ვერ მოხერხდა. გთხოვთ სცადოთ თავიდან.');
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
    setTeacherSubjects(mode==='EDIT'&&user?.role==='TEACHER' ? (user.teaching_subjects || (user.subject?[user.subject]:[])) : []);
    setStudentGroup(mode === 'EDIT' && user?.role === 'STUDENT' ? user.group_id : '');
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
      if (formData.role === 'STUDENT' && !studentGroup) throw new Error('სტუდენტისთვის ჯგუფის არჩევა სავალდებულოა');
      if (formData.role==='TEACHER'&&!teacherSubjects.length) throw new Error('დაამატეთ მასწავლებლის მინიმუმ ერთი საგანი');
      if (modalMode === 'ADD') {
        const { password: _password, ...newUser } = formData;
        await addWhitelistUser({ ...newUser, teaching_subjects: formData.role==='TEACHER'?teacherSubjects:null, group_id: formData.role === 'STUDENT' ? studentGroup : null });
      } else if (modalMode === 'EDIT' && editingUser) {
        await adminUpdateUser(editingUser.id, { ...formData, teaching_subjects: formData.role==='TEACHER'?teacherSubjects:null, group_id: formData.role === 'STUDENT' ? studentGroup : null });
      }
      await loadData();
      setIsModalOpen(false);
      if (modalMode === 'ADD') showAlert('მოწვევა გაიგზავნა ელფოსტაზე. მომხმარებელი ბმულით დაადასტურებს მისამართს და დააყენებს პაროლს.', 'success');
      else showAlert('მომხმარებლის მონაცემების ცვლილება დადასტურებულია.', 'success');
    } catch (err: any) {
      setErrorMsg(localizeError(err, 'დაფიქსირდა შეცდომა'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (userId: string) => {
    showConfirm(
      'მომხმარებლის წაშლა',
      'ნამდვილად გსურთ მომხმარებლის წაშლა?',
      async () => {
        try {
          setLoading(true);
          await deleteWhitelistUser(userId);
          await loadData();
          showAlert('მომხმარებლის წაშლა დადასტურებულია.', 'success');
        } catch (err: any) {
          showAlert("წაშლისას დაფიქსირდა შეცდომა: " + (localizeError(err, "უცნობი შეცდომა")), 'error');
          setLoading(false);
        }
      }
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">იტვირთება მონაცემები...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-3xl text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">დაფიქსირდა შეცდომა</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">{loadError}</p>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-indigo-200 dark:shadow-none active:scale-[0.98]"
        >
          <RotateCcw className="w-4 h-4" />
          <span>ხელახლა ცდა</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <GroupManager groups={groups} teachers={teachers} students={students} onSaved={loadData} />
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-800 rounded-[1.5rem] p-6 sm:p-8 border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        {/* Subtle decorative background */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full border-[20px] border-indigo-50/50 pointer-events-none"></div>
        <div className="absolute bottom-0 right-32 -mb-12 w-40 h-40 rounded-full border-[10px] border-indigo-50/50 pointer-events-none"></div>

        <div className="space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-xs font-bold text-indigo-700 dark:text-indigo-300">
            <Shield className="w-3.5 h-3.5" />
            <span>ადმინისტრატორის პანელი</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            სისტემის მართვა
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xl leading-relaxed">
            მართეთ მომხმარებლები, საგნები და აკონტროლეთ პლატფორმის აქტივობა.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal('ADD')}
          className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm hover:shadow-md hover:shadow-indigo-500/20 transition-all active:scale-[0.98] text-sm relative z-10"
        >
          <Plus className="w-5 h-5" />
          <span>მომხმარებლის დამატება</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">სულ სიაში</div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">{allUsers.length}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ადმინები</div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">{admins.length}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <School className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">მასწავლებლები</div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">{teachers.length}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">სტუდენტები</div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-0.5">{students.length}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Role Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-700 rounded-xl w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
              activeTab === 'ALL'
                ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            ყველა ({allUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('ADMIN')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
              activeTab === 'ADMIN'
                ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            ადმინები ({admins.length})
          </button>
          <button
            onClick={() => setActiveTab('TEACHER')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
              activeTab === 'TEACHER'
                ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            მასწავლებლები ({teachers.length})
          </button>
          <button
            onClick={() => setActiveTab('STUDENT')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all whitespace-nowrap ${
              activeTab === 'STUDENT'
                ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            სტუდენტები ({students.length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md shrink-0">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ძებნა სახელით, მეილით ან საგნით..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl text-slate-900 dark:text-slate-100 text-sm transition-all outline-none"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700/80 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">მომხმარებელი</th>
                <th className="py-4 px-6">როლი</th>
                <th className="py-4 px-6">დამატებითი ინფორმაცია</th>
                <th className="py-4 px-6 text-right">მოქმედებები</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold">მომხმარებელი ვერ მოიძებნა</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">სცადეთ შეცვალოთ საძიებო პარამეტრები</p>
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
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                              isAdmin
                                ? 'bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300'
                                : isTeacher
                                ? 'bg-indigo-100 text-indigo-700 dark:text-indigo-300'
                                : 'bg-emerald-100 text-emerald-700 dark:text-emerald-400'
                            }`}
                          >
                            {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-slate-100">{u.name}</div>
                            <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${u.account_status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'}`}>
                              {u.account_status === 'ACTIVE' ? 'აქტიური' : u.account_status === 'PASSWORD_REQUIRED' ? 'პაროლი დასაყენებელია' : 'მოწვევის მოლოდინში'}
                            </span>
                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                              <span>{u.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        {isAdmin && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60">
                            <Shield className="w-3.5 h-3.5" />
                            ადმინისტრატორი
                          </span>
                        )}
                        {isTeacher && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60">
                            <School className="w-3.5 h-3.5" />
                            მასწავლებელი
                          </span>
                        )}
                        {isStudent && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60">
                            <GraduationCap className="w-3.5 h-3.5" />
                            სტუდენტი
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        {isTeacher && teacher ? (
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                              <span>საგანი: {teacher.subject || '-'}</span>
                            </div>
                            {teacher.phone && (
                              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                <span>{teacher.phone}</span>
                              </div>
                            )}
                          </div>
                        ) : student ? (
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <GraduationCap className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{student.grade || 'განათლება მითითებული არ არის'} · {groups.find(g => g.id === student.group_id)?.code || 'ჯგუფი'}</span>
                          </div>
                        ) : isAdmin ? (
                          <div className="text-xs text-slate-500 dark:text-slate-400 italic">
                            სისტემის მმართველი
                          </div>
                        ) : null}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenModal('EDIT', u)}
                            className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                            title="რედაქტირება"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {currentUser?.id !== u.id && (
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
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
      
      {/* Explain when academic links prevent account deletion. */}
      <div className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl p-6 border border-amber-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-slate-900 dark:text-slate-100 font-bold text-sm">ყურადღება მომხმარებლების მართვაზე</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              მასწავლებლის წაშლამდე მისი საგნები და დავალებები სხვა მასწავლებელს უნდა გადაებაროს.
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-modal-title"
            className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
              <h2 id="admin-modal-title" className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {modalMode === 'ADD' ? 'ახალი მომხმარებელი' : 'რედაქტირება'}
              </h2>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="დახურვა"
                className="p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div role="alert" className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 text-sm rounded-xl border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
                  {errorMsg}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="admin-user-name" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">სახელი და გვარი</label>
                  <input
                    id="admin-user-name"
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl outline-none transition-all text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label htmlFor="admin-user-email" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">ელ. ფოსტა</label>
                  <input
                    id="admin-user-email"
                    readOnly={modalMode === 'EDIT'}
                    aria-describedby="admin-email-help"
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl outline-none transition-all text-slate-900 dark:text-slate-100"
                  />
                </div>

                <p id="admin-email-help" className="text-sm text-slate-600 dark:text-slate-300">
                  {modalMode === 'ADD' ? 'მიუთითეთ მოქმედი ელფოსტა. მოწვევის ბმულით მომხმარებელი თავად დააყენებს პაროლს.' : 'ელფოსტას მომხმარებელი საკუთარი პროფილიდან ცვლის და წერილით ადასტურებს.'}
                </p>
                {modalMode === 'EDIT' && <div>
                  <label htmlFor="admin-user-password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    ახალი პაროლი (დატოვეთ ცარიელი თუ არ ცვლით)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <Key className="w-4 h-4" />
                    </div>
                    <input
                      id="admin-user-password"
                      type="password"
                      minLength={8}
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl outline-none transition-all text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </div>}

                <div>
                  <label htmlFor="admin-user-role" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">როლი</label>
                  <select
                    id="admin-user-role"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value as Role})}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl outline-none transition-all font-semibold text-slate-700 dark:text-slate-300"
                  >
                    <option value="STUDENT">სტუდენტი </option>
                    <option value="TEACHER">მასწავლებელი </option>
                    <option value="ADMIN">ადმინისტრატორი </option>
                  </select>
                </div>

                {formData.role === 'TEACHER' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2"><TeacherSubjectPicker value={teacherSubjects} onChange={setTeacherSubjects} /></div>

                    <div>
                      <label htmlFor="admin-user-phone" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">ტელეფონი</label>
                      <input
                        id="admin-user-phone"
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 rounded-xl outline-none transition-all text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>
                )}

                {formData.role === 'STUDENT' && (
                  <div>
                    <label htmlFor="admin-user-grade" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">სასკოლო განათლება / კლასი</label>
                    <CustomSelect id="admin-user-grade" value={formData.grade} onChange={grade=>setFormData({...formData,grade})} options={[...new Set([...educationOptions,...(formData.grade?[formData.grade]:[])])].map(value=>({value,label:value}))} placeholder="აირჩიეთ სასკოლო განათლება" />
                    <label htmlFor="admin-student-group" className="block text-sm font-semibold mt-4 mb-2">ჯგუფი *</label>
                    <CustomSelect id="admin-student-group" searchable required value={studentGroup} onChange={setStudentGroup} placeholder="აირჩიეთ სტუდენტის ჯგუფი" options={groups.filter(g=>g.active||g.id===studentGroup).map(g=>({value:g.id,label:g.code,description:programmeLabel(g.programme_type)+(!g.active?' · არქივში':'')}))} />
                  </div>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
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
