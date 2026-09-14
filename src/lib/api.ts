import { supabase } from './supabase';
import { User, StudentAssignmentWithStatus, SubjectProgress, AssignmentWithMeta, Submission } from '@/types';

// ---------------------------------------------------------
// File Upload
// ---------------------------------------------------------
export async function uploadFile(file: File) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error, data } = await supabase.storage
    .from('homework-files')
    .upload(filePath, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('homework-files')
    .getPublicUrl(filePath);

  // Return formatted size (e.g., 2.1 MB)
  const sizeMb = file.size / (1024 * 1024);
  const formattedSize = sizeMb < 1 ? `${Math.round(file.size / 1024)} KB` : `${sizeMb.toFixed(1)} MB`;

  return { fileUrl: publicUrl, fileName: file.name, fileSize: formattedSize };
}

// ---------------------------------------------------------
// Student Dashboard
// ---------------------------------------------------------
export async function getStudentDashboardData(studentId: string) {
  // 1. Fetch all subjects
  const { data: subjects } = await supabase.from('subjects').select('*, profiles!teacher_id(name)');
  // 2. Fetch all assignments
  const { data: assignments } = await supabase.from('assignments').select('*');
  // 3. Fetch submissions for this student
  const { data: submissions } = await supabase.from('submissions').select('*').eq('student_id', studentId);

  const subjectMap = new Map(subjects?.map(s => [s.id, s]));
  const studentSubmissionMap = new Map(submissions?.map(s => [s.assignment_id, s]));

  const assignmentsBySubject = new Map<string, any[]>();
  for (const a of (assignments || [])) {
    const bucket = assignmentsBySubject.get(a.subject_id) || [];
    bucket.push(a);
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
          studentComment: submission.student_comment,
          status: submission.status,
          teacherFeedback: submission.teacher_feedback,
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
  fileUrl: string;
  fileName: string;
  fileSize: string;
  studentComment?: string;
}) {
  // Check if exists
  const { data: existing } = await supabase.from('submissions')
    .select('id')
    .eq('assignment_id', params.assignmentId)
    .eq('student_id', params.studentId)
    .single();

  const now = new Date().toISOString();

  if (existing) {
    const { data, error } = await supabase.from('submissions').update({
      file_url: params.fileUrl,
      file_name: params.fileName,
      file_size: params.fileSize,
      student_comment: params.studentComment || '',
      status: 'SUBMITTED',
      teacher_feedback: null,
      submitted_at: now,
      reviewed_at: null
    }).eq('id', existing.id).select().single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase.from('submissions').insert({
      assignment_id: params.assignmentId,
      student_id: params.studentId,
      student_name: params.studentName,
      file_url: params.fileUrl,
      file_name: params.fileName,
      file_size: params.fileSize,
      student_comment: params.studentComment || '',
      status: 'SUBMITTED',
      submitted_at: now
    }).select().single();
    if (error) throw error;
    return data;
  }
}

// ---------------------------------------------------------
// Teacher Dashboard
// ---------------------------------------------------------
export async function getTeacherDashboardData(teacherId: string) {
  const { data: subjects } = await supabase.from('subjects').select('*').eq('teacher_id', teacherId);
  const { data: assignments } = await supabase.from('assignments').select('*').eq('teacher_id', teacherId);
  const { data: submissions } = await supabase.from('submissions').select('assignment_id, status, profiles!inner(*)').eq('profiles.role', 'STUDENT');
  const { data: students } = await supabase.from('profiles').select('*').eq('role', 'STUDENT');
  const totalStudents = students?.length || 0;

  const submissionCounts = new Map(); // assignmentId -> { approved, declined, pending }
  
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
      subjectId: a.subject_id,
      teacherId: a.teacher_id,
      title: a.title,
      description: a.description,
      dueDate: a.due_date,
      attachmentUrl: a.attachment_url,
      attachmentName: a.attachment_name,
      createdAt: a.created_at,
      subjectName: subjectMap.get(a.subject_id) || 'უცნობი',
      submissionsCount: counts.approved + counts.declined + counts.pending,
      totalStudents
    };
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return { subjects: subjects || [], assignments: dashboardAssignments, totalStudents };
}

export async function createAssignment(params: any) {
  const { data, error } = await supabase.from('assignments').insert({
    subject_id: params.subjectId,
    teacher_id: params.teacherId,
    title: params.title,
    description: params.description,
    due_date: params.dueDate,
    attachment_url: params.attachmentUrl,
    attachment_name: params.attachmentName
  }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteAssignment(assignmentId: string) {
  const { error } = await supabase.from('assignments').delete().eq('id', assignmentId);
  if (error) throw error;
  return true;
}

export async function getAssignmentDetails(assignmentId: string) {
  const { data: assignment } = await supabase.from('assignments').select('*').eq('id', assignmentId).single();
  if (!assignment) return null;

  const { data: subject } = await supabase.from('subjects').select('*').eq('id', assignment.subject_id).single();
  const { data: teacher } = await supabase.from('profiles').select('*').eq('id', assignment.teacher_id).single();
  
  const { data: submissions } = await supabase.from('submissions').select('*').eq('assignment_id', assignmentId);
  const { data: students } = await supabase.from('profiles').select('*').eq('role', 'STUDENT');

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
    studentComment: s.student_comment,
    status: s.status,
    teacherFeedback: s.teacher_feedback,
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

export async function reviewSubmission(submissionId: string, status: 'APPROVED' | 'DECLINED', feedback: string) {
  const { data, error } = await supabase.from('submissions').update({
    status,
    teacher_feedback: feedback,
    reviewed_at: new Date().toISOString()
  }).eq('id', submissionId).select().single();
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------
// Admin
// ---------------------------------------------------------
export async function getAllUsersForAdmin() {
  const { data: profiles } = await supabase.from('profiles').select('*');
  const teachers = profiles?.filter(p => p.role === 'TEACHER') || [];
  const students = profiles?.filter(p => p.role === 'STUDENT') || [];
  const admins = profiles?.filter(p => p.role === 'ADMIN') || [];
  return { teachers, students, admins };
}

// Note: Adding a user securely requires Supabase Admin API which should run in a Vercel function.
// For now, since the admin flow relied on a custom backend, we can implement it via Edge Function or just return an error for now until the user requests it.
export async function addWhitelistUser(user: any) {
  throw new Error("Add user requires admin API. Please use Supabase dashboard to create users.");
}

export async function deleteWhitelistUser(userId: string) {
  throw new Error("Delete user requires admin API. Please use Supabase dashboard to delete users.");
}

export async function getWhitelist() {
  const { data: profiles } = await supabase.from('profiles').select('id, name, role, subject, grade, email');
  const teachers = profiles?.filter(p => p.role === 'TEACHER') || [];
  const students = profiles?.filter(p => p.role === 'STUDENT') || [];
  return { teachers, students };
}

export async function updateProfile(userId: string, updates: any) {
  const payload: any = {};
  if (updates.name) payload.name = updates.name;
  if (updates.subject) payload.subject = updates.subject;
  if (updates.phone) payload.phone = updates.phone;
  if (updates.grade) payload.grade = updates.grade;
  
  if (Object.keys(payload).length > 0) {
    const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
    if (error) throw error;
  }
  
  if (updates.newPassword) {
    const { error } = await supabase.auth.updateUser({ password: updates.newPassword });
    if (error) throw error;
  }
  
  const { data: updatedProfile } = await supabase.from('profiles').select('*').eq('id', userId).single();
  return updatedProfile;
}
