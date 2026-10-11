import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Plus, Calendar, Users, FileText, CheckCircle2,
  AlertCircle, Upload, Trash2, ChevronRight, School, X, Paperclip, RotateCcw,
  Edit3, Save
} from 'lucide-react';
import { Subject, TeacherUser, AssignmentWithMeta } from '@/types';
import { getTeacherDashboardData, createAssignment, deleteAssignment, uploadFile, updateAssignment } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import DateTimePicker from '@/components/DateTimePicker';
import { useDialog } from '@/components/ui/DialogProvider';
import CustomCheckbox from '@/components/ui/CustomCheckbox';

export default function TeacherDashboardPage() {
  const [, navigate] = useLocation();
  const { showAlert, showConfirm } = useDialog();
  const [user, setUser] = useState<TeacherUser | null>(null);
  const [assignments, setAssignments] = useState<AssignmentWithMeta[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [newAttachmentName, setNewAttachmentName] = useState('');
  const [allowedFormats, setAllowedFormats] = useState<string[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  // Edit Assignment Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editAllowedFormats, setEditAllowedFormats] = useState<string[]>([]);
  const [editFormError, setEditFormError] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }

      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', session.user.id).single();
      if (!profile || profile.role !== 'TEACHER') { navigate('/login'); return; }
      setUser(profile as TeacherUser);

      const data = await getTeacherDashboardData(session.user.id);
      setAssignments(data.assignments);
      setSubjects(data.subjects);
      if (data.subjects?.length > 0 && !newSubjectId) {
        setNewSubjectId(data.subjects[0].id);
      }
    } catch (err: any) {
      console.error(err);
      setLoadError(err?.message || 'მონაცემების ჩატვირთვა ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const result = await uploadFile(file);
      setNewAttachmentUrl(result.fileUrl);
      setNewAttachmentName(result.fileName);
    } catch (err: any) {
      showAlert(err.message || 'ფაილის ატვირთვა ვერ მოხერხდა', 'error');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newTitle.trim() || !newDescription.trim() || !newDueDate || !user) {
      setFormError('გთხოვთ შეავსოთ ყველა სავალდებულო ველი');
      return;
    }

    setCreating(true);
    try {
      await createAssignment({
        teacherId: user.id,
        subjectId: newSubjectId,
        title: newTitle.trim(),
        description: newDescription.trim(),
        dueDate: newDueDate,
        attachmentUrl: newAttachmentUrl || undefined,
        attachmentName: newAttachmentName || undefined,
        allowedFormats: allowedFormats.length > 0 ? allowedFormats : undefined,
      });

      setIsModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      setNewDueDate('');
      setNewAttachmentUrl('');
      setNewAttachmentName('');
      setAllowedFormats([]);
      setFormError('');
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'დავალების შექმნა ვერ მოხერხდა');
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (a: AssignmentWithMeta) => {
    setEditingAssignmentId(a.id);
    setEditTitle(a.title);
    setEditDescription(a.description);
    setEditDueDate(a.dueDate);
    setEditAllowedFormats(a.allowedFormats || []);
    setEditFormError('');
    setIsEditModalOpen(true);
  };

  const handleUpdateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignmentId) return;

    if (!editTitle.trim() || !editDescription.trim() || !editDueDate) {
      setEditFormError('გთხოვთ შეავსოთ ყველა სავალდებულო ველი');
      return;
    }

    setUpdating(true);
    setEditFormError('');
    try {
      await updateAssignment(editingAssignmentId, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        dueDate: editDueDate,
        allowedFormats: editAllowedFormats,
      });
      setIsEditModalOpen(false);
      showAlert('დავალება წარმატებით განახლდა', 'success');
      await loadData();
    } catch (err: any) {
      setEditFormError(err.message || 'დავალების განახლება ვერ მოხერხდა');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteAssignment = (id: string, title: string) => {
    showConfirm(
      'დავალების წაშლა',
      `ნამდვილად გსურთ წაშლა: "${title}"?`,
      async () => {
        try {
          await deleteAssignment(id);
          setAssignments((prev) => prev.filter((a) => a.id !== id));
        } catch (err) {
          console.error(err);
          showAlert('წაშლა ვერ მოხერხდა', 'error');
        }
      }
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2B4EFF]" />
      </div>
    );
  }

  const totalSubmissions = assignments.reduce((acc, a) => acc + (a.submissionsCount || 0), 0);

  return (
    <div className="space-y-6 pb-12">

      {/* ── Header Banner ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-7 border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-bl-full bg-[#2B4EFF]/3 pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2B4EFF]/8 text-[11px] font-bold text-[#2B4EFF] uppercase tracking-widest">
            <School className="w-3.5 h-3.5" />
            <span>მასწავლებლის პანელი</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-slate-100">
            გამარჯობა, {user?.name}
          </h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm max-w-xl leading-relaxed">
            შექმენით დავალებები, მიეცით ვადები და ადევნეთ თვალი მოსწავლეების პროგრესს ერთ ადგილიდან.
          </p>
        </div>

        <button
          onClick={() => { setIsModalOpen(true); setFormError(''); }}
          className="shrink-0 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#2B4EFF] text-white font-bold text-sm shadow-sm hover:bg-[#1a35d9] hover:shadow-md hover:shadow-blue-500/20 transition-all active:scale-[0.98] relative z-10"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          ახალი დავალება
        </button>
      </div>

      {/* ── Error Banner with Retry ── */}
      {loadError && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                შეცდომა მონაცემების ჩატვირთვისას
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-400 mt-0.5">
                {loadError}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            ხელახლა ცდა
          </button>
        </div>
      )}

      {/* ── Stats row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#2B4EFF]/8 text-[#2B4EFF] flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">გამოქვეყნებული</p>
            <p className="text-2xl font-black text-gray-900 dark:text-slate-100">{assignments.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">სულ ჩაბარება</p>
            <p className="text-2xl font-black text-gray-900 dark:text-slate-100">{totalSubmissions}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">საგანი</p>
            <p className="text-lg font-bold text-gray-900 dark:text-slate-100 truncate">{user?.subject || 'მასწავლებელი'}</p>
          </div>
        </div>
      </div>

      {/* ── Assignments list ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
            ჩემი დავალებები ({assignments.length})
          </h2>
          <span className="text-xs text-gray-400 dark:text-slate-500 font-medium hidden sm:block">
            განსახილველი ნამუშევრები ნაჩვენებია ყველა დავალებასთან
          </span>
        </div>

        {assignments.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 sm:p-14 text-center border border-dashed border-gray-200 dark:border-slate-700">
            <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-slate-900 text-gray-300 mx-auto flex items-center justify-center mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-slate-200">ჯერ არ გაქვთ დავალებები</h3>
            <p className="text-sm text-gray-400 dark:text-slate-500 max-w-md mx-auto mt-1 mb-6">
              შექმენით პირველი დავალება ღილაკზე დაჭერით ზემოთ.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2B4EFF] hover:bg-[#1a35d9] text-white font-bold text-sm rounded-xl shadow-md"
            >
              <Plus className="w-4 h-4" />
              დავალების შექმნა
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => {
              const formattedDueDate = new Date(assignment.dueDate).toLocaleDateString('ka-GE', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
              });
              const isPastDue = new Date(assignment.dueDate).getTime() < Date.now();

              return (
                <div
                  key={assignment.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    {/* Left */}
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#2B4EFF]/8 text-[#2B4EFF] border border-[#2B4EFF]/12">
                          {assignment.subjectName}
                        </span>
                        <span className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${isPastDue ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-gray-50 dark:bg-slate-900 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700'}`}>
                          <Calendar className="w-3.5 h-3.5" />
                          ვადა: {formattedDueDate}
                        </span>
                        {isPastDue && (
                          <span className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            ვადა ამოიწურა
                          </span>
                        )}
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100 break-words">{assignment.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{assignment.description}</p>

                      {assignment.attachmentUrl && (
                        <div className="inline-flex max-w-full items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-900/30 rounded-xl border border-amber-100 text-xs font-semibold text-amber-800 overflow-hidden">
                          <Paperclip className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="truncate">{assignment.attachmentName || 'მიმაგრებული ფაილი'}</span>
                        </div>
                      )}
                    </div>

                    {/* Right: Stats + Actions */}
                    <div className="flex sm:flex-col items-center sm:items-end gap-3 shrink-0">
                      <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-slate-300">
                        <Users className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                        <span>{assignment.submissionsCount || 0} ჩაბარება</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/teacher/assignments/${assignment.id}`}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2B4EFF]/8 text-[#2B4EFF] hover:bg-[#2B4EFF] hover:text-white font-bold text-xs transition-all"
                        >
                          ნახვა
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => openEditModal(assignment)}
                          className="p-2 text-gray-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-all"
                          title="რედაქტირება"
                          aria-label="დავალების რედაქტირება"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAssignment(assignment.id, assignment.title)}
                          className="p-2 text-gray-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-all"
                          title="წაშლა"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create Assignment Modal ── */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-assignment-title"
            className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between shrink-0">
              <div>
                <h2 id="create-assignment-title" className="text-xl font-black text-gray-900 dark:text-slate-100">ახალი დავალება</h2>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">შეავსეთ ყველა სავალდებულო ველი</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="დახურვა"
                className="w-9 h-9 rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable form */}
            <form onSubmit={handleCreateAssignment} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
                {formError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs font-semibold rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Subject */}
                <div>
                  <label htmlFor="teacher-subject-select" className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">საგანი</label>
                  <select
                    id="teacher-subject-select"
                    value={newSubjectId}
                    onChange={(e) => setNewSubjectId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:border-[#2B4EFF] focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 rounded-xl text-sm font-semibold outline-none transition-all text-gray-900 dark:text-slate-100"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label htmlFor="teacher-title-input" className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    სათაური <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="teacher-title-input"
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="მაგ: საშინაო დავალება #1"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:border-[#2B4EFF] focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 rounded-xl text-sm outline-none transition-all text-gray-900 dark:text-slate-100"
                  />
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="teacher-desc-input" className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    აღწერა / დავალება <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="teacher-desc-input"
                    required
                    rows={4}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="დეტალურად აღწერეთ დავალება..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:border-[#2B4EFF] focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 rounded-xl text-sm outline-none resize-none transition-all text-gray-900 dark:text-slate-100"
                  />
                </div>

                {/* Due date */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    ჩაბარების ვადა <span className="text-red-500">*</span>
                  </label>
                  <DateTimePicker value={newDueDate} onChange={(val) => setNewDueDate(val)} />
                </div>

                {/* Allowed formats */}
                <div className="pt-1 border-t border-gray-100 dark:border-slate-700">
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    ნებადართული ფორმატები
                  </label>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">
                    თუ არ აირჩევთ, ნებისმიერი ფორმატის ჩაბარება შეეძლებათ (ყველა ფორმატი დაშვებული იქნება).
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: '.pdf', label: 'PDF' },
                      { id: '.doc,.docx', label: 'Word' },
                      { id: '.ppt,.pptx', label: 'PowerPoint' },
                      { id: '.xls,.xlsx', label: 'Excel' },
                      { id: '.jpg,.jpeg,.png,.webp', label: 'სურათი' },
                    ].map((format) => (
                      <div key={format.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                        <CustomCheckbox
                          label={format.label}
                          checked={allowedFormats.includes(format.id)}
                          onChange={(checked) => {
                            if (checked) {
                              setAllowedFormats([...allowedFormats, format.id]);
                            } else {
                              setAllowedFormats(allowedFormats.filter((f) => f !== format.id));
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Optional attachment */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    დამხმარე ფაილი (სურვილისამებრ)
                  </label>
                  {newAttachmentUrl ? (
                    <div className="flex items-center justify-between p-3 bg-[#2B4EFF]/8 rounded-xl border border-[#2B4EFF]/15 text-sm gap-2">
                      <span className="font-semibold text-[#2B4EFF] truncate flex-1 min-w-0 flex items-center gap-2">
                        <Paperclip className="w-4 h-4 shrink-0" />
                        {newAttachmentName}
                      </span>
                      <button
                        type="button"
                        onClick={() => { setNewAttachmentUrl(''); setNewAttachmentName(''); }}
                        className="text-xs text-red-600 hover:underline font-bold shrink-0"
                      >
                        წაშლა
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-gray-200 dark:border-slate-700 hover:border-[#2B4EFF]/40 dark:hover:border-[#2B4EFF]/60 rounded-xl cursor-pointer bg-gray-50 dark:bg-slate-900/50 hover:bg-[#2B4EFF]/4 dark:hover:bg-[#2B4EFF]/10 transition-all">
                      <Upload className="w-5 h-5 text-gray-400 dark:text-slate-500 mb-1.5" />
                      <span className="text-xs font-semibold text-gray-600 dark:text-slate-400 text-center">
                        {uploadingFile ? 'მიმდინარეობს ატვირთვა...' : 'ატვირთეთ ფაილი (PDF, სურათი, Word)'}
                      </span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.pptx,.txt"
                        disabled={uploadingFile}
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Fixed footer */}
              <div className="p-4 sm:p-5 bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  გაუქმება
                </button>
                <button
                  type="submit"
                  disabled={creating || uploadingFile}
                  className="px-6 py-2.5 rounded-xl bg-[#2B4EFF] hover:bg-[#1a35d9] text-white text-sm font-bold shadow-md shadow-blue-200 disabled:opacity-50 transition-all"
                >
                  {creating ? 'იქმნება...' : 'დავალების გამოქვეყნება'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Assignment Modal ── */}
      {isEditModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-sm"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-assignment-dashboard-title"
            className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between shrink-0">
              <div>
                <h2 id="edit-assignment-dashboard-title" className="text-xl font-black text-gray-900 dark:text-slate-100">
                  დავალების რედაქტირება
                </h2>
                <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">შეცვალეთ სასურველი პარამეტრები</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                aria-label="დახურვა"
                className="w-9 h-9 rounded-full bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable form */}
            <form onSubmit={handleUpdateAssignment} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
                {editFormError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs font-semibold rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{editFormError}</span>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label htmlFor="edit-title-input" className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    სათაური <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="edit-title-input"
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="მაგ: საშინაო დავალება #1"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:border-[#2B4EFF] focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 rounded-xl text-sm outline-none transition-all text-gray-900 dark:text-slate-100"
                  />
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="edit-desc-input" className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    აღწერა / დავალება <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="edit-desc-input"
                    required
                    rows={4}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="დეტალურად აღწერეთ დავალება..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:border-[#2B4EFF] focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 rounded-xl text-sm outline-none resize-none transition-all text-gray-900 dark:text-slate-100"
                  />
                </div>

                {/* Due date */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    ჩაბარების ვადა <span className="text-red-500">*</span>
                  </label>
                  <DateTimePicker value={editDueDate} onChange={(val) => setEditDueDate(val)} />
                </div>

                {/* Allowed formats */}
                <div className="pt-1 border-t border-gray-100 dark:border-slate-700">
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    ნებადართული ფორმატები
                  </label>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">
                    თუ არ აირჩევთ, ნებისმიერი ფორმატის ჩაბარება შეეძლებათ.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: '.pdf', label: 'PDF' },
                      { id: '.doc,.docx', label: 'Word' },
                      { id: '.ppt,.pptx', label: 'PowerPoint' },
                      { id: '.xls,.xlsx', label: 'Excel' },
                      { id: '.jpg,.jpeg,.png,.webp', label: 'სურათი' },
                    ].map((format) => (
                      <div key={format.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                        <CustomCheckbox
                          label={format.label}
                          checked={editAllowedFormats.includes(format.id)}
                          onChange={(checked) => {
                            if (checked) {
                              setEditAllowedFormats([...editAllowedFormats, format.id]);
                            } else {
                              setEditAllowedFormats(editAllowedFormats.filter((f) => f !== format.id));
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-slate-700 flex items-center justify-end gap-3 shrink-0 bg-gray-50 dark:bg-slate-900/50">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  გაუქმება
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-6 py-2.5 rounded-xl bg-[#2B4EFF] hover:bg-[#1a35d9] text-white text-sm font-bold shadow-md shadow-blue-200 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {updating ? 'ინახება...' : 'ცვლილებების შენახვა'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
