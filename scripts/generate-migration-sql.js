import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const whitelistStr = fs.readFileSync(path.join(rootDir, 'data', 'whitelist.json'), 'utf8');
const dbStr = fs.readFileSync(path.join(rootDir, 'data', 'db.json'), 'utf8');

const whitelist = JSON.parse(whitelistStr);
const db = JSON.parse(dbStr);

// ID Mapping: old String ID -> new UUID
const idMap = new Map();

function getUuid(oldId) {
  if (!idMap.has(oldId)) {
    idMap.set(oldId, crypto.randomUUID());
  }
  return idMap.get(oldId);
}

// Function to escape SQL strings
const esc = (str) => {
  if (str === null || str === undefined) return 'NULL';
  return "'" + String(str).replace(/'/g, "''") + "'";
};

let sql = `-- MIGRATION SCRIPT
-- Paste this into the Supabase SQL Editor AFTER running schema.sql

`;

// 1. Insert into auth.users (to migrate passwords)
sql += `-- Migrate Users to auth.users\n`;
const allUsers = [...whitelist.admins, ...whitelist.teachers, ...whitelist.students];

for (const user of allUsers) {
  const uuid = getUuid(user.id);
  const rawEmail = user.email.toLowerCase();
  sql += `INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change) 
VALUES (${esc(uuid)}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${esc(rawEmail)}, ${esc(user.password)}, now(), now(), now(), '', '', '', '') ON CONFLICT (id) DO NOTHING;\n`;
}

// 2. Insert into profiles
sql += `\n-- Migrate Profiles\n`;
for (const user of allUsers) {
  const uuid = getUuid(user.id);
  let role = 'STUDENT';
  if (whitelist.admins.find(u => u.id === user.id)) role = 'ADMIN';
  else if (whitelist.teachers.find(u => u.id === user.id)) role = 'TEACHER';

  sql += `INSERT INTO profiles (id, role, name, email, grade, subject, phone) 
VALUES (${esc(uuid)}, ${esc(role)}, ${esc(user.name)}, ${esc(user.email)}, ${esc(user.grade)}, ${esc(user.subject)}, ${esc(user.phone)});\n`;
}

// 3. Insert into subjects
sql += `\n-- Migrate Subjects\n`;
for (const subj of db.subjects || []) {
  sql += `INSERT INTO subjects (id, name, color, icon, teacher_id) 
VALUES (${esc(subj.id)}, ${esc(subj.name)}, ${esc(subj.color)}, ${esc(subj.icon)}, ${esc(getUuid(subj.teacherId))});\n`;
}

// 4. Insert into assignments
sql += `\n-- Migrate Assignments\n`;
for (const asg of db.assignments || []) {
  sql += `INSERT INTO assignments (id, subject_id, teacher_id, title, description, due_date, attachment_url, attachment_name, created_at) 
VALUES (${esc(asg.id)}, ${esc(asg.subjectId)}, ${esc(getUuid(asg.teacherId))}, ${esc(asg.title)}, ${esc(asg.description)}, ${esc(asg.dueDate)}, ${esc(asg.attachmentUrl)}, ${esc(asg.attachmentName)}, ${esc(asg.createdAt)});\n`;
}

// 5. Insert into submissions
sql += `\n-- Migrate Submissions\n`;
for (const sub of db.submissions || []) {
  sql += `INSERT INTO submissions (id, assignment_id, student_id, student_name, file_url, file_name, file_size, student_comment, status, teacher_feedback, submitted_at, reviewed_at) 
VALUES (${esc(sub.id)}, ${esc(sub.assignmentId)}, ${esc(getUuid(sub.studentId))}, ${esc(sub.studentName)}, ${esc(sub.fileUrl)}, ${esc(sub.fileName)}, ${esc(sub.fileSize)}, ${esc(sub.studentComment)}, ${esc(sub.status)}, ${esc(sub.teacherFeedback)}, ${esc(sub.submittedAt)}, ${esc(sub.reviewedAt)});\n`;
}

fs.writeFileSync(path.join(rootDir, 'supabase', 'data-migration.sql'), sql);
console.log('Migration SQL generated successfully at supabase/data-migration.sql');
