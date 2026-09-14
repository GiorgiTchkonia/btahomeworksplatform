import React, { useState, useEffect } from 'react';
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
  Send
} from 'lucide-react';
import { Assignment, Subject, Submission, StudentUser } from '@/types';
import { getAssignmentDetails, reviewSubmission } from '@/lib/api';

interface StudentRosterItem {
  student: StudentUser;
  submission: Submission | null;
}

export default function TeacherAssignmentDetailsPage() {
  const [, params] = useRoute('/teacher/assignments/:id');
  const [, navigate] = useLocation();
  const assignmentId = params?.id;

  const [loading, setLoading] = useState(true);
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

  // Decline Modal State
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const [activeStudentName, setActiveStudentName] = useState<string>('');
  const [declineReason, setDeclineReason] = useState('');
  const [declineError, setDeclineError] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // File Preview Modal state
  const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState<string>('');

  // Filter state
  const [filter, setFilter] = useState<'ALL' | 'SUBMITTED' | 'APPROVED' | 'DECLINED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Lock body scroll and handle Escape key for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewFileUrl) {
          setPreviewFileUrl(null);
        } else if (declineModalOpen) {
          setDeclineModalOpen(false);
        }
      }
    };

    if (declineModalOpen || previewFileUrl) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [declineModalOpen, previewFileUrl]);

  const loadDetails = async () => {
    if (!assignmentId) return;
    try {
      const details = await getAssignmentDetails(assignmentId);
      if (!details) {
        navigate('/teacher');
        return;
      }
      setData(details);
      setLoading(false);
    } catch (err) {
      console.error(err);
      navigate('/teacher');
    }
  };

  useEffect(() => {
    loadDetails();
  }, [assignmentId]);

  const handleApprove = async (submissionId: string) => {
    try {
      await reviewSubmission(submissionId, 'APPROVED', 'ძალიან კარგია, მიღებულია!');
      await loadDetails();
    } catch (err) {
      console.error(err);
      alert('შეცდომა სტატუსის შეცვლისას');
    }
  };

  const openDeclineModal = (submissionId: string, studentName: string) => {
    setActiveSubmissionId(submissionId);
    setActiveStudentName(studentName);
    setDeclineReason('');
    setDeclineError('');
    setDeclineModalOpen(true);
  };

  const handleDeclineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declineReason.trim()) {
      setDeclineError('გთხოვთ მიუთითოთ მიზეზი');
      return;
    }

    if (!activeSubmissionId) return;

    setSubmittingReview(true);
    try {
      await reviewSubmission(activeSubmissionId, 'DECLINED', declineReason.trim());
      setDeclineModalOpen(false);
      await loadDetails();
    } catch (err) {
      console.error(err);
      setDeclineError('შეცდომა დაფიქსირდა');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!data) return null;

  const { assignment, studentRoster } = data;
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
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          უკან დაბრუნება (დავალებების სია)
        </Link>
      </div>

      {/* Assignment Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
            {subjectName}
          </span>
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Calendar className="w-4 h-4 text-slate-400" />
            ვადა: {formattedDueDate}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 break-words">
          {assignment.title}
        </h1>

        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm text-slate-700 whitespace-pre-line leading-relaxed break-words">
          {assignment.description}
        </div>

        {assignment.attachmentUrl && (
          <div className="inline-flex max-w-full items-center gap-2.5 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs font-bold text-amber-900 overflow-hidden">
            <Paperclip className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="shrink-0">მიმაგრებული მასალა:</span>
            <a
              href={assignment.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 hover:underline flex items-center gap-1 truncate min-w-0"
            >
              <span className="truncate">{assignment.attachmentName || 'ფაილის ჩამოტვირთვა'}</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </a>
          </div>
        )}

        {/* Quick stats pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-center">
            <p className="text-xs font-bold text-slate-500">მოსწავლეები</p>
            <p className="text-xl font-black text-slate-900">{data.totalStudents}</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-center">
            <p className="text-xs font-bold text-indigo-700">ჩაბარებულია</p>
            <p className="text-xl font-black text-indigo-900">{data.submittedCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
            <p className="text-xs font-bold text-emerald-700">დადასტურებული</p>
            <p className="text-xl font-black text-emerald-900">{data.approvedCount}</p>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-center">
            <p className="text-xs font-bold text-rose-700">უარყოფილი</p>
            <p className="text-xl font-black text-rose-900">{data.declinedCount}</p>
          </div>
        </div>
      </div>

      {/* Student Roster & Submissions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            მოსწავლეთა სია & ნამუშევრები
          </h2>
          <span className="text-xs font-bold text-slate-500">
            {data.pendingCount > 0 ? (
              <span className="text-amber-600">⚠️ {data.pendingCount} ნამუშევარი ელოდება შემოწმებას</span>
            ) : (
              <span className="text-emerald-600">✓ ყველა ჩაბარებული შემოწმებულია</span>
            )}
          </span>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {studentRoster.map(({ student, submission }) => {
              return (
                <div
                  key={student.id}
                  className="p-5 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                >
                  {/* Student Info */}
                  <div className="flex items-center gap-3.5 min-w-[200px]">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base shadow-sm">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{student.name}</h4>
                      <p className="text-xs text-slate-500 font-medium">{student.grade} • {student.email}</p>
                    </div>
                  </div>

                  {/* Submission Info & Status Badge */}
                  <div className="flex-1 w-full lg:w-auto">
                    {submission ? (
                      <div className="space-y-2 bg-slate-50 lg:bg-transparent p-3 lg:p-0 rounded-2xl border lg:border-none border-slate-200/60">
                        {/* Status tag */}
                        <div className="flex items-center gap-2">
                          {submission.status === 'APPROVED' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              დადასტურებული ✅
                            </span>
                          )}
                          {submission.status === 'DECLINED' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              უარყოფილი ❌
                            </span>
                          )}
                          {submission.status === 'SUBMITTED' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              განსახილველი ⏳
                            </span>
                          )}

                          <span className="text-[11px] text-slate-400 font-medium">
                            ჩაბარებულია: {new Date(submission.submittedAt).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                          </span>
                        </div>

                        {/* File preview button */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewFileUrl(submission.fileUrl);
                              setPreviewFileName(submission.fileName);
                            }}
                            className="inline-flex max-w-full items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                              ნახვა: {submission.fileName} ({submission.fileSize})
                            </span>
                          </button>
                        </div>

                        {/* Student Comment */}
                        {submission.studentComment && (
                          <p className="text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-200/60 inline-block break-words max-w-full">
                            💬 <span className="font-semibold">მოსწავლის კომენტარი:</span> {submission.studentComment}
                          </p>
                        )}

                        {/* Teacher feedback if declined */}
                        {submission.status === 'DECLINED' && submission.teacherFeedback && (
                          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 break-words">
                            <span className="font-bold">თქვენი მიზეზი უარყოფისას:</span> {submission.teacherFeedback}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
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
                          onClick={() => handleApprove(submission.id)}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                            submission.status === 'APPROVED'
                              ? 'bg-emerald-600 text-white shadow-emerald-200'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          დადასტურება
                        </button>

                        <button
                          type="button"
                          onClick={() => openDeclineModal(submission.id, student.name)}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                            submission.status === 'DECLINED'
                              ? 'bg-rose-600 text-white shadow-rose-200'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200'
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
        </div>
      </div>

      {/* Modal: Decline Feedback */}
      {declineModalOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setDeclineModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="min-w-0 flex-1 pr-3">
                <h3 className="text-lg font-black text-slate-900 truncate">
                  დავალების უარყოფა: {activeStudentName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  მიუთითეთ გასაგები მიზეზი, თუ რა უნდა გამოასწოროს მოსწავლემ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeclineModalOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center shrink-0 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form with scrollable body and pinned footer */}
            <form onSubmit={handleDeclineSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
                {declineError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{declineError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    მიზეზი და ინსტრუქცია შესწორებისათვის *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    placeholder="მაგ: გთხოვთ მე-3 და მე-4 სავარჯიშოები გადაწეროთ გარკვევით და ხელახლა ატვირთოთ..."
                    className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500 resize-none transition-colors"
                  />
                </div>
              </div>

              {/* Pinned Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0 bg-slate-50/70">
                <button
                  type="button"
                  onClick={() => setDeclineModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-white transition-colors"
                >
                  გაუქმება
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-md shadow-rose-200 disabled:opacity-50 flex items-center gap-2 transition-all active:scale-[0.98]"
                >
                  <Send className="w-4 h-4" />
                  {submittingReview ? 'იგზავნება...' : 'უარყოფა & შეტყობინების გაგზავნა'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Document / Image Preview */}
      {previewFileUrl && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4 bg-slate-900/75 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setPreviewFileUrl(null)}
        >
          <div 
            className="bg-white text-left rounded-3xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 sm:p-4 bg-slate-900 text-white flex items-center justify-between gap-3 min-w-0 shrink-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText className="w-5 h-5 text-indigo-400 shrink-0" />
                <span className="font-bold text-sm truncate max-w-[170px] sm:max-w-xs md:max-w-lg">
                  {previewFileName}
                </span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <a
                  href={previewFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 sm:px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-colors"
                >
                  <span className="hidden sm:inline">გახსნა ცალკე ფანჯარაში</span>
                  <span className="sm:hidden">გახსნა</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewFileUrl(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-slate-100 flex items-center justify-center min-h-[350px]">
              {/\.pdf($|\?)/i.test(previewFileUrl) ? (
                <iframe
                  src={previewFileUrl}
                  className="w-full h-full min-h-[550px] rounded-xl border border-slate-200 bg-white"
                />
              ) : /\.(png|jpe?g|gif|webp|svg)($|\?)/i.test(previewFileUrl) || /\.(png|jpe?g|gif|webp|svg)($|\?)/i.test(previewFileName) ? (
                <img
                  src={previewFileUrl}
                  alt={previewFileName}
                  className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-md border border-slate-200"
                />
              ) : (
                <div className="text-center space-y-3 p-6">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700">ეს ფაილი ბრაუზერში პირდაპირ არ იხსნება</p>
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

