export type Role = 'TEACHER' | 'STUDENT' | 'ADMIN';
export type UserRole = Role;

export interface TeacherUser {
  id: string;
  name: string;
  email: string;
  role: 'TEACHER';
  subject: string;
  phone?: string;
}

export interface StudentUser {
  id: string;
  name: string;
  email: string;
  role: 'STUDENT';
  grade: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN';
}

export type User = TeacherUser | StudentUser | AdminUser;

// Safe versions never include the password field
export type SafeTeacherUser = TeacherUser;
export type SafeStudentUser = StudentUser;
export type SafeAdminUser = AdminUser;
export type SafeUser = SafeTeacherUser | SafeStudentUser | SafeAdminUser;

export interface Subject {
  id: string;
  name: string;
  teacherId: string;
  color: string;
  icon: string;
}

export interface Assignment {
  id: string;
  subjectId: string;
  teacherId: string;
  title: string;
  description: string;
  dueDate: string; // ISO date string or YYYY-MM-DDTHH:mm
  attachmentUrl?: string;
  attachmentName?: string;
  allowedFormats?: string[];
  createdAt: string;
}

// Enriched assignment type returned by teacher dashboard API
export interface AssignmentWithMeta extends Assignment {
  subjectName: string;
  submissionsCount: number;
  totalStudents: number;
}

export type SubmissionStatus = 'SUBMITTED' | 'APPROVED' | 'DECLINED';

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  submissionLink?: string;
  studentComment?: string;
  status: SubmissionStatus;
  teacherFeedback?: string;
  grade?: number | null;
  submittedAt: string;
  reviewedAt?: string | null;
}

export interface SubjectProgress {
  subjectId: string;
  subjectName: string;
  color: string;
  icon: string;
  teacherName: string;
  totalAssignments: number;
  completedAssignments: number; // APPROVED
  submittedAssignments: number; // SUBMITTED (pending review)
  declinedAssignments: number;  // DECLINED
  missingAssignments: number;   // not yet submitted
  percentage: number;
}

// Enriched assignment type returned by student dashboard API
export interface StudentAssignmentWithStatus extends Assignment {
  subjectName: string;
  subjectColor: string;
  teacherName: string;
  submission: Submission | null;
}

export interface CreateAssignmentParams {
  subjectId: string;
  teacherId: string;
  title: string;
  description: string;
  dueDate: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  allowedFormats?: string[];
}

export interface AddWhitelistUserData {
  email: string;
  password?: string;
  name: string;
  role: Role;
  grade?: string | null;
  subject?: string | null;
  phone?: string | null;
}

export interface AdminUpdateUserData {
  name?: string;
  role?: Role;
  email?: string;
  password?: string;
  subject?: string | null;
  phone?: string | null;
  grade?: string | null;
}

export interface UpdateProfileUpdates {
  name?: string;
  subject?: string | null;
  phone?: string | null;
  grade?: string | null;
  email?: string;
  newPassword?: string;
}

