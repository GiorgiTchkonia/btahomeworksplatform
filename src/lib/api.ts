import { supabaseAdmin } from './supabase-admin';
import { supabase } from './supabase';
import { User, StudentAssignmentWithStatus, SubjectProgress, AssignmentWithMeta, Submission } from '@/types';

import imageCompression from 'browser-image-compression';

// ---------------------------------------------------------
// File Upload
// ---------------------------------------------------------
export async function uploadFile(file: File) {
  const maxFileSize = 15 * 1024 * 1024;
  if (file.size > maxFileSize) {
    throw new Error('ფაილის ზომა არ უნდა აღემატებოდეს 15MB-ს.');
  }

  const fileExt = file.name.split('.').pop()?.toLowerCase();
  const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'gif', 'txt', 'zip', 'rar'];
  
  if (!fileExt || !allowedExtensions.includes(fileExt)) {
    throw new Error('ფაილის ფორმატი დაუშვებელია.');
  }

  let finalFile = file;
  if (['jpg', 'jpeg', 'png'].includes(fileExt)) {
    try {
      const options = {
        maxSizeMB: 1, // დააპატარავებს 1MB-მდე
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      const compressedBlob = await imageCompression(file, options);
      finalFile = new File([compressedBlob], file.name, { type: compressedBlob.type });
    } catch (e) {
      console.error('Image compression failed:', e);
    }
  }

  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error, data } = await supabase.storage
    .from('homework-files')
    .upload(filePath, finalFile);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('homework-files')
    .getPublicUrl(filePath);

  // Return formatted size (e.g., 2.1 MB) based on finalFile
  const sizeMb = finalFile.size / (1024 * 1024);
  const formattedSize = sizeMb < 1 ? `${Math.round(finalFile.size / 1024)} KB` : `${sizeMb.toFixed(1)} MB`;

  return { fileUrl: publicUrl, fileName: file.name, fileSize: formattedSize };
}

// ---------------------------------------------------------
// Student Dashboard
// ---------------------------------------------------------
export async function getStudentDashboardData(studentId: string) {
  // 1. Fetch all subjects
  const { data: subjects, error: error1 } = await supabase.from('subjects').select('*, profiles!teacher_id(name)');
  if (error1) throw new Error(error1.message);
  // 2. Fetch all assignments
  const { data: assignments, error: error2 } = await supabase.from('assignments').select('*');
  if (error2) throw new Error(error2.message);
  // 3. Fetch submissions for this student
  const { data: submissions, error: error3 } = await supabase.from('submissions').select('*').eq('student_id', studentId);
  if (error3) throw new Error(error3.message);

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
  // Fetch assignment to check due date
  const { data: assignmentData, error: assignmentError } = await supabase.from('assignments')
    .select('due_date')
    .eq('id', params.assignmentId)
    .single();
    
  if (assignmentError) throw new Error('დავალება ვერ მოიძებნა');
  
  if (new Date(assignmentData.due_date).getTime() < Date.now()) {
    throw new Error('დავალების ჩაბარების ვადა ამოიწურა. ჩაბარება შეუძლებელია.');
  }

  // Check if exists
  const { data: existing } = await supabase.from('submissions')
    .select('id')
    .eq('assignment_id', params.assignmentId)
    .eq('student_id', params.studentId)
    .maybeSingle();

  const now = new Date().toISOString();

  if (existing) {
    const { data, error } = await supabase.from('submissions').update({
      file_url: params.fileUrl || null,
      file_name: params.fileName || null,
      file_size: params.fileSize || null,
      submission_link: params.submissionLink || null,
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
      file_url: params.fileUrl || null,
      file_name: params.fileName || null,
      file_size: params.fileSize || null,
      submission_link: params.submissionLink || null,
      student_comment: params.studentComment || '',
      status: 'SUBMITTED',
      submitted_at: now
    }).select().single();
    if (error) throw error;
    return data;
  }
}

export async function cancelSubmission(submissionId: string) {
  // Get assignment ID for this submission
  const { data: subData } = await supabase.from('submissions')
    .select('assignment_id')
    .eq('id', submissionId)
    .single();

  if (subData) {
    const { data: assignmentData } = await supabase.from('assignments')
      .select('due_date')
      .eq('id', subData.assignment_id)
      .single();

    if (assignmentData && new Date(assignmentData.due_date).getTime() < Date.now()) {
      throw new Error('დავალების ვადა ამოიწურა. ფაილის წაშლა ან შეცვლა შეუძლებელია.');
    }
  }

  const { error } = await supabase.from('submissions').delete().eq('id', submissionId);
  if (error) throw error;
  return true;
}

