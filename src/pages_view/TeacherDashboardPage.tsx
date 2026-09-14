import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Plus, 
  Calendar, 
  Users, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  Trash2, 
  ChevronRight, 
  School,
  X,
  Paperclip
} from 'lucide-react';
import { Subject, TeacherUser, AssignmentWithMeta } from '@/types';
import { getTeacherDashboardData, createAssignment, deleteAssignment, uploadFile } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import DateTimePicker from '@/components/DateTimePicker';

export default function TeacherDashboardPage() {
  const [, navigate] = useLocation();
  const [user, setUser] = useState<TeacherUser | null>(null);
  const [assignments, setAssignments] = useState<AssignmentWithMeta[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

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

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (!profile || profile.role !== 'TEACHER') {
        navigate('/login');
        return;
      }
      setUser(profile as TeacherUser);

      const data = await getTeacherDashboardData(session.user.id);
      setAssignments(data.assignments);
      setSubjects(data.subjects);
      if (data.subjects && data.subjects.length > 0 && !newSubjectId) {
        setNewSubjectId(data.subjects[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const result = await uploadFile(file);
      setNewAttachmentUrl(result.fileUrl);
      setNewAttachmentName(result.fileName);
    } catch (err: any) {
      alert(err.message || 'ფაილის ატვირთვა ვერ მოხერხდა');
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
        subjectId: newSubjectId || (subjects[0]?.id),
        teacherId: user.id,
        title: newTitle,
        description: newDescription,
        dueDate: newDueDate,
        attachmentUrl: newAttachmentUrl,
        attachmentName: newAttachmentName,
        allowedFormats,
      });

      setIsModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      setNewDueDate('');
      setNewAttachmentUrl('');
      setNewAttachmentName('');
      setAllowedFormats([]);
      loadData();
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'შეცდომა სერვერთან დაკავშირებისას');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteAssignment = async (id: string, title: string) => {
    if (!confirm(`ნამდვილად გსურთ წაშალოთ დავალება: "${title}"?`)) return;

    try {
      await deleteAssignment(id);
      setAssignments((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error(err);
      alert('წაშლა ვერ მოხერხდა');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const totalSubmissions = assignments.reduce((acc, a) => acc + (a.submissionsCount || 0), 0);

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-indigo-100">
            <School className="w-3.5 h-3.5" />
            <span>მასწავლებლის სამუშაო სივრცე</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            გამარჯობა, {user?.name}! 👋
          </h1>
          <p className="text-indigo-100 text-sm max-w-xl">
            აქ შეგიძლიათ მარტივად განათავსოთ ახალი დავალებები და შეამოწმოთ მოსწავლეთა მიერ გამოგზავნილი ნამუშევრები Gmail-ის გარეშე.
          </p>
        </div>

        <button
          onClick={() => {
            setIsModalOpen(true);
            setFormError('');
          }}
          className="shrink-0 inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-white text-indigo-700 font-bold text-sm shadow-lg hover:bg-indigo-50 hover:shadow-xl transition-all transform active:scale-95"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          ახალი დავალების შექმნა
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">აქტიური დავალებები</p>
            <p className="text-2xl font-black text-slate-900">{assignments.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">სულ ჩაბარებული</p>
            <p className="text-2xl font-black text-slate-900">{totalSubmissions}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">საგანი</p>
            <p className="text-lg font-bold text-slate-900">{user?.subject || 'მათემატიკა'}</p>
          </div>
        </div>
      </div>

      {/* Assignments List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            ჩემი დავალებები ({assignments.length})
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            სია დალაგებულია ბოლო დამატებულის მიხედვით
          </span>
        </div>

        {assignments.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-4">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">ჯერ არ გაქვთ დამატებული დავალება</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
              დააჭირეთ ღილაკს და შექმენით პირველი საშინაო დავალება თქვენი მოსწავლეებისათვის.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md"
            >
              <Plus className="w-4 h-4" />
              დავალების შექმნა
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {assignments.map((assignment) => {
              const submissionRate = Math.round(
                (assignment.submissionsCount / (assignment.totalStudents || 1)) * 100
              );

              const formattedDueDate = new Date(assignment.dueDate).toLocaleDateString('ka-GE', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={assignment.id}
                  className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group"
                >
                  <div className="space-y-2 flex-1 min-w-0 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {assignment.subjectName}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        ვადა: {formattedDueDate}
                      </span>
                      {assignment.attachmentUrl && (
                        <span className="inline-flex max-w-full items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 truncate">
                          <Paperclip className="w-3 h-3 shrink-0" />
                          <span className="truncate">მიმაგრებული ფაილი</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors break-words">
                      {assignment.title}
                    </h3>
                    <p className="text-sm text-slate-600 line-clamp-2 max-w-2xl break-words">
                      {assignment.description}
                    </p>
                  </div>

                  {/* Submission Progress & Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                    <div className="w-full sm:w-44 bg-slate-50 rounded-xl p-2.5 border border-slate-200/60">
                      <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                        <span className="text-slate-600">ჩაბარებულია:</span>
                        <span className="text-indigo-700">
                          {assignment.submissionsCount} / {assignment.totalStudents} მოსწავლე
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, submissionRate)}%` }}
                        />
                      </div>
                    </div>

                    <Link
                      href={`/teacher/assignments/${assignment.id}`}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition-all whitespace-nowrap"
                    >
                      <span>ჩაბარებების ნახვა</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>

                    <button
                      onClick={() => handleDeleteAssignment(assignment.id, assignment.title)}
                      className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0 flex items-center justify-center self-end sm:self-center border border-slate-200/40 sm:border-transparent"
                      title="დავალების წაშლა"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Create New Assignment */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white text-left rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed Modal Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100 shrink-0 bg-white">
              <div>
                <h3 className="text-xl font-black text-slate-900">
                  ახალი საშინაო დავალების შექმნა
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  შეავსეთ დავალების ინფორმაცია თქვენი მოსწავლეებისათვის
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleCreateAssignment} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    საგანი
                  </label>
                  <select
                    value={newSubjectId}
                    onChange={(e) => setNewSubjectId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    დავალების სათაური *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="მაგ: კვადრატული განტოლებები, გვერდი 45 N1-10"
                    className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    ინსტრუქცია და აღწერა *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="დეტალურად აღუწერეთ მოსწავლეებს რა უნდა გააკეთონ..."
                    className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    ჩაბარების ბოლო ვადა *
                  </label>
                  <DateTimePicker
                    value={newDueDate}
                    onChange={(val) => setNewDueDate(val)}
                  />
                </div>

                {/* Allowed Formats */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    დაშვებული ფაილის ფორმატები
                  </label>
                  <p className="text-xs text-slate-500 mb-3">მონიშნეთ, თუ გსურთ მხოლოდ კონკრეტული ტიპის ფაილების ატვირთვის უფლება მისცეთ მოსწავლეებს (თუ არცერთს მონიშნავთ, ნებისმიერი ფორმატი იქნება დაშვებული).</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: '.pdf', label: 'PDF' },
                      { id: '.doc,.docx', label: 'Word' },
                      { id: '.ppt,.pptx', label: 'PowerPoint' },
                      { id: '.xls,.xlsx', label: 'Excel' },
                      { id: '.jpg,.jpeg,.png,.webp', label: 'სურათები' }
                    ].map(format => (
                      <label key={format.id} className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                          checked={allowedFormats.includes(format.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAllowedFormats([...allowedFormats, format.id]);
                            } else {
                              setAllowedFormats(allowedFormats.filter(f => f !== format.id));
                            }
                          }}
                        />
                        <span className="text-sm font-semibold text-slate-700">{format.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Optional Attachment */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    დამხმარე მასალის მიმაგრება (სურვილისამებრ)
                  </label>
                  {newAttachmentUrl ? (
                    <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-sm gap-2">
                      <span className="font-semibold text-indigo-900 truncate flex-1 min-w-0">
                        📎 {newAttachmentName}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setNewAttachmentUrl('');
                          setNewAttachmentName('');
                        }}
                        className="text-xs text-rose-600 hover:underline font-bold shrink-0"
                      >
                        წაშლა
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl cursor-pointer bg-slate-50/50 hover:bg-indigo-50/30 transition-colors">
                      <Upload className="w-5 h-5 text-slate-400 mb-1" />
                      <span className="text-xs font-semibold text-slate-600">
                        {uploadingFile ? 'იტვირთება...' : 'დააჭირეთ ფაილის ასარჩევად (PDF, სურათი, Word)'}
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

              {/* Fixed Modal Footer */}
              <div className="p-4 sm:p-5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  გაუქმება
                </button>
                <button
                  type="submit"
                  disabled={creating || uploadingFile}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-200 disabled:opacity-50 transition-all"
                >
                  {creating ? 'იქმნება...' : 'დავალების გამოქვეყნება'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

