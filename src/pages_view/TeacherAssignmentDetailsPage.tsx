import { localizeError } from '@/lib/messages';
import StorageFileButton from '@/components/StorageFileButton';
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useRoute } from 'wouter';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  ExternalLink, 
  Eye, 
  Paperclip,
  Calendar,
  AlertCircle,
  X,
  Send,
  RotateCcw,
  Search,
  Award,
  Edit3,
  SlidersHorizontal,
  Save
} from 'lucide-react';
import { Assignment, Subject, Submission, StudentUser } from '@/types';
import { getAssignmentDetails, reviewSubmission, updateAssignment, getFileViewUrl } from '@/lib/api';
import { useDialog } from '@/components/ui/DialogProvider';
import DateTimePicker from '@/components/DateTimePicker';
import CustomCheckbox from '@/components/ui/CustomCheckbox';

interface StudentRosterItem {
  student: StudentUser;
  submission: Submission | null;
}

type StatusFilter = 'ALL' | 'SUBMITTED' | 'APPROVED' | 'DECLINED' | 'UNSUBMITTED';

export default function TeacherAssignmentDetailsPage() {
  const { showAlert } = useDialog();
  const [, params] = useRoute('/teacher/assignments/:id');
  const [, navigate] = useLocation();
  const assignmentId = params?.id;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [data, setData] = useState<{
    assignment: Assignment;
    subject: Subject | null;
    studentRoster: StudentRosterItem[];
    submittedCount: number;
    approvedCount: number;
    declinedCount: number;
    pendingCount: number;
    totalStudents: number;
  } | null>(null);

  // Search & Status Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [studentFilter, setStudentFilter] = useState(() => new URLSearchParams(window.location.search).get('student') || '');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  // Review & Grading Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const [activeStudentName, setActiveStudentName] = useState<string>('');
  const [reviewStatus, setReviewStatus] = useState<'APPROVED' | 'DECLINED'>('APPROVED');
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewGrade, setReviewGrade] = useState<string>('');
  const [reviewError, setReviewError] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Edit Assignment Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editAllowedFormats, setEditAllowedFormats] = useState<string[]>([]);
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // File Preview Modal state
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>('');
  const [openingFile, setOpeningFile] = useState<string | null>(null);

  // Lock body scroll and handle Escape key for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewFileUrl) {
          setPreviewFileUrl(null);
        } else if (reviewModalOpen) {
          setReviewModalOpen(false);
        } else if (editModalOpen) {
          setEditModalOpen(false);
        }
      }
    };

    if (reviewModalOpen || editModalOpen || previewFileUrl) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [reviewModalOpen, editModalOpen, previewFileUrl]);

  const loadDetails = async () => {
    if (!assignmentId) return;
    try {
      setLoading(true);
      setLoadError(null);
      const details = await getAssignmentDetails(assignmentId, new URLSearchParams(window.location.search).get('group') || undefined);
      if (!details) {
        setLoadError('დავალება ვერ მოიძებნა');
        return;
      }
      setData(details);
    } catch (err: any) {
      console.error(err);
      setLoadError('მონაცემების ჩატვირთვა ვერ მოხერხდა. გთხოვთ სცადოთ თავიდან.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [assignmentId]);

  // Open review modal for approving
  const openApproveModal = (submission: Submission, studentName: string) => {
    setActiveSubmissionId(submission.id);
    setActiveStudentName(studentName);
    setReviewStatus('APPROVED');
    setReviewFeedback(submission.teacherFeedback || 'ძალიან კარგია, მიღებულია!');
    setReviewGrade(submission.grade !== null && submission.grade !== undefined ? String(submission.grade) : '');
    setReviewError('');
    setReviewModalOpen(true);
  };

  // Open review modal for declining
  const openDeclineModal = (submission: Submission, studentName: string) => {
    setActiveSubmissionId(submission.id);
    setActiveStudentName(studentName);
    setReviewStatus('DECLINED');
    setReviewFeedback(submission.teacherFeedback || '');
    setReviewGrade(submission.grade !== null && submission.grade !== undefined ? String(submission.grade) : '');
    setReviewError('');
    setReviewModalOpen(true);
  };

  // Submit Review with Custom Feedback and Grade (1-10)
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubmissionId) return;

    if (reviewStatus === 'DECLINED' && !reviewFeedback.trim()) {
      setReviewError('გთხოვთ მიუთითოთ უარყოფის მიზეზი');
      return;
    }

    let parsedGrade: number | null = null;
    if (reviewGrade.trim() !== '') {
      const g = Number(reviewGrade.trim());
      if (!Number.isInteger(g)) {
        setReviewError('შეფასება უნდა იყოს მთელი რიცხვი');
        return;
      }
      if (g < 1 || g > 10) {
        setReviewError('შეფასება უნდა იყოს 1-დან 10-მდე');
        return;
      }
      parsedGrade = g;
    }

    setSubmittingReview(true);
    setReviewError('');

    try {
      await reviewSubmission(
        activeSubmissionId,
        reviewStatus,
        reviewFeedback.trim(),
        parsedGrade
      );
      setReviewModalOpen(false);
      showAlert(
        reviewStatus === 'APPROVED' ? 'დავალება დადასტურებულია' : 'დავალება უარყოფილია',
        'success'
      );
      await loadDetails();
    } catch (err: any) {
      console.error(err);
      setReviewError(localizeError(err, 'შეცდომა შეფასების გაგზავნისას'));
    } finally {
      setSubmittingReview(false);
    }
  };

  // Open Edit Assignment Modal
  const openEditModal = () => {
    if (!data?.assignment) return;
    setEditTitle(data.assignment.title);
    setEditDescription(data.assignment.description);
    setEditDueDate(data.assignment.dueDate);
    setEditAllowedFormats(data.assignment.allowedFormats || []);
    setEditError('');
    setEditModalOpen(true);
  };

  // Save Assignment Edits
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.assignment) return;

    if (!editTitle.trim()) {
      setEditError('სათაური სავალდებულოა');
      return;
    }
    if (!editDescription.trim()) {
      setEditError('აღწერა სავალდებულოა');
      return;
    }
    if (!editDueDate) {
      setEditError('ჩაბარების ვადა სავალდებულოა');
      return;
    }

    setSavingEdit(true);
    setEditError('');

    try {
      await updateAssignment(data.assignment.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        dueDate: editDueDate,
        allowedFormats: editAllowedFormats,
      });
      setEditModalOpen(false);
      showAlert('დავალება წარმატებით განახლდა', 'success');
      await loadDetails();
    } catch (err: any) {
      console.error(err);
      setEditError(localizeError(err, 'დავალების განახლება ვერ მოხერხდა'));
    } finally {
      setSavingEdit(false);
    }
  };

  // Filtered Student Roster based on search and status
  const unsubmittedCount = useMemo(() => {
    if (!data) return 0;
    return data.studentRoster.filter(r => !r.submission).length;
  }, [data]);

  const filteredRoster = useMemo(() => {
    if (!data) return [];
    return data.studentRoster.filter(({ student, submission }) => {
      if (studentFilter && student.id !== studentFilter) return false;
      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = student.name?.toLowerCase().includes(query);
        const matchesEmail = student.email?.toLowerCase().includes(query);
        const matchesGrade = student.grade?.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesGrade) return false;
      }

      // Status filter
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'UNSUBMITTED') return !submission;
      if (statusFilter === 'SUBMITTED') return submission?.status === 'SUBMITTED';
      if (statusFilter === 'APPROVED') return submission?.status === 'APPROVED';
      if (statusFilter === 'DECLINED') return submission?.status === 'DECLINED';

      return true;
    });
  }, [data, searchQuery, statusFilter, studentFilter]);

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
          onClick={loadDetails}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-indigo-200 dark:shadow-none active:scale-[0.98]"
        >
          <RotateCcw className="w-4 h-4" />
          <span>ხელახლა ცდა</span>
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { assignment } = data;
  const subjectName = data.subject?.name || 'ზოგადი';
  const formattedDueDate = new Date(assignment.dueDate).toLocaleDateString('ka-GE', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Top navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/teacher"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          უკან დაბრუნება (დავალებების სია)
        </Link>

        <button
          type="button"
          onClick={openEditModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 transition-colors"
        >
          <Edit3 className="w-4 h-4" />
          <span>დავალების რედაქტირება</span>
        </button>
      </div>

      {/* Assignment Header Card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700/90 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
              {subjectName}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
              <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              ვადა: {formattedDueDate}
            </span>
          </div>

          <button
            type="button"
            onClick={openEditModal}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 sm:hidden"
          >
            <Edit3 className="w-3.5 h-3.5" />
            რედაქტირება
          </button>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 break-words">
          {assignment.title}
        </h1>

        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed break-words">
          {assignment.description}
        </div>

        {/* Allowed formats info */}
        {assignment.allowedFormats && assignment.allowedFormats.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
            <span className="font-bold">ნებადართული ფორმატები:</span>
            {assignment.allowedFormats.map((fmt) => (
              <span key={fmt} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                {fmt}
              </span>
            ))}
          </div>
        )}

        {assignment.attachmentUrl && (
          <div className="inline-flex max-w-full items-center gap-2.5 p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl border border-amber-200 dark:border-amber-800 text-xs font-bold text-amber-900 dark:text-amber-200 overflow-hidden">
            <Paperclip className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="shrink-0">მიმაგრებული მასალა:</span>
            <StorageFileButton
              file={assignment.attachmentUrl}
              className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 truncate min-w-0"
            >
              <span className="truncate">{assignment.attachmentName || 'ფაილის ჩამოტვირთვა'}</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </StorageFileButton>
          </div>
        )}

        {/* Quick stats pills */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/60 text-center">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">სტუდენტები</p>
            <p className="text-xl font-black text-slate-900 dark:text-slate-100">{data.totalStudents}</p>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-100 dark:border-indigo-800 text-center">
            <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">ჩაბარებულია</p>
            <p className="text-xl font-black text-indigo-900 dark:text-indigo-100">{data.submittedCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl border border-emerald-100 dark:border-emerald-800 text-center">
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">დადასტურებული</p>
            <p className="text-xl font-black text-emerald-900 dark:text-emerald-100">{data.approvedCount}</p>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-900/30 rounded-xl border border-rose-100 dark:border-rose-800 text-center">
            <p className="text-xs font-bold text-rose-700 dark:text-rose-400">უარყოფილი</p>
            <p className="text-xl font-black text-rose-900 dark:text-rose-100">{data.declinedCount}</p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl border border-amber-100 dark:border-amber-800 text-center col-span-2 sm:col-span-1">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">განსახილველი</p>
            <p className="text-xl font-black text-amber-900 dark:text-amber-100">{data.pendingCount}</p>
          </div>
        </div>
      </div>

      {/* Student Roster & Submissions Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            სტუდენტთა სია & ნამუშევრები
          </h2>
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
            {data.pendingCount > 0 ? (
              <span className="text-amber-600 dark:text-amber-400">⚠️ {data.pendingCount} ნამუშევარი ელოდება შემოწმებას</span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400">✓ ყველა ჩაბარებული შემოწმებულია</span>
            )}
          </span>
        </div>

        {/* ── Search Bar & Status Filter Pills ── */}
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm">
          {studentFilter && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 p-3"><span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{data.studentRoster.find(r=>r.student.id===studentFilter)?.student.name || 'არჩეული სტუდენტი'} · ნამუშევარი</span><button type="button" onClick={()=>{ setStudentFilter(''); setSearchQuery(''); setStatusFilter('ALL'); }} className="rounded-lg bg-white dark:bg-slate-800 px-3 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">ყველა სტუდენტი</button></div>}
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ძებნა სტუდენტის სახელით, კლასით ან ელფოსტით..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full"
                aria-label="ძებნის გასუფთავება"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status filter pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1 mr-1">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              სტატუსი:
            </span>

            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              ყველა ({data.totalStudents})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('SUBMITTED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'SUBMITTED'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50'
              }`}
            >
              განსახილველი ({data.pendingCount})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'APPROVED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
              }`}
            >
              დადასტურებული ({data.approvedCount})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('DECLINED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'DECLINED'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50'
              }`}
            >
              უარყოფილი ({data.declinedCount})
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('UNSUBMITTED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === 'UNSUBMITTED'
                  ? 'bg-slate-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              ჩასაბარებელი ({unsubmittedCount})
            </button>
          </div>
        </div>

        {/* ── Student List ── */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/90 shadow-sm overflow-hidden">
          {filteredRoster.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Search className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">სტუდენტი ვერ მოიძებნა</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                მითითებული საძიებო პარამეტრებით მონაცემები არ არსებობს.
              </p>
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
                className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-xl transition-colors"
              >
                ფილტრების გასუფთავება
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredRoster.map(({ student, submission }) => {
                return (
                  <div
                    key={student.id}
                    className="p-5 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-900/70 transition-colors"
                  >
                    {/* Student Info */}
                    <div className="flex items-center gap-3.5 min-w-[200px]">
                      <div className="w-11 h-11 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                        {student.name ? student.name.charAt(0) : '?'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">{student.name}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{student.grade} • {student.email}</p>
                      </div>
                    </div>

                    {/* Submission Info & Status Badge */}
                    <div className="flex-1 w-full lg:w-auto">
                      {submission ? (
                        <div className="space-y-2 bg-slate-50 dark:bg-slate-900 lg:bg-transparent p-3 lg:p-0 rounded-2xl border lg:border-none border-slate-200 dark:border-slate-700/60">
                          {/* Status and Grade Tag Row */}
                          <div className="flex flex-wrap items-center gap-2">
                            {submission.status === 'APPROVED' && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                დადასტურებული ✅
                              </span>
                            )}
                            {submission.status === 'DECLINED' && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                                უარყოფილი ❌
                              </span>
                            )}
                            {submission.status === 'SUBMITTED' && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                განსახილველი ⏳
                              </span>
                            )}

                            {/* Score / Grade Badge */}
                            {submission.grade !== null && submission.grade !== undefined && (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-sm">
                                <Award className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                შეფასება: {submission.grade}/10
                              </span>
                            )}

                            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                              ჩაბარებულია: {new Date(submission.submittedAt).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                            </span>
                          </div>

                          {/* File preview or Link button */}
                          <div className="flex flex-wrap items-center gap-2">
                            {submission.submissionLink ? (
                              <a
                                href={submission.submissionLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex max-w-full items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800 transition-colors"
                              >
                                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                                  ბმულის გახსნა
                                </span>
                              </a>
                            ) : submission.fileUrl ? (
                              <button
                                type="button"
                                disabled={openingFile !== null}
                                onClick={async () => {
                                  setOpeningFile(submission.id);
                                  try {
                                    const signedUrl = await getFileViewUrl(submission.fileUrl);
                                    setPreviewFileUrl(signedUrl);
                                    setPreviewFileName(submission.fileName || '');
                                  } catch (error) {
                                    showAlert(localizeError(error, 'ფაილის გახსნა ვერ მოხერხდა.'), 'error');
                                  } finally {
                                    setOpeningFile(null);
                                  }
                                }}
                                className="inline-flex max-w-full items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                                  {openingFile === submission.id ? 'იხსნება…' : 'ნახვა:'} {submission.fileName} ({submission.fileSize})
                                </span>
                              </button>
                            ) : null}
                          </div>

                          {/* Student Comment */}
                          {submission.studentComment && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700/60 inline-block break-words max-w-full">
                              💬 <span className="font-semibold">სტუდენტის კომენტარი:</span> {submission.studentComment}
                            </p>
                          )}

                          {/* Teacher feedback */}
                          {submission.teacherFeedback && (
                            <div className={`p-2.5 rounded-xl border text-xs break-words ${
                              submission.status === 'APPROVED' 
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                            }`}>
                              <span className="font-bold">
                                {submission.status === 'APPROVED' ? 'თქვენი უკუკავშირი: ' : 'თქვენი მიზეზი უარყოფისას: '}
                              </span>
                              {submission.teacherFeedback}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500">
                          <Clock className="w-4 h-4" />
                          <span>ჯერ არ ჩაუბარებია (ჩასაბარებელია)</span>
                        </div>
                      )}
                    </div>

                    {/* Grading Action Buttons (Only when submitted) */}
                    <div className="shrink-0 flex items-center gap-2 w-full lg:w-auto justify-end pt-2 lg:pt-0">
                      {submission && (
                        <>
                          <button
                            type="button"
                            onClick={() => openApproveModal(submission, student.name)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                              submission.status === 'APPROVED'
                                ? 'bg-emerald-600 text-white shadow-emerald-200 dark:shadow-none'
                                : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white border border-emerald-200 dark:border-emerald-800'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            {submission.status === 'APPROVED' ? 'შეფასების რედაქტირება' : 'დადასტურება & შეფასება'}
                          </button>

                          <button
                            type="button"
                            onClick={() => openDeclineModal(submission, student.name)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                              submission.status === 'DECLINED'
                                ? 'bg-rose-600 text-white shadow-rose-200 dark:shadow-none'
                                : 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white border border-rose-200 dark:border-rose-800'
                            }`}
                          >
                            <XCircle className="w-4 h-4" />
                            უარყოფა
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Review & Grading (1-10) ── */}
      {reviewModalOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setReviewModalOpen(false)}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-modal-title"
            className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-150 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0 bg-white dark:bg-slate-800">
              <div className="min-w-0 flex-1 pr-3">
                <h3 id="review-modal-title" className="text-lg font-black text-slate-900 dark:text-slate-100 truncate">
                  {reviewStatus === 'APPROVED' ? 'ნაშრომის შეფასება & დადასტურება' : 'ნაშრომის უარყოფა & ხარვეზის მითითება'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  სტუდენტი: <strong className="text-slate-700 dark:text-slate-300">{activeStudentName}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                aria-label="დახურვა"
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center shrink-0 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleReviewSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
                {reviewError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs font-semibold rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{reviewError}</span>
                  </div>
                )}

                {/* Status Switcher Buttons */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    სტატუსის არჩევა
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setReviewStatus('APPROVED');
                        if (!reviewFeedback || reviewFeedback === 'საჭიროებს შესწორებას') {
                          setReviewFeedback('ძალიან კარგია, მიღებულია!');
                        }
                      }}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border ${
                        reviewStatus === 'APPROVED'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200 dark:shadow-none'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      დადასტურება
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setReviewStatus('DECLINED');
                        if (reviewFeedback === 'ძალიან კარგია, მიღებულია!') {
                          setReviewFeedback('');
                        }
                      }}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border ${
                        reviewStatus === 'DECLINED'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-200 dark:shadow-none'
                          : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      უარყოფა
                    </button>
                  </div>
                </div>

                {/* Score / Grade (1–10) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="review-grade-input" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      შეფასება (1–10, არასავალდებულო)
                    </label>
                    {reviewGrade && (
                      <button
                        type="button"
                        onClick={() => setReviewGrade('')}
                        className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        გასუფთავება
                      </button>
                    )}
                  </div>

                  {/* Quick Score Selector Pills */}
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
                      const isSelected = reviewGrade === String(score);
                      return (
                        <button
                          key={score}
                          type="button"
                          onClick={() => setReviewGrade(isSelected ? '' : String(score))}
                          className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${
                            isSelected
                              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none ring-2 ring-indigo-600/30'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:hover:text-indigo-300'
                          }`}
                        >
                          {score}
                        </button>
                      );
                    })}
                  </div>

                  <input
                    id="review-grade-input"
                    type="number"
                    min="1"
                    max="10"
                    step="1"
                    value={reviewGrade}
                    onChange={(e) => setReviewGrade(e.target.value)}
                    placeholder="მიუთითეთ ქულა 1-დან 10-მდე..."
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-colors text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Feedback Comment Textarea */}
                <div>
                  <label htmlFor="review-feedback-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    {reviewStatus === 'DECLINED' ? (
                      <span>მიზეზი და ინსტრუქცია შესწორებისათვის <span className="text-rose-500">*</span></span>
                    ) : (
                      <span>მასწავლებლის კომენტარი / უკუკავშირი</span>
                    )}
                  </label>
                  <textarea
                    id="review-feedback-input"
                    required={reviewStatus === 'DECLINED'}
                    rows={4}
                    value={reviewFeedback}
                    onChange={(e) => setReviewFeedback(e.target.value)}
                    placeholder={
                      reviewStatus === 'DECLINED'
                        ? 'მაგ: გთხოვთ მე-3 სავარჯიშო გადაწეროთ გარკვევით და ხელახლა ატვირთოთ...'
                        : 'მაგ: სანიმუშო ნაშრომია, განსაკუთრებით მე-2 ნაწილის ამოხსნა...'
                    }
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-colors text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Pinned Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-3 shrink-0 bg-slate-50 dark:bg-slate-900/70">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  გაუქმება
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className={`px-5 py-2.5 rounded-xl text-white text-sm font-bold shadow-md disabled:opacity-50 flex items-center gap-2 transition-all active:scale-[0.98] ${
                    reviewStatus === 'APPROVED'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 dark:shadow-none'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200 dark:shadow-none'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  {submittingReview
                    ? 'იგზავნება...'
                    : reviewStatus === 'APPROVED'
                    ? 'დადასტურება & შეფასება'
                    : 'უარყოფა & შეტყობინება'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Edit Assignment ── */}
      {editModalOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setEditModalOpen(false)}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-assignment-title"
            className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-150 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between shrink-0 bg-white dark:bg-slate-800">
              <div className="min-w-0 flex-1 pr-3">
                <h3 id="edit-assignment-title" className="text-lg font-black text-slate-900 dark:text-slate-100 truncate">
                  დავალების რედაქტირება
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  შეცვალეთ სათაური, აღწერა, ჩაბარების ვადა ან ფორმატები
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                aria-label="დახურვა"
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center shrink-0 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form */}
            <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
                {editError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs font-semibold rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{editError}</span>
                  </div>
                )}

                {/* Title */}
                <div>
                  <label htmlFor="edit-assignment-title-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    სათაური <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="edit-assignment-title-input"
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="დავალების სათაური..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-colors text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="edit-assignment-desc-input" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    აღწერა / დავალების ტექსტი <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="edit-assignment-desc-input"
                    required
                    rows={4}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="დეტალური აღწერა..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 focus:bg-white dark:focus:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-colors text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    ჩაბარების ვადა <span className="text-rose-500">*</span>
                  </label>
                  <DateTimePicker value={editDueDate} onChange={(val) => setEditDueDate(val)} />
                </div>

                {/* Allowed Formats */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    ნებადართული ფორმატები
                  </label>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
                    თუ არ აირჩევთ, ყველა ფორმატი დაშვებული იქნება.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: '.pdf', label: 'PDF' },
                      { id: '.doc,.docx', label: 'Word' },
                      { id: '.ppt,.pptx', label: 'PowerPoint' },
                      { id: '.xls,.xlsx', label: 'Excel' },
                      { id: '.jpg,.jpeg,.png,.webp', label: 'სურათი' },
                    ].map((format) => (
                      <div key={format.id} className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
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

              {/* Pinned Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-3 shrink-0 bg-slate-50 dark:bg-slate-900/70">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  გაუქმება
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-200 dark:shadow-none disabled:opacity-50 flex items-center gap-2 transition-all active:scale-[0.98]"
                >
                  <Save className="w-4 h-4" />
                  {savingEdit ? 'ინახება...' : 'ცვლილებების შენახვა'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Document / Image Preview ── */}
      {previewFileUrl && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setPreviewFileUrl(null)}
        >
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="preview-modal-title"
            className="bg-white dark:bg-slate-800 text-left rounded-3xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 sm:p-4 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3 min-w-0 shrink-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText className="w-5 h-5 text-indigo-500 shrink-0" />
                <span id="preview-modal-title" className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate max-w-[170px] sm:max-w-xs md:max-w-lg">
                  {previewFileName}
                </span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <a
                  href={previewFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 sm:px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors"
                >
                  <span className="hidden sm:inline">გახსნა ცალკე ფანჯარაში</span>
                  <span className="sm:hidden">გახსნა</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewFileUrl(null)}
                  aria-label="დახურვა"
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 flex items-center justify-center transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-slate-100 dark:bg-slate-700 flex items-center justify-center min-h-[350px]">
              {/\.pdf($|\?)/i.test(previewFileUrl) ? (
                <iframe
                  src={previewFileUrl}
                  sandbox="allow-same-origin"
                  className="w-full h-full min-h-[550px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              ) : /\.(png|jpe?g|gif|webp|svg)($|\?)/i.test(previewFileUrl) || /\.(png|jpe?g|gif|webp|svg)($|\?)/i.test(previewFileName) ? (
                <img
                  src={previewFileUrl}
                  alt={previewFileName}
                  className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-md border border-slate-200 dark:border-slate-700"
                />
              ) : (
                <div className="text-center space-y-3 p-6">
                  <FileText className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">ეს ფაილი ბრაუზერში პირდაპირ არ იხსნება</p>
                  <a
                    href={previewFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow-md shadow-indigo-100"
                  >
                    ჩამოტვირთვა
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
