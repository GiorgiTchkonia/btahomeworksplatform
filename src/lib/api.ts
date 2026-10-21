import { supabase } from './supabase';
import { MIN_PASSWORD_LENGTH } from './messages';
import {
  User,
  StudentAssignmentWithStatus,
  SubjectProgress,
  AssignmentWithMeta,
  Submission,
  Assignment,
  CreateAssignmentParams,
  AddWhitelistUserData,
  AdminUpdateUserData,
  UpdateProfileUpdates
} from '@/types';


// ---------------------------------------------------------
// Storage & URL Security Utilities
// ---------------------------------------------------------
export const MIME_MAP: Record<string, string[]> = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ppt: ['application/vnd.ms-powerpoint'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  webp: ['image/webp'],
  gif: ['image/gif'],
  txt: ['text/plain'],
  zip: ['application/zip', 'application/x-zip-compressed'],
  rar: ['application/x-rar-compressed', 'application/vnd.rar', 'application/octet-stream'],
};

/**
 * Strict validator for submission links.
 * Requires valid HTTPS URL and allowed Google Drive/Docs hostnames to prevent XSS.
 */
export function isValidSubmissionUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    if (/[\r\n\t]/.test(url.trim())) return false;
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password || parsed.port) return false;
    const allowedHosts = ['drive.google.com', 'docs.google.com'];
    return allowedHosts.includes(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Extracts relative storage path {folder}/{filename} from a public or relative storage URL.
 */
export function extractStoragePath(urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  if (!urlOrPath.startsWith('http://') && !urlOrPath.startsWith('https://')) {
    return urlOrPath.startsWith('/') ? urlOrPath.slice(1) : urlOrPath;
  }
  const match = urlOrPath.match(/\/homework-files\/(.+?)(\?.*)?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Resolve private storage on demand. Never fall back to an inaccessible public URL.
 */
export async function getFileViewUrl(fileUrlOrPath: string | null | undefined): Promise<string> {
  if (!fileUrlOrPath) return '';
  if (fileUrlOrPath.startsWith('/demo-') || fileUrlOrPath.startsWith('/uploads/')) {
    return fileUrlOrPath;
  }
  const storagePath = extractStoragePath(fileUrlOrPath);
  if (!storagePath) {
    if (isValidSubmissionUrl(fileUrlOrPath)) return fileUrlOrPath;
    throw new Error('ფაილის მისამართი არასწორია.');
  }
  const { data, error } = await supabase.storage.from('homework-files').createSignedUrl(storagePath, 3600);
  if (error || !data?.signedUrl) {
    throw new Error('ფაილის გახსნა ვერ მოხერხდა. გადაამოწმეთ წვდომა და სცადეთ ხელახლა.');
  }
  return data.signedUrl;
}

/** Only removes unreferenced files; storage RLS protects files attached to records. */
export async function removeUnlinkedFile(fileUrlOrPath: string): Promise<void> {
  const path = extractStoragePath(fileUrlOrPath);
  if (!path) return;
  const { error } = await supabase.storage.from('homework-files').remove([path]);
  if (error) throw error;
}

// ---------------------------------------------------------
// File Upload
// ---------------------------------------------------------
export async function uploadFile(
  file: File,
  options?: { studentId?: string; allowedFormats?: string[] }
) {
  const maxFileSize = 15 * 1024 * 1024;
  if (file.size === 0) throw new Error('ცარიელი ფაილის ატვირთვა დაუშვებელია.');
  if (file.size > maxFileSize) {
    throw new Error('ფაილის ზომა არ უნდა აღემატებოდეს 15MB-ს.');
  }

  const fileExt = file.name.split('.').pop()?.toLowerCase();
  const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'webp', 'gif', 'txt', 'zip', 'rar'];

  if (!file.name.includes('.') || !fileExt || !allowedExtensions.includes(fileExt)) {
    throw new Error('ფაილის ფორმატი დაუშვებელია.');
  }

  // Validate against teacher's allowed formats if specified
  if (options?.allowedFormats && options.allowedFormats.length > 0) {
    const normalizedAllowed = options.allowedFormats.flatMap(fmt => fmt.split(',').map(ext => ext.trim().toLowerCase().replace(/^\./, '')));
    if (!normalizedAllowed.includes(fileExt)) {
      throw new Error(`ფაილის ფორმატი (.${fileExt}) დაუშვებელია ამ დავალებისთვის. დაშვებული ფორმატებია: ${options.allowedFormats.join(', ')}`);
    }
  }

  // Validate MIME type if file.type is available
  if (file.type && MIME_MAP[fileExt]) {
    const expectedMimes = MIME_MAP[fileExt];
    if (!expectedMimes.includes(file.type.toLowerCase())) {
      throw new Error('ფაილის MIME ტიპი არ შეესაბამება გაფართოებას.');
    }
  }

  let finalFile = file;
  if (['jpg', 'jpeg', 'png', 'webp'].includes(fileExt)) {
    try {
      const imageCompression = (await import('browser-image-compression')).default;
      const compressionOptions = {
        maxSizeMB: 1, // Compress to ~1MB
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      const compressedBlob = await imageCompression(file, compressionOptions);
      finalFile = new File([compressedBlob], file.name, { type: compressedBlob.type });
    } catch (e) {
      console.error('Image compression failed:', e);
    }
  }

  // Organize under folder {userId} to comply with storage RLS policies
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const folderId = authData?.user?.id;
  if (authError || !folderId) throw new Error('ფაილის ასატვირთად საჭიროა ავტორიზაცია.');
  if (options?.studentId && options.studentId !== folderId) throw new Error('სხვის საქაღალდეში ატვირთვა დაუშვებელია.');

  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `${folderId}/${fileName}`;

  const { error } = await supabase.storage
    .from('homework-files')
    .upload(filePath, finalFile);

  if (error) throw error;

  // Return formatted size (e.g., 2.1 MB) based on finalFile
  const sizeMb = finalFile.size / (1024 * 1024);
  const formattedSize = sizeMb < 1 ? `${Math.round(finalFile.size / 1024)} KB` : `${sizeMb.toFixed(1)} MB`;

  return { fileUrl: filePath, fileName: file.name, fileSize: formattedSize };
}

// ---------------------------------------------------------
// Student Dashboard
// ---------------------------------------------------------
export async function getStudentDashboardData(studentId: string) {
  // Parallel fetch: subjects, assignments, and submissions for student
  const [subjectsRes, assignmentsRes, submissionsRes] = await Promise.all([
    supabase.from('subjects').select('*, profiles!teacher_id(name)'),
    supabase.from('assignments').select('*'),
    supabase.from('submissions').select('*').eq('student_id', studentId),
  ]);

  if (subjectsRes.error) throw new Error(subjectsRes.error.message);
  if (assignmentsRes.error) throw new Error(assignmentsRes.error.message);
  if (submissionsRes.error) throw new Error(submissionsRes.error.message);

  const subjects = subjectsRes.data;
  const assignments = assignmentsRes.data;
  const submissions = submissionsRes.data;

  const subjectMap = new Map(subjects?.map(s => [s.id, s]));
  const studentSubmissionMap = new Map(submissions?.map(s => [s.assignment_id, s]));

  const assignmentsBySubject = new Map<string, Array<Record<string, unknown>>>();
  for (const a of (assignments || [])) {
    const bucket = assignmentsBySubject.get(a.subject_id) || [];
    bucket.push(a as Record<string, unknown>);
    assignmentsBySubject.set(a.subject_id, bucket);
  }

  const subjectsWithProgress: SubjectProgress[] = (subjects || []).map(subject => {
    const subjectAssignments = assignmentsBySubject.get(subject.id) || [];
    const totalAssignments = subjectAssignments.length;

    let completedAssignments = 0;
    let submittedAssignments = 0;
    let declinedAssignments = 0;

    for (const asg of subjectAssignments) {
      const sub = studentSubmissionMap.get(asg.id);
      if (sub) {
        if (sub.status === 'APPROVED') completedAssignments++;
        else if (sub.status === 'SUBMITTED') submittedAssignments++;
        else if (sub.status === 'DECLINED') declinedAssignments++;
      }
    }

    const handled = completedAssignments + submittedAssignments;
    const missingAssignments = Math.max(0, totalAssignments - handled - declinedAssignments);
    const percentage = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 100;

    return {
      subjectId: subject.id,
      subjectName: subject.name,
      color: subject.color,
      icon: subject.icon,
      teacherName: subject.profiles?.name || 'უცნობი',
      totalAssignments,
      completedAssignments,
      submittedAssignments,
      declinedAssignments,
      missingAssignments,
      percentage,
    };
  });

  const assignmentsWithStatus: StudentAssignmentWithStatus[] = (assignments || [])
    .map(a => {
      const subject = subjectMap.get(a.subject_id);
      const submission = studentSubmissionMap.get(a.id) || null;

      return {
        id: a.id,
        subjectId: a.subject_id,
        teacherId: a.teacher_id,
        title: a.title,
        description: a.description,
        dueDate: a.due_date,
        attachmentUrl: a.attachment_url,
        attachmentName: a.attachment_name,
        allowedFormats: a.allowed_formats || [],
        createdAt: a.created_at,
        subjectName: subject ? subject.name : 'უცნობი',
        subjectColor: subject ? subject.color : 'indigo',
        teacherName: subject?.profiles?.name || 'უცნობი',
        submission: submission ? {
          id: submission.id,
          assignmentId: submission.assignment_id,
          studentId: submission.student_id,
          studentName: submission.student_name,
          fileUrl: submission.file_url,
          fileName: submission.file_name,
          fileSize: submission.file_size,
          submissionLink: submission.submission_link,
          studentComment: submission.student_comment,
          status: submission.status,
          teacherFeedback: submission.teacher_feedback,
          grade: submission.grade ?? null,
          submittedAt: submission.submitted_at,
          reviewedAt: submission.reviewed_at
        } : null,
      };
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return { subjectsWithProgress, assignmentsWithStatus };
}

export async function submitHomework(params: {
  assignmentId: string;
  studentId: string;
  studentName: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  submissionLink?: string;
  studentComment?: string;
}) {
  // Validate submission link if provided
  if (params.submissionLink) {
    if (!isValidSubmissionUrl(params.submissionLink)) {
      throw new Error('გთხოვთ მიუთითოთ მხოლოდ ვალიდური HTTPS Google Drive ან Google Docs ბმული.');
    }
  }

  // Fetch assignment to check due date
  const { data: assignmentData, error: assignmentError } = await supabase.from('assignments')
    .select('due_date')
    .eq('id', params.assignmentId)
    .single();

  if (assignmentError) throw new Error('დავალება ვერ მოიძებნა');

  if (new Date(assignmentData.due_date).getTime() < Date.now()) {
    throw new Error('დავალების ჩაბარების ვადა ამოიწურა. ჩაბარება შეუძლებელია.');
  }

  if (!params.fileUrl && !params.submissionLink?.trim()) {
    throw new Error('ჩაბარებას უნდა ჰქონდეს ფაილი ან ბმული.');
  }

  const { data: existing, error: existingError } = await supabase.from('submissions')
    .select('id, file_url, submitted_at')
    .eq('assignment_id', params.assignmentId)
    .eq('student_id', params.studentId)
    .maybeSingle();
  if (existingError) throw existingError;

  const payload = {
    file_url: params.fileUrl || null,
    file_name: params.fileName || null,
    file_size: params.fileSize || null,
    submission_link: params.submissionLink?.trim() || null,
    student_comment: params.studentComment || '',
    status: 'SUBMITTED',
    teacher_feedback: null,
    grade: null,
    reviewed_at: null,
    submitted_at: new Date().toISOString(),
  };

  // Protect against another tab replacing this submission between reading and saving.
  const result = existing
    ? await supabase.from('submissions').update(payload).eq('id', existing.id)
        .eq('submitted_at', existing.submitted_at).select().maybeSingle()
    : await supabase.from('submissions').insert({
        ...payload, assignment_id: params.assignmentId,
        student_id: params.studentId, student_name: params.studentName,
      }).select().single();
  if (result.error) throw result.error;
  if (!result.data) throw new Error('ნაშრომი უკვე შეიცვალა. განაახლეთ გვერდი და სცადეთ ხელახლა.');

  // Commit first: failed saves must leave the previous file intact. This also cleans
  // up the old file when switching from a file submission to a link submission.
  if (existing?.file_url && extractStoragePath(existing.file_url) !== extractStoragePath(params.fileUrl)) {
    try {
      await removeUnlinkedFile(existing.file_url);
    } catch (error) {
      console.warn('Saved submission; old file cleanup must be retried:', error);
    }
  }
  return result.data;
}

export async function cancelSubmission(submissionId: string) {
  // The database enforces deadline and ownership, including direct API requests.
  const { data, error } = await supabase.from('submissions').delete()
    .eq('id', submissionId).select('id, file_url').single();
  if (error) throw error;
  if (!data) throw new Error('ჩაბარება ვერ მოიძებნა ან მისი წაშლა დაუშვებელია.');
  if (data.file_url) {
    try {
      await removeUnlinkedFile(data.file_url);
    } catch (cleanupError) {
      console.warn('Cancelled submission; file cleanup must be retried:', cleanupError);
    }
  }
  return true;
}

// ---------------------------------------------------------
// Teacher Dashboard
// ---------------------------------------------------------
export async function getTeacherDashboardData(teacherId: string, groupId?: string) {
  const [subjectsRes, assignmentsRes, submissionsRes, studentsRes] = await Promise.all([
    supabase.from('subjects').select('*').eq('teacher_id', teacherId),
    supabase.from('assignments').select('*').eq('teacher_id', teacherId),
    supabase.from('submissions').select('assignment_id, status, student_id'),
    supabase.from('profiles').select('*').eq('role', 'STUDENT'),
  ]);

  if (subjectsRes.error) throw new Error(subjectsRes.error.message);
  if (assignmentsRes.error) throw new Error(assignmentsRes.error.message);
  if (submissionsRes.error) throw new Error(submissionsRes.error.message);
  if (studentsRes.error) throw new Error(studentsRes.error.message);

  const subjects = subjectsRes.data;
  const assignments = (assignmentsRes.data || []).filter(a => !groupId || a.group_ids?.includes(groupId));
  const students = (studentsRes.data || []).filter(s => !groupId || s.group_id === groupId);
  const studentIds = new Set(students.map(s => s.id));
  const studentGroups = new Map(students.map(s => [s.id, s.group_id]));
  const targets = new Map(assignments.map(a => [a.id, a.group_ids as string[]]));
  const submissions = (submissionsRes.data || []).filter(s => studentIds.has(s.student_id) && targets.get(s.assignment_id)?.includes(studentGroups.get(s.student_id)));
  const totalStudents = students?.length || 0;

  const submissionCounts = new Map<string, { approved: number; declined: number; pending: number }>();

  for (const asg of (assignments || [])) {
    submissionCounts.set(asg.id, { approved: 0, declined: 0, pending: 0 });
  }

  for (const sub of (submissions || [])) {
    const counts = submissionCounts.get(sub.assignment_id);
    if (counts) {
      if (sub.status === 'APPROVED') counts.approved++;
      else if (sub.status === 'DECLINED') counts.declined++;
      else if (sub.status === 'SUBMITTED') counts.pending++;
    }
  }

  const subjectMap = new Map(subjects?.map(s => [s.id, s.name]));

  const dashboardAssignments: AssignmentWithMeta[] = (assignments || []).map(a => {
    const counts = submissionCounts.get(a.id) || { approved: 0, pending: 0, declined: 0 };
    return {
      id: a.id,
      groupIds: a.group_ids || [],
      subjectId: a.subject_id,
      teacherId: a.teacher_id,
      title: a.title,
      description: a.description,
      dueDate: a.due_date,
      attachmentUrl: a.attachment_url,
      attachmentName: a.attachment_name,
      allowedFormats: a.allowed_formats || [],
      createdAt: a.created_at,
      subjectName: subjectMap.get(a.subject_id) || 'უცნობი',
      submissionsCount: counts.approved + counts.declined + counts.pending,
      totalStudents: students.filter(s => a.group_ids?.includes(s.group_id)).length
    };
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return { subjects: subjects || [], assignments: dashboardAssignments, totalStudents, students, submissions };
}

export async function createAssignment(params: CreateAssignmentParams) {
  if (!params.groupIds?.length) throw new Error('აირჩიეთ მინიმუმ ერთი ჯგუფი');
  const { data, error } = await supabase.from('assignments').insert({
    subject_id: params.subjectId,
    group_ids: [...new Set(params.groupIds)],
    teacher_id: params.teacherId,
    title: params.title,
    description: params.description,
    due_date: params.dueDate,
    attachment_url: params.attachmentUrl,
    attachment_name: params.attachmentName,
    allowed_formats: [...new Set((params.allowedFormats || []).flatMap(fmt => fmt.split(',').map(ext => ext.trim().toLowerCase())))]
  }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteAssignment(assignmentId: string) {
  const { error } = await supabase.from('assignments').delete().eq('id', assignmentId);
  if (error) throw error;
  return true;
}

export async function updateAssignment(
  assignmentId: string,
  updates: Partial<Assignment>
): Promise<Assignment | null> {
  const dbUpdates: Record<string, any> = {};
  if (updates.subjectId !== undefined) dbUpdates.subject_id = updates.subjectId;
  if (updates.groupIds !== undefined) {
    if (!updates.groupIds.length) throw new Error('აირჩიეთ მინიმუმ ერთი ჯგუფი');
    dbUpdates.group_ids = [...new Set(updates.groupIds)];
  }
  if (updates.teacherId !== undefined) dbUpdates.teacher_id = updates.teacherId;
  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
  if (updates.attachmentUrl !== undefined) dbUpdates.attachment_url = updates.attachmentUrl;
  if (updates.attachmentName !== undefined) dbUpdates.attachment_name = updates.attachmentName;
  if (updates.allowedFormats !== undefined) dbUpdates.allowed_formats = [...new Set(updates.allowedFormats.flatMap(fmt => fmt.split(',').map(ext => ext.trim().toLowerCase())))];

  const { data, error } = await supabase
    .from('assignments')
    .update(dbUpdates)
    .eq('id', assignmentId)
    .select()
    .single();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    subjectId: data.subject_id,
    teacherId: data.teacher_id,
    title: data.title,
    description: data.description,
    dueDate: data.due_date,
    attachmentUrl: data.attachment_url,
    attachmentName: data.attachment_name,
    allowedFormats: data.allowed_formats || [],
    createdAt: data.created_at,
  };
}

export async function getAssignmentDetails(assignmentId: string, groupId?: string) {
  const { data: assignment, error: error1 } = await supabase.from('assignments').select('*').eq('id', assignmentId).single();
  if (error1) throw new Error(error1.message);
  if (!assignment) return null;
  const targetGroups: string[] = assignment.group_ids || [];
  if (groupId && !targetGroups.includes(groupId)) throw new Error('დავალება ამ ჯგუფისთვის არ არის განკუთვნილი');

  const [subjectRes, teacherRes, submissionsRes, studentsRes] = await Promise.all([
    supabase.from('subjects').select('*').eq('id', assignment.subject_id).single(),
    supabase.from('profiles').select('*').eq('id', assignment.teacher_id).single(),
    supabase.from('submissions').select('*').eq('assignment_id', assignmentId),
    supabase.from('profiles').select('*').eq('role', 'STUDENT').in('group_id', groupId ? [groupId] : targetGroups),
  ]);

  if (subjectRes.error) throw new Error(subjectRes.error.message);
  if (teacherRes.error) throw new Error(teacherRes.error.message);
  if (submissionsRes.error) throw new Error(submissionsRes.error.message);
  if (studentsRes.error) throw new Error(studentsRes.error.message);

  const subject = subjectRes.data;
  const teacher = teacherRes.data;
  const students = studentsRes.data;
  const rosterIds = new Set(students?.map(s => s.id));
  const submissions = submissionsRes.data?.filter(s => rosterIds.has(s.student_id));

  let approvedCount = 0;
  let declinedCount = 0;
  let pendingCount = 0;

  const submissionByStudentId = new Map(submissions?.map(s => [s.student_id, {
    id: s.id,
    assignmentId: s.assignment_id,
    studentId: s.student_id,
    studentName: s.student_name,
    fileUrl: s.file_url,
    fileName: s.file_name,
    fileSize: s.file_size,
    submissionLink: s.submission_link,
    studentComment: s.student_comment,
    status: s.status,
    teacherFeedback: s.teacher_feedback,
    grade: s.grade ?? null,
    submittedAt: s.submitted_at,
    reviewedAt: s.reviewed_at
  }]));

  for (const s of (submissions || [])) {
    if (s.status === 'APPROVED') approvedCount++;
    else if (s.status === 'DECLINED') declinedCount++;
    else if (s.status === 'SUBMITTED') pendingCount++;
  }

  const studentRoster = (students || []).map(student => ({
    student,
    submission: submissionByStudentId.get(student.id) || null,
  }));

  return {
    assignment: {
      id: assignment.id,
      subjectId: assignment.subject_id,
      teacherId: assignment.teacher_id,
      title: assignment.title,
      description: assignment.description,
      dueDate: assignment.due_date,
      attachmentUrl: assignment.attachment_url,
      attachmentName: assignment.attachment_name,
      allowedFormats: assignment.allowed_formats || [],
      createdAt: assignment.created_at
    },
    subject,
    teacher,
    studentRoster,
    submittedCount: submissions?.length || 0,
    approvedCount,
    declinedCount,
    pendingCount,
    totalStudents: students?.length || 0,
  };
}

export async function reviewSubmission(
  submissionId: string,
  status: 'APPROVED' | 'DECLINED',
  feedback: string,
  grade?: number | null
): Promise<void> {
  if (!submissionId) throw new Error('submissionId is required');
  if (!['APPROVED', 'DECLINED'].includes(status)) throw new Error('status must be APPROVED or DECLINED');

  let sanitizedGrade: number | null = null;
  if (grade !== undefined && grade !== null && (grade as unknown as string) !== '') {
    const num = Number(grade);
    if (!Number.isInteger(num)) {
      throw new Error('შეფასება უნდა იყოს მთელი რიცხვი');
    }
    if (num < 1 || num > 10) {
      throw new Error('შეფასება უნდა იყოს 1-დან 10-მდე');
    }
    sanitizedGrade = num;
  }

  const updatePayload: Record<string, any> = {
    status,
    teacher_feedback: feedback ? feedback.trim() : (status === 'APPROVED' ? 'ძალიან კარგია, მიღებულია!' : 'საჭიროებს შესწორებას'),
    reviewed_at: new Date().toISOString(),
    grade: sanitizedGrade,
  };

  const { error } = await supabase.from('submissions').update(updatePayload).eq('id', submissionId);
  if (error) throw error;
}

// ---------------------------------------------------------
// Admin
// ---------------------------------------------------------
export async function getAllUsersForAdmin() {
  const [{ data: rawProfiles, error }, { data: states, error: statusError }] = await Promise.all([
    supabase.from('profiles').select('*'), supabase.rpc('get_admin_account_states'),
  ]);
  if (error) throw new Error(error.message);
  if (statusError) throw new Error(statusError.message);
  const statusMap = new Map((states || []).map((state: { id: string; account_status: string }) => [state.id, state.account_status]));
  const profiles = rawProfiles?.map(profile => ({ ...profile, account_status: statusMap.get(profile.id) }));
  const teachers = profiles?.filter(p => p.role === 'TEACHER') || [];
  const students = profiles?.filter(p => p.role === 'STUDENT') || [];
  const admins = profiles?.filter(p => p.role === 'ADMIN') || [];
  return { teachers, students, admins };
}

async function invokeAdminAction(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-users', { body });
  if (error) {
    // Preserve server validation errors instead of falling back to privileged browser access.
    let message = 'მომხმარებლის მართვა ვერ მოხერხდა. გადაამოწმეთ admin-users ფუნქციის კონფიგურაცია.';
    if ('context' in error && error.context instanceof Response) {
      try {
        const response = await error.context.clone().json();
        if (typeof response.error === 'string') message = response.error;
      } catch { /* Keep the actionable default for network or non-JSON failures. */ }
    }
    throw new Error(message);
  }
  if (!data?.success) throw new Error(data?.error || 'მომხმარებლის მართვა ვერ მოხერხდა.');
  return data;
}

export async function addWhitelistUser(user: AddWhitelistUserData) {
  const data = await invokeAdminAction({ action: 'create', user });
  return data.user;
}

export async function adminUpdateUser(userId: string, updates: AdminUpdateUserData) {
  await invokeAdminAction({ action: 'update', userId, updates });
  return true;
}

export async function deleteWhitelistUser(userId: string) {
  await invokeAdminAction({ action: 'delete', userId });
  return true;
}

export async function getWhitelist() {
  const { data: profiles, error } = await supabase.from('profiles').select('id, name, role, subject, grade, email, group_id');
  if (error) throw new Error(error.message);
  const teachers = profiles?.filter(p => p.role === 'TEACHER') || [];
  const students = profiles?.filter(p => p.role === 'STUDENT') || [];
  return { teachers, students };
}

export async function updateProfile(userId: string, email: string, updates: UpdateProfileUpdates, currentPassword?: string) {
  const payload: {
    name?: string;
    subject?: string | null;
    phone?: string | null;
    grade?: string | null;
    teaching_subjects?: string[];
  } = {};
  if (updates.name !== undefined) {
    if (typeof updates.name === 'string') {
      const trimmed = updates.name.trim();
      if (trimmed.length > 0) {
        payload.name = trimmed;
      }
    } else if (updates.name) {
      payload.name = updates.name;
    }
  }
  if (updates.teaching_subjects !== undefined) {
    payload.teaching_subjects = updates.teaching_subjects;
  } else if (updates.subject !== undefined) {
    payload.subject = updates.subject ? (typeof updates.subject === 'string' ? updates.subject.trim() : updates.subject) : null;
  }
  if (updates.phone !== undefined) {
    payload.phone = updates.phone ? (typeof updates.phone === 'string' ? updates.phone.trim() : updates.phone) : null;
  }
  if (updates.grade !== undefined) {
    payload.grade = updates.grade ? (typeof updates.grade === 'string' ? updates.grade.trim() : updates.grade) : null;
  }

  if (updates.newPassword) {
    if (updates.newPassword.length < MIN_PASSWORD_LENGTH) throw new Error('პაროლი უნდა შეიცავდეს მინიმუმ 8 სიმბოლოს.');
    if (!currentPassword) {
      throw new Error('მიმდინარე პაროლი არასწორია');
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (signInError) {
      throw new Error('მიმდინარე პაროლი არასწორია');
    }
    const { error } = await supabase.auth.updateUser({ password: updates.newPassword });
    if (error) throw error;
  }


  if (Object.keys(payload).length > 0) {
    const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
    if (error) throw error;
  }

  if (updates.email) {
    const { error } = await supabase.auth.updateUser({ email: updates.email.trim().toLowerCase() });
    if (error) throw error;
  }


  const { data: updatedProfile, error: profileError } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (profileError) throw profileError;
  return updatedProfile;
}
