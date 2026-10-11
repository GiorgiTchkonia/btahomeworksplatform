import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'wouter';
import { 
  GraduationCap, 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Upload, 
  FileText, 
  AlertCircle, 
  Calendar, 
  ExternalLink,
  Paperclip,
  RotateCcw,
  X,
  Send,
  Award
} from 'lucide-react';
import { StudentUser, SubjectProgress, Submission, StudentAssignmentWithStatus } from '@/types';
import { getStudentDashboardData, submitHomework, uploadFile, cancelSubmission } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useDialog } from '@/components/ui/DialogProvider';

export default function StudentDashboardPage() {
  const { showAlert, showConfirm } = useDialog();
  const [, navigate] = useLocation();
  const [user, setUser] = useState<StudentUser | null>(null);
  const [subjectsWithProgress, setSubjectsWithProgress] = useState<SubjectProgress[]>([]);
  const [assignments, setAssignments] = useState<StudentAssignmentWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filter state
  const [filter, setFilter] = useState<'ALL' | 'TODO' | 'SUBMITTED' | 'APPROVED' | 'DECLINED'>('ALL');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('ALL');

  // Submit Modal State
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [currentAssignment, setCurrentAssignment] = useState<StudentAssignmentWithStatus | null>(null);
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [submissionLink, setSubmissionLink] = useState('');
  const [submitMode, setSubmitMode] = useState<'FILE' | 'LINK'>('FILE');
  const [studentComment, setStudentComment] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Lock body scroll and handle Escape key for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && submitModalOpen) {
        setSubmitModalOpen(false);
      }
    };

    if (submitModalOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [submitModalOpen]);

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
      if (!profile || profile.role !== 'STUDENT') {
        navigate('/login');
        return;
      }
      setUser(profile as StudentUser);

      const data = await getStudentDashboardData(session.user.id);
      setSubjectsWithProgress(data.subjectsWithProgress);
      setAssignments(data.assignmentsWithStatus);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setSubmitError('');

    try {
      const result = await uploadFile(file);
      setFileUrl(result.fileUrl);
      setFileName(result.fileName);
      setFileSize(result.fileSize);
    } catch (err: any) {
      setSubmitError(err.message || 'ფაილის ატვირთვა ვერ მოხერხდა');
    } finally {
      setUploading(false);
    }
  };

  const openSubmitModal = (assignment: any) => {
    setCurrentAssignment(assignment);
    setFileUrl(assignment.submission?.fileUrl || '');
    setFileName(assignment.submission?.fileName || '');
    setFileSize(assignment.submission?.fileSize || '');
    setSubmissionLink(assignment.submission?.submissionLink || '');
    setSubmitMode(assignment.submission?.submissionLink ? 'LINK' : 'FILE');
    setStudentComment(assignment.submission?.studentComment || '');
    setSubmitError('');
    setSubmitModalOpen(true);
  };

  const handleSubmitHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAssignment || !user) return;
    
    if (submitMode === 'FILE' && !fileUrl) {
      setSubmitError('გთხოვთ ატვირთოთ ფაილი');
      return;
    }
    if (submitMode === 'LINK') {
      if (!submissionLink.trim()) {
        setSubmitError('გთხოვთ მიუთითოთ ბმული');
        return;
      }
      const isGoogleLink = submissionLink.includes('drive.google.com') || submissionLink.includes('docs.google.com');
      if (!isGoogleLink) {
        setSubmitError('გთხოვთ მიუთითოთ მხოლოდ Google Drive-ის ან Google Docs-ის ბმული');
        return;
      }
    }

    setSubmitting(true);
    try {
      await submitHomework({
        assignmentId: currentAssignment.id,
        studentId: user.id,
        studentName: user.name,
        fileUrl: submitMode === 'FILE' ? fileUrl : '',
        fileName: submitMode === 'FILE' ? fileName : '',
        fileSize: submitMode === 'FILE' ? fileSize : '',
        submissionLink: submitMode === 'LINK' ? submissionLink : '',
        studentComment,
      });

      setSubmitModalOpen(false);
      loadData();
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message || 'დაფიქსირდა შეცდომა');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSubmission = (assignment: any) => {
    if (!assignment.submission) return;
    showConfirm(
      'დავალების წაშლა',
      'დარწმუნებული ხართ, რომ გსურთ ატვირთული დავალების წაშლა?',
      async () => {
        try {
          await cancelSubmission(assignment.submission.id);
          loadData();
        } catch (err: any) {
          console.error(err);
          showAlert(err.message || 'ფაილის წაშლა ვერ მოხერხდა', 'error');
        }
      }
    );
  };

  // Filter assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (selectedSubjectFilter !== 'ALL' && a.subjectId !== selectedSubjectFilter) {
        return false;
      }
      const isPastDue = new Date(a.dueDate).getTime() < Date.now();
      const status = a.submission ? a.submission.status : (isPastDue ? 'OVERDUE' : 'TODO');

      if (filter === 'ALL') return true;
      if (filter === 'TODO') return status === 'TODO' || status === 'DECLINED';
      if (filter === 'SUBMITTED') return status === 'SUBMITTED';
      if (filter === 'APPROVED') return status === 'APPROVED';
      if (filter === 'DECLINED') return status === 'DECLINED' || status === 'OVERDUE';
      return true;
    });
  }, [assignments, filter, selectedSubjectFilter]);

  const {
    totalAssignmentsCount,
    approvedCount,
    pendingCount,
    declinedCount,
    todoCount,
  } = useMemo(() => {
    const total = assignments.length;
    let approved = 0, pending = 0, declined = 0, todo = 0;

    for (const a of assignments) {
      const isPastDue = new Date(a.dueDate).getTime() < Date.now();
      const status = a.submission ? a.submission.status : (isPastDue ? 'OVERDUE' : 'TODO');
      
      if (status === 'APPROVED') approved++;
      else if (status === 'SUBMITTED') pending++;
      else if (status === 'DECLINED' || status === 'OVERDUE') declined++;
      
      if (status === 'TODO' || status === 'DECLINED') todo++;
    }

    return {
      totalAssignmentsCount: total,
      approvedCount: approved,
      pendingCount: pending,
      declinedCount: declined,
      todoCount: todo,
    };
  }, [assignments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
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
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-800 rounded-[1.5rem] p-6 sm:p-8 border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative overflow-hidden">
        
        {/* Subtle decorative background */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full border-[20px] border-indigo-50/50 pointer-events-none"></div>
        <div className="absolute bottom-0 right-32 -mb-12 w-40 h-40 rounded-full border-[10px] border-indigo-50/50 pointer-events-none"></div>

        <div className="space-y-3 max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-xs font-bold text-indigo-700 dark:text-indigo-300">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>მოსწავლის პორტალი • {user?.grade || 'X კლასი'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            გამარჯობა, {user?.name}! 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-xl">
            აქ ხედავთ თქვენს ყველა საშინაო დავალებას საგნების მიხედვით. შეგიძლიათ მარტივად ატვირთოთ რვეულის ფოტო ან ფაილი.
          </p>
        </div>

        {/* Overall Completion Ring / Badge */}
        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 flex items-center gap-6 w-full lg:w-auto shrink-0 justify-between lg:justify-start relative z-10">
          <div className="text-left">
            <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider mb-1">პროგრესი</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                {totalAssignmentsCount > 0 ? Math.round((approvedCount / totalAssignmentsCount) * 100) : 100}
              </span>
              <span className="text-lg font-bold text-indigo-400">%</span>
            </div>
          </div>
          <div className="text-xs space-y-2 text-slate-600 dark:text-slate-400 font-semibold pl-6 border-l border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> {approvedCount} დადასტურებული</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500"></div> {pendingCount} განსახილველი</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500"></div> {todoCount} შესასრულებელი</div>
          </div>
        </div>
      </div>

      {/* Per-Subject Progress Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>ჩემი საგნების პროგრესი</span>
          </h2>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            დააწკაპუნეთ საგანზე გასაფილტრად
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {subjectsWithProgress.map((sub) => {
            const isSelected = selectedSubjectFilter === sub.subjectId;

            return (
              <button
                key={sub.subjectId}
                onClick={() => {
                  setSelectedSubjectFilter(isSelected ? 'ALL' : sub.subjectId);
                }}
                className={`text-left p-5 rounded-2xl border transition-all duration-200 ${
                  isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/90 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm bg-indigo-50 dark:bg-indigo-900/30 shrink-0"
                  >
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {sub.percentage}%
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">{sub.subjectName}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{sub.teacherName}</p>

                {/* Mini Progress Bar */}
                <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${sub.percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <span>
                    {sub.completedAssignments} / {sub.totalAssignments} ჩაბარებული
                  </span>
                  {sub.declinedAssignments > 0 && (
                    <span className="text-rose-600 font-bold">
                      {sub.declinedAssignments} შესასწორებელი!
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Assignments Filter and List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            საშინაო დავალებები ({filteredAssignments.length})
          </h2>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-700 rounded-xl">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === 'ALL' ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              ყველა
            </button>
            <button
              onClick={() => setFilter('TODO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                filter === 'TODO' ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <span>შესასრულებელი</span>
              {todoCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center">
                  {todoCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setFilter('SUBMITTED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === 'SUBMITTED' ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              განსახილველი
            </button>
            <button
              onClick={() => setFilter('APPROVED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === 'APPROVED' ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              დადასტურებული
            </button>
            <button
              onClick={() => setFilter('DECLINED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === 'DECLINED' ? 'bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              უარყოფილი
            </button>
          </div>
        </div>

        {/* Assignment Cards List */}
        {filteredAssignments.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">ამ კატეგორიაში დავალებები არ მოიძებნა</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">შეცვალეთ ფილტრი ან აირჩიეთ სხვა საგანი</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredAssignments.map((assignment) => {
              const submission = assignment.submission as Submission | null;
              const formattedDueDate = new Date(assignment.dueDate).toLocaleDateString('ka-GE', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              const isPastDue = new Date(assignment.dueDate).getTime() < Date.now();
              const status = submission ? submission.status : (isPastDue ? 'OVERDUE' : 'TODO');

              return (
                <div
                  key={assignment.id}
                  className={`bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 border transition-all ${
                    (status === 'DECLINED' || status === 'OVERDUE')
                      ? 'border-rose-300 shadow-md ring-2 ring-rose-100'
                      : status === 'APPROVED'
                      ? 'border-emerald-200/80 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700/90 shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100">
                        {assignment.subjectName}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        მასწავლებელი: {assignment.teacherName}
                      </span>
                      <span
                        className={`flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          isPastDue && status !== 'APPROVED' && status !== 'SUBMITTED'
                            ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        ვადა: {formattedDueDate}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div className="flex flex-wrap items-center gap-2">
                      {status === 'APPROVED' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          დადასტურებულია ✅
                        </span>
                      )}
                      {status === 'DECLINED' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 animate-pulse">
                          <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                          უარყოფილია ❌
                        </span>
                      )}
                      {status === 'OVERDUE' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                          ვადაგასულია
                        </span>
                      )}
                      {status === 'SUBMITTED' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          განსახილველია ⏳
                        </span>
                      )}
                      {status === 'TODO' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          ჩასაბარებელია
                        </span>
                      )}

                      {/* Score / Grade Badge */}
                      {submission?.grade !== null && submission?.grade !== undefined && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-sm">
                          <Award className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          შეფასება: {submission.grade}/10
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="py-4 space-y-3">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{assignment.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed">
                      {assignment.description}
                    </p>

                    {/* Teacher attachment */}
                    {assignment.attachmentUrl && (
                      <div className="inline-flex max-w-full items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 overflow-hidden">
                        <Paperclip className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <span className="shrink-0">დამხმარე მასალა:</span>
                        <a
                          href={assignment.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-1 truncate min-w-0"
                        >
                          <span className="truncate">{assignment.attachmentName || 'ფაილის გახსნა'}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                    )}

                    {/* Declined Warning Box */}
                    {status === 'DECLINED' && submission?.teacherFeedback && (
                      <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-sm space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-rose-800">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>მასწავლებლის კომენტარი / უარყოფის მიზეზი:</span>
                        </div>
                        <p className="text-rose-900 font-medium pl-5 break-words">
                          "{submission.teacherFeedback}"
                        </p>
                        <p className="text-xs text-rose-700 dark:text-rose-400 pt-1 font-semibold pl-5">
                          გთხოვთ შეასწოროთ ხარვეზი და ხელახლა ატვირთოთ ნამუშევარი.
                        </p>
                      </div>
                    )}
                    
                    {/* Overdue message */}
                    {status === 'OVERDUE' && (
                      <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>დავალების ჩაბარების ვადა ამოიწურა, ჩაბარება შეუძლებელია.</span>
                      </div>
                    )}

                    {/* Approved Feedback Box */}
                    {status === 'APPROVED' && (submission?.teacherFeedback || (submission?.grade !== null && submission?.grade !== undefined)) && (
                      <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                        <div className="flex items-center gap-2 font-bold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>მასწავლებლის შეფასება:</span>
                          {submission?.grade !== null && submission?.grade !== undefined && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-200 font-black">
                              {submission.grade}/10 ქულა
                            </span>
                          )}
                        </div>
                        {submission?.teacherFeedback && (
                          <p className="pl-6 text-emerald-900 dark:text-emerald-200 font-medium break-words">
                            "{submission.teacherFeedback}"
                          </p>
                        )}
                      </div>
                    )}

                    {/* Previously submitted file/link info */}
                    {submission && (
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium pt-1">
                        <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="break-all">
                          ჩაბარებული ნამუშევარი: 
                          {submission.submissionLink ? (
                            <a href={submission.submissionLink} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold ml-1 flex inline-flex items-center gap-1">
                              ბმულის გახსნა <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <strong className="ml-1">{submission.fileName} ({submission.fileSize})</strong>
                          )}
                        </span>
                        <span>• დრო: {new Date(submission.submittedAt).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</span>
                      </div>
                    )}
                  </div>

                  {/* Submission Action Footer */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      {status === 'APPROVED'
                        ? 'დავალება წარმატებით ჩაბარებულია'
                        : status === 'SUBMITTED'
                        ? 'მასწავლებელი ამოწმებს თქვენს ნამუშევარს'
                        : status === 'DECLINED'
                        ? 'საჭიროა ხელახალი ჩაბარება'
                        : status === 'OVERDUE'
                        ? 'დავალების ვადა ამოიწურა'
                        : 'გადაუღეთ ფოტო რვეულს ან ატვირთეთ ფაილი'}
                    </div>

                    <div>
                      {!isPastDue && status === 'TODO' && (
                        <button
                          onClick={() => openSubmitModal(assignment)}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 transition-all active:scale-95"
                        >
                          <Upload className="w-4 h-4" />
                          დავალების ჩაბარება
                        </button>
                      )}

                      {!isPastDue && status === 'DECLINED' && (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            onClick={() => openSubmitModal(assignment)}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md shadow-rose-200 transition-all active:scale-95"
                          >
                            <RotateCcw className="w-4 h-4" />
                            ხელახლა ჩაბარება
                          </button>
                          <button
                            onClick={() => handleCancelSubmission(assignment)}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold text-sm transition-colors"
                          >
                            <X className="w-4 h-4" />
                            წაშლა
                          </button>
                        </div>
                      )}

                      {!isPastDue && status === 'SUBMITTED' && (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            onClick={() => openSubmitModal(assignment)}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            ფაილის შეცვლა
                          </button>
                          <button
                            onClick={() => handleCancelSubmission(assignment)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 font-bold text-xs transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            წაშლა
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Submit Homework */}
      {submitModalOpen && currentAssignment && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setSubmitModalOpen(false)}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-modal-title"
            className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-150 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0 bg-white dark:bg-slate-800">
              <div className="min-w-0 flex-1 pr-3">
                <h3 id="submit-modal-title" className="text-xl font-black text-slate-900 dark:text-slate-100 truncate">
                  დავალების ჩაბარება
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {currentAssignment.subjectName} • {currentAssignment.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubmitModalOpen(false)}
                aria-label="დახურვა"
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center shrink-0 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form with scrollable body and pinned footer */}
            <form onSubmit={handleSubmitHomework} className="flex flex-col flex-1 min-h-0">
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
                {submitError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 text-rose-700 dark:text-rose-400 text-xs font-semibold rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Upload or Link Toggle */}
                <div>
                  <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl mb-4">
                    <button
                      type="button"
                      onClick={() => setSubmitMode('FILE')}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${submitMode === 'FILE' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      ფაილის ატვირთვა
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubmitMode('LINK')}
                      className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${submitMode === 'LINK' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                      ბმულის მითითება
                    </button>
                  </div>

                  {submitMode === 'FILE' ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        ატვირთეთ ნამუშევარი *
                      </label>
                      {currentAssignment.allowedFormats && currentAssignment.allowedFormats.length > 0 && (
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-3 font-medium">დაშვებული ფორმატები: {currentAssignment.allowedFormats.map(f => f.replace(/\./g, '').toUpperCase()).join(', ')}</p>
                      )}

                      {fileUrl ? (
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 rounded-2xl flex items-center justify-between gap-3 min-w-0">
                          <div className="flex items-center gap-2.5 truncate min-w-0 flex-1">
                            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <div className="truncate min-w-0 flex-1">
                              <p className="text-xs font-bold text-indigo-900 truncate">{fileName}</p>
                              <p className="text-[11px] text-indigo-600 dark:text-indigo-400">{fileSize}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFileUrl('');
                              setFileName('');
                              setFileSize('');
                            }}
                            className="text-xs font-bold text-rose-600 hover:underline shrink-0 ml-2"
                          >
                            ფაილის შეცვლა
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center p-6 sm:p-8 border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-2xl cursor-pointer bg-indigo-50/50 dark:bg-indigo-900/20 hover:bg-indigo-50/80 dark:hover:bg-indigo-900/40 transition-all">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 shadow-sm">
                            <Upload className="w-6 h-6" />
                          </div>
                          <span className="text-sm font-bold text-indigo-950 dark:text-slate-100 text-center">
                            {uploading ? 'მიმდინარეობს ატვირთვა...' : 'დააჭირეთ ან ჩააგდეთ ფაილი აქ'}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center">
                            მობილურიდან შეგიძლიათ გადაიღოთ რვეულის ფოტო
                          </span>
                          <input
                            type="file"
                            accept={currentAssignment.allowedFormats && currentAssignment.allowedFormats.length > 0 ? currentAssignment.allowedFormats.join(',') : ".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.pptx,.txt"}
                            disabled={uploading}
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="submission-link-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                        ჩასვით ბმული (Google Drive, Docs და ა.შ.) *
                      </label>
                      <input
                        id="submission-link-input"
                        type="url"
                        value={submissionLink}
                        onChange={(e) => setSubmissionLink(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 transition-colors"
                      />
                    </div>
                  )}
                </div>

                {/* Student Comment */}
                <div>
                  <label htmlFor="student-comment-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    თქვენი კომენტარი მასწავლებლისთვის (სურვილისამებრ)
                  </label>
                  <textarea
                    id="student-comment-input"
                    rows={3}
                    value={studentComment}
                    onChange={(e) => setStudentComment(e.target.value)}
                    placeholder="მაგ: მე-4 სავარჯიშოში ორივე ხერხი გამოვიყენე..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-slate-900 dark:text-slate-100 transition-colors"
                  />
                </div>
              </div>

              {/* Pinned Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-3 shrink-0 bg-slate-50 dark:bg-slate-900/70">
                <button
                  type="button"
                  onClick={() => setSubmitModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                >
                  გაუქმება
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploading || (submitMode === 'FILE' && !fileUrl) || (submitMode === 'LINK' && !submissionLink.trim())}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-200 disabled:opacity-50 flex items-center gap-2 transition-all active:scale-[0.98]"
                >
                  <Send className="w-4 h-4" />
                  {submitting ? 'იგზავნება...' : 'დავალების ჩაბარება'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