// ---------------------------------------------------------
// Teacher Dashboard
// ---------------------------------------------------------
export async function getTeacherDashboardData(teacherId: string) {
  const { data: subjects, error: error1 } = await supabase.from('subjects').select('*').eq('teacher_id', teacherId);
  if (error1) throw new Error(error1.message);
  const { data: assignments, error: error2 } = await supabase.from('assignments').select('*').eq('teacher_id', teacherId);
  if (error2) throw new Error(error2.message);
  const { data: submissions, error: error3 } = await supabase.from('submissions').select('assignment_id, status, profiles!inner(*)').eq('profiles.role', 'STUDENT');
  if (error3) throw new Error(error3.message);
  const { data: students, error: error4 } = await supabase.from('profiles').select('*').eq('role', 'STUDENT');
  if (error4) throw new Error(error4.message);
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
      allowedFormats: a.allowed_formats || [],
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
    attachment_name: params.attachmentName,
    allowed_formats: params.allowedFormats || []
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
  const { data: assignment, error: error1 } = await supabase.from('assignments').select('*').eq('id', assignmentId).single();
  if (error1) throw new Error(error1.message);
  if (!assignment) return null;

  const { data: subject, error: error2 } = await supabase.from('subjects').select('*').eq('id', assignment.subject_id).single();
  if (error2) throw new Error(error2.message);
  const { data: teacher, error: error3 } = await supabase.from('profiles').select('*').eq('id', assignment.teacher_id).single();
  if (error3) throw new Error(error3.message);
  
  const { data: submissions, error: error4 } = await supabase.from('submissions').select('*').eq('assignment_id', assignmentId);
  if (error4) throw new Error(error4.message);
  const { data: students, error: error5 } = await supabase.from('profiles').select('*').eq('role', 'STUDENT');
  if (error5) throw new Error(error5.message);

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
  const { data: profiles, error } = await supabase.from('profiles').select('*');
  if (error) throw new Error(error.message);
  const teachers = profiles?.filter(p => p.role === 'TEACHER') || [];
  const students = profiles?.filter(p => p.role === 'STUDENT') || [];
  const admins = profiles?.filter(p => p.role === 'ADMIN') || [];
  return { teachers, students, admins };
}

export async function addWhitelistUser(user: any) {
  if (!supabaseAdmin) throw new Error("Supabase Admin client not initialized.");
  
  // 1. Create user in auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true
  });
  
  if (authError) throw new Error(authError.message);
  
  // 2. Add to profiles table
  const newUserId = authData.user.id;
  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: newUserId,
    email: user.email,
    name: user.name,
    role: user.role,
    grade: user.grade || null,
    subject: user.subject || null,
    phone: user.phone || null
  });
  
  if (profileError) {
    // rollback
    await supabaseAdmin.auth.admin.deleteUser(newUserId);
    throw new Error(profileError.message);
  }
  
  return authData.user;
}

export async function adminUpdateUser(userId: string, updates: any) {
  if (!supabaseAdmin) throw new Error("Supabase Admin client not initialized.");
  
  // Update auth if email or password changed
  const authUpdates: any = {};
  if (updates.email) authUpdates.email = updates.email;
  if (updates.password) authUpdates.password = updates.password;
  
  if (Object.keys(authUpdates).length > 0) {
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, authUpdates);
    if (authError) throw new Error(authError.message);
  }
  
  // Update profiles table
  const profileUpdates: any = {};
  if (updates.name) profileUpdates.name = updates.name;
  if (updates.role) profileUpdates.role = updates.role;
  if (updates.email) profileUpdates.email = updates.email; // keep in sync
  
  if (updates.role === 'TEACHER') {
    profileUpdates.subject = updates.subject || null;
    profileUpdates.phone = updates.phone || null;
    profileUpdates.grade = null;
  } else if (updates.role === 'STUDENT') {
    profileUpdates.grade = updates.grade || null;
    profileUpdates.subject = null;
    profileUpdates.phone = null;
  } else if (updates.role === 'ADMIN') {
    profileUpdates.grade = null;
    profileUpdates.subject = null;
    profileUpdates.phone = null;
  }
  
  if (Object.keys(profileUpdates).length > 0) {
    const { error: profileError } = await supabaseAdmin.from('profiles').update(profileUpdates).eq('id', userId);
    if (profileError) throw new Error(profileError.message);
  }
  
  return true;
}

export async function deleteWhitelistUser(userId: string) {
  if (!supabaseAdmin) throw new Error("Supabase Admin client not initialized.");
  
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
  return true;
}

export async function getWhitelist() {
  const { data: profiles, error } = await supabase.from('profiles').select('id, name, role, subject, grade, email');
  if (error) throw new Error(error.message);
  const teachers = profiles?.filter(p => p.role === 'TEACHER') || [];
  const students = profiles?.filter(p => p.role === 'STUDENT') || [];
  return { teachers, students };
}

export async function updateProfile(userId: string, email: string, updates: any, currentPassword?: string) {
  const payload: any = {};
  if (updates.name) payload.name = updates.name;
  if (updates.subject) payload.subject = updates.subject;
  if (updates.phone) payload.phone = updates.phone;
  if (updates.grade) payload.grade = updates.grade;
  
  if (Object.keys(payload).length > 0) {
    const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
    if (error) throw error;
  }
  
  if (updates.email) {
    const { error } = await supabase.auth.updateUser({ email: updates.email });
    if (error) throw error;
  }
  
  if (updates.newPassword) {
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
  
  const { data: updatedProfile, error: profileError } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (profileError) throw profileError;
  return updatedProfile;
}
