const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { PGlite } = require('@electric-sql/pglite');
const { describe, test } = require('../helpers/test-utils.cjs');

const ids = {
  student: '00000000-0000-0000-0000-000000000001',
  teacher: '00000000-0000-0000-0000-000000000002',
  otherTeacher: '00000000-0000-0000-0000-000000000003',
  admin: '00000000-0000-0000-0000-000000000004',
};
let database;
async function db() {
  if (database) return database;
  database = new PGlite();
  await database.exec(`
    CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
    ALTER DEFAULT PRIVILEGES GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE TABLE auth.users (id UUID PRIMARY KEY, email TEXT, email_confirmed_at TIMESTAMPTZ DEFAULT now(), encrypted_password TEXT DEFAULT 'fixture-password-hash');
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    CREATE FUNCTION auth.role() RETURNS TEXT LANGUAGE sql STABLE AS $$
      SELECT coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'authenticated');
    $$;
    CREATE TABLE storage.buckets (id TEXT PRIMARY KEY, name TEXT, public BOOLEAN,
      file_size_limit BIGINT, allowed_mime_types TEXT[]);
    CREATE TABLE storage.objects (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id TEXT, name TEXT UNIQUE);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    CREATE FUNCTION storage.foldername(name TEXT) RETURNS TEXT[] LANGUAGE sql IMMUTABLE AS $$
      SELECT string_to_array(name, '/');
    $$;
  `);
  for (const file of ['20261011000000_consolidated_schema_and_security.sql', '20261012000000_submission_and_storage_integrity.sql', '20261012010000_require_confirmed_email.sql', '20261021175608_activation_and_teacher_subjects.sql', '20261021175930_restrict_internal_function_access.sql']) {
    await database.exec(fs.readFileSync(path.join(__dirname, '../../supabase/migrations', file), 'utf8'));
  }
  await database.exec(`
    GRANT USAGE ON SCHEMA public, auth, storage TO authenticated, anon;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public, storage TO authenticated, anon;
    SELECT set_config('request.jwt.claim.role', 'service_role', false);
    INSERT INTO auth.users (id, email) VALUES
      ('${ids.student}', 'student@example.test'), ('${ids.teacher}', 'teacher@example.test'),
      ('${ids.otherTeacher}', 'other@example.test'), ('${ids.admin}', 'admin@example.test');
    INSERT INTO profiles (id, role, name, email) VALUES
      ('${ids.student}', 'STUDENT', 'Student', 'student@example.test'),
      ('${ids.teacher}', 'TEACHER', 'Teacher', 'teacher@example.test'),
      ('${ids.otherTeacher}', 'TEACHER', 'Other', 'other@example.test'),
      ('${ids.admin}', 'ADMIN', 'Admin', 'admin@example.test');
    INSERT INTO subjects (id, name, color, icon, teacher_id) VALUES
      ('subject', 'Subject', 'blue', 'book', '${ids.teacher}'),
      ('other-subject', 'Other', 'blue', 'book', '${ids.otherTeacher}');
    INSERT INTO assignments (id, subject_id, teacher_id, title, due_date, attachment_url, allowed_formats) VALUES
      ('assignment', 'subject', '${ids.teacher}', 'Homework', '2099-01-01', '${ids.teacher}/material.pdf', ARRAY['.pdf']),
      ('expired', 'subject', '${ids.teacher}', 'Expired', '2000-01-01', NULL, ARRAY['.pdf']);
    INSERT INTO storage.objects (bucket_id, name) VALUES
      ('homework-files', '${ids.teacher}/material.pdf'), ('homework-files', '${ids.teacher}/draft.pdf'),
      ('homework-files', '${ids.student}/old.pdf'), ('homework-files', '${ids.student}/new.pdf'),
      ('homework-files', '${ids.student}/wrong.docx');
    INSERT INTO submissions (id, assignment_id, student_id, student_name, file_url, status, grade) VALUES
      ('submission', 'assignment', '${ids.student}', 'Student', '${ids.student}/old.pdf', 'APPROVED', 9),
      ('expired-submission', 'expired', '${ids.student}', 'Student', '${ids.student}/new.pdf', 'SUBMITTED', NULL);
    SELECT set_config('request.jwt.claim.role', '', false);
  `);
  await database.exec(fs.readFileSync(path.join(__dirname, '../../supabase/migrations/20261021184518_college_groups.sql'), 'utf8'));
  await database.exec(fs.readFileSync(path.join(__dirname, '../../supabase/migrations/20261021193529_teacher_multiple_subjects.sql'), 'utf8'));
  return database;
}

function scenario(name, role, fn) {
  test(name, async () => {
    const database = await db();
    await database.exec('BEGIN; SET LOCAL ROLE authenticated;');
    try {
      await database.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [ids[role]]);
      await fn(database);
    } finally { await database.exec('ROLLBACK'); }
  });
}

async function identity(db, id) {
  await db.exec('RESET ROLE');
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [id]);
  await db.exec('SET LOCAL ROLE authenticated');
}
async function otherGroup(db) {
  await identity(db, ids.admin);
  return (await db.query("SELECT public.save_college_group(NULL,'I14-25/1','INTEGRATED','კოლეჯის პროგრამა',true,$1::uuid[]) AS id", [[ids.otherTeacher]])).rows[0].id;
}

describe('Production PostgreSQL migrations: RLS, deadlines and file ownership', () => {
  scenario('One teacher can have Physics and Mathematics as distinct subjects', 'admin', async db => {
    await db.query("UPDATE profiles SET teaching_subjects=ARRAY['Subject','Physics','Mathematics'] WHERE id=$1",[ids.teacher]);
    const {rows}=await db.query('SELECT name FROM subjects WHERE teacher_id=$1 ORDER BY name',[ids.teacher]);
    assert.deepEqual(rows.map(r=>r.name),['Mathematics','Physics','Subject']);
  });
  scenario('Adding a second subject preserves original assignment subject IDs and names', 'admin', async db => {
    await db.query("UPDATE profiles SET teaching_subjects=ARRAY['Subject','Physics'] WHERE id=$1",[ids.teacher]);
    const {rows}=await db.query("SELECT a.subject_id,s.name FROM assignments a JOIN subjects s ON s.id=a.subject_id WHERE a.id='assignment'");
    assert.deepEqual(rows[0],{subject_id:'subject',name:'Subject'});
  });
  scenario('A subject with assignment history cannot silently be removed or renamed', 'admin', async db => {
    await assert.rejects(db.query("UPDATE profiles SET teaching_subjects=ARRAY['Physics'] WHERE id=$1",[ids.teacher]),/უკვე აქვს დავალებები/);
  });
  scenario('Duplicate subjects normalize without creating duplicate courses', 'admin', async db => {
    await db.query("UPDATE profiles SET teaching_subjects=ARRAY['Subject',' Physics ','physics'] WHERE id=$1",[ids.teacher]);
    const {rows}=await db.query('SELECT teaching_subjects FROM profiles WHERE id=$1',[ids.teacher]);
    assert.deepEqual(rows[0].teaching_subjects,['Subject','Physics']);
  });
  scenario('Teacher can publish homework for their second subject', 'admin', async db => {
    await db.query("UPDATE profiles SET teaching_subjects=ARRAY['Subject','Physics'] WHERE id=$1",[ids.teacher]);
    const physics=(await db.query("SELECT id FROM subjects WHERE teacher_id=$1 AND name='Physics'",[ids.teacher])).rows[0].id;
    const group=(await db.query("SELECT id FROM college_groups WHERE code='TEST-LEGACY'")).rows[0].id;
    await identity(db,ids.teacher);
    const {rows}=await db.query("INSERT INTO assignments(subject_id,teacher_id,title,due_date,group_ids) VALUES($1,$2,'Physics homework','2099-01-01',$3) RETURNING subject_id",[physics,ids.teacher,[group]]);
    assert.equal(rows[0].subject_id,physics);
  });
  scenario('Migration gives every existing student exactly one group and preserves assignments', 'admin', async db => {
    assert.equal((await db.query("SELECT count(*)::int n FROM profiles WHERE role='STUDENT' AND group_id IS NULL")).rows[0].n, 0);
    assert.equal((await db.query("SELECT count(*)::int n FROM assignments WHERE cardinality(group_ids)=0")).rows[0].n, 0);
  });
  scenario('Student cannot create a group or change their own membership', 'student', async db => {
    await assert.rejects(db.query("SELECT public.save_college_group(NULL,'FORGED','INTEGRATED','',true,'{}')"), /Admin access required/);
  });
  scenario('Student cannot transfer themselves to another group', 'student', async db => {
    const group = await otherGroup(db);
    await identity(db, ids.student);
    await assert.rejects(db.query('UPDATE profiles SET group_id=$1 WHERE id=$2', [group,ids.student]), /მხოლოდ ადმინისტრატორს/);
  });
  scenario('Admin can move a student, who then cannot read the previous group assignments or attachments', 'admin', async db => {
    const group = await otherGroup(db);
    await db.query('UPDATE profiles SET group_id=$1 WHERE id=$2', [group,ids.student]);
    await identity(db, ids.student);
    assert.equal((await db.query('SELECT * FROM assignments')).rows.length, 0);
    assert.equal((await db.query('SELECT * FROM storage.objects WHERE name=$1', [`${ids.teacher}/material.pdf`])).rows.length, 0);
  });
  scenario('Teacher cannot read students from a group they do not teach', 'admin', async db => {
    const group = await otherGroup(db);
    await db.query('UPDATE profiles SET group_id=$1 WHERE id=$2', [group,ids.student]);
    await identity(db, ids.teacher);
    assert.equal((await db.query("SELECT * FROM profiles WHERE role='STUDENT'")).rows.length, 0);
  });
  scenario('Teacher can assign to several of their groups atomically', 'admin', async db => {
    const group = await otherGroup(db);
    await db.query('INSERT INTO teacher_groups VALUES ($1,$2)',[ids.teacher,group]);
    const legacy = (await db.query("SELECT id FROM college_groups WHERE code='TEST-LEGACY'")).rows[0].id;
    await identity(db, ids.teacher);
    const { rows } = await db.query("INSERT INTO assignments(id,subject_id,teacher_id,title,due_date,group_ids) VALUES ('multi','subject',$1,'Multi','2099-01-01',$2) RETURNING group_ids", [ids.teacher,[legacy,group]]);
    assert.equal(rows[0].group_ids.length, 2);
  });
  scenario('Teacher cannot publish to an unassigned group', 'admin', async db => {
    const group = await otherGroup(db);
    await identity(db, ids.teacher);
    await assert.rejects(db.query("INSERT INTO assignments(id,subject_id,teacher_id,title,due_date,group_ids) VALUES ('bad','subject',$1,'Bad','2099-01-01',$2)",[ids.teacher,[group]]), /მასწავლებლის/);
  });
  scenario('Assignment requires at least one target group', 'teacher', async db => {
    await assert.rejects(db.query("INSERT INTO assignments(id,subject_id,teacher_id,title,due_date,group_ids) VALUES ('bad','subject',$1,'Bad','2099-01-01','{}')",[ids.teacher]), /მინიმუმ ერთი/);
  });
  scenario('Out-of-group student cannot submit through the API directly', 'admin', async db => {
    const group=await otherGroup(db);
    await db.query('UPDATE profiles SET group_id=$1 WHERE id=$2',[group,ids.student]);
    await identity(db,ids.student);
    await assert.rejects(db.query("INSERT INTO submissions(id,assignment_id,student_id,student_name,submission_link) VALUES ('forged','assignment',$1,'Student','https://docs.google.com/document/d/x')",[ids.student]), /row-level security|assignment/i);
  });
  scenario('Archived group rejects new student enrollment', 'admin', async db => {
    const group=await otherGroup(db);
    await db.query('UPDATE college_groups SET active=false WHERE id=$1',[group]);
    await assert.rejects(db.query('UPDATE profiles SET group_id=$1 WHERE id=$2',[group,ids.student]), /მოქმედი ჯგუფი/);
  });
  scenario('A non-teacher cannot be assigned as a group teacher', 'admin', async db => {
    await assert.rejects(db.query("SELECT public.save_college_group(NULL,'BAD','NON_INTEGRATED','',true,$1::uuid[])",[[ids.student]]), /არასწორი მასწავლებელი/);
  });
  scenario('Group code uniqueness ignores case and whitespace', 'admin', async db => {
    await otherGroup(db);
    await assert.rejects(db.query("SELECT public.save_college_group(NULL,' i14-25/1 ','INTEGRATED','',true,'{}')"), /unique constraint/);
  });
  scenario('Student cannot be saved without a group', 'admin', async db => {
    await assert.rejects(db.query('UPDATE profiles SET group_id=NULL WHERE id=$1',[ids.student]), /ჯგუფი|student_exactly_one_group/);
  });
  scenario('Word format is accepted and validated on student upload', 'teacher', async db => {
    await db.query("UPDATE assignments SET allowed_formats=ARRAY['.doc,.docx'] WHERE id='assignment'");
    await identity(db,ids.student);
    const { rows } = await db.query("UPDATE submissions SET file_url=$1 WHERE id='submission' RETURNING file_url",[`${ids.student}/wrong.docx`]);
    assert.equal(rows.length,1);
  });
  test('Supabase default privileges cannot expose activation helpers to anonymous users', async () => {
    const database = await db();
    const { rows } = await database.query("SELECT has_function_privilege('anon', 'public.get_my_account_state()', 'EXECUTE') AS own_state, has_function_privilege('anon', 'public.get_admin_account_states()', 'EXECUTE') AS admin_states, has_function_privilege('authenticated', 'public.enforce_submission_rules()', 'EXECUTE') AS trigger_access");
    assert.deepEqual(rows[0], { own_state: false, admin_states: false, trigger_access: false });
  });
  scenario('A confirmed invitation session without password cannot read academic data', 'student', async db => {
    await db.exec('RESET ROLE');
    await db.query("UPDATE auth.users SET encrypted_password = '' WHERE id = $1", [ids.student]);
    await db.exec('SET LOCAL ROLE authenticated');
    assert.equal((await db.query('SELECT public.get_my_account_state() AS state')).rows[0].state, 'PASSWORD_REQUIRED');
    assert.equal((await db.query('SELECT * FROM subjects')).rows.length, 0);
    assert.equal((await db.query('SELECT * FROM profiles')).rows.length, 0);
    assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length, 0);
    await db.exec('RESET ROLE');
    await db.query("UPDATE auth.users SET encrypted_password = 'saved-password-hash' WHERE id = $1", [ids.student]);
    await db.exec('SET LOCAL ROLE authenticated');
    assert.equal((await db.query('SELECT public.get_my_account_state() AS state')).rows[0].state, 'ACTIVE');
    assert.equal((await db.query('SELECT * FROM subjects')).rows.length, 2);
  });
  scenario('Students cannot list other account activation states', 'student', async db => {
    assert.equal((await db.query('SELECT * FROM public.get_admin_account_states()')).rows.length, 0);
  });
  scenario('Admin sees invitation status without password data', 'admin', async db => {
    const { rows } = await db.query('SELECT * FROM public.get_admin_account_states()');
    assert.equal(rows.length, 4);
    assert.deepEqual(Object.keys(rows[0]).sort(), ['account_status', 'id']);
  });
  scenario('Adding a teacher creates their subject and renaming preserves its ID', 'admin', async db => {
    await db.exec('RESET ROLE');
    await db.query("INSERT INTO auth.users(id,email) VALUES ('00000000-0000-0000-0000-000000000005','new@example.test')");
    await db.exec('SET LOCAL ROLE authenticated');
    await db.query("INSERT INTO profiles(id,role,name,email,subject) VALUES ('00000000-0000-0000-0000-000000000005','TEACHER','New Teacher','new@example.test','Tik Tok')");
    const before = (await db.query("SELECT id FROM subjects WHERE name='Tik Tok'")).rows;
    assert.equal(before.length, 1);
    await db.query("UPDATE profiles SET subject='Media' WHERE id='00000000-0000-0000-0000-000000000005'");
    const after = (await db.query("SELECT id FROM subjects WHERE name='Media'")).rows;
    assert.equal(after[0].id, before[0].id);
  });
  scenario('Unrelated teacher profile edits do not duplicate subjects', 'admin', async db => {
    await db.query("UPDATE profiles SET subject='New Subject' WHERE id=$1", [ids.otherTeacher]);
    await db.query("UPDATE profiles SET name='Renamed Teacher' WHERE id=$1", [ids.otherTeacher]);
    assert.equal((await db.query('SELECT * FROM subjects WHERE teacher_id=$1', [ids.otherTeacher])).rows.length, 1);
  });
  scenario('Student can read attached teacher material but not teacher drafts', 'student', async db => {
    const { rows } = await db.query('SELECT name FROM storage.objects WHERE name LIKE $1 ORDER BY name', [`${ids.teacher}/%`]);
    assert.deepEqual(rows.map(row => row.name), [`${ids.teacher}/material.pdf`]);
  });
  scenario('Unrelated teacher cannot read student files', 'otherTeacher', async db => {
    const { rows } = await db.query('SELECT name FROM storage.objects WHERE name LIKE $1', [`${ids.student}/%`]);
    assert.equal(rows.length, 0);
  });
  scenario('Assigned teacher can read student submission files', 'teacher', async db => {
    const { rows } = await db.query('SELECT name FROM storage.objects WHERE name = $1', [`${ids.student}/old.pdf`]);
    assert.equal(rows.length, 1);
  });
  scenario('Direct DELETE cannot cancel an expired submission', 'student', async db => {
    await assert.rejects(db.query("DELETE FROM submissions WHERE id = 'expired-submission'"), /ვადა ამოიწურა/);
  });
  scenario('Storage DELETE cannot remove a linked file', 'student', async db => {
    const { rows } = await db.query('DELETE FROM storage.objects WHERE name = $1 RETURNING name', [`${ids.student}/old.pdf`]);
    assert.equal(rows.length, 0);
  });
  scenario('Direct UPDATE cannot resubmit after the deadline', 'student', async db => {
    await assert.rejects(db.query("UPDATE submissions SET student_comment = 'changed' WHERE id = 'expired-submission'"), /ვადა ამოიწურა/);
  });
  scenario('Resubmission clears old review and uses server identity', 'student', async db => {
    const { rows } = await db.query("UPDATE submissions SET status = 'APPROVED', grade = 10, student_name = 'Forged' WHERE id = 'submission' RETURNING status, grade, student_name");
    assert.deepEqual(rows[0], { status: 'SUBMITTED', grade: null, student_name: 'Student' });
  });
  scenario('Direct UPDATE enforces teacher file formats', 'student', async db => {
    await assert.rejects(db.query('UPDATE submissions SET file_url = $1 WHERE id = $2', [`${ids.student}/wrong.docx`, 'submission']), /ფორმატი დაუშვებელია/);
  });
  scenario('Submission cannot move to another assignment', 'student', async db => {
    await assert.rejects(db.query("UPDATE submissions SET assignment_id = 'expired' WHERE id = 'submission'"), /identity cannot be changed/);
  });
  scenario('Teacher reviews preserve submitted content', 'teacher', async db => {
    const { rows } = await db.query("UPDATE submissions SET student_comment = 'Forged', file_url = 'forged.pdf', grade = 8 WHERE id = 'submission' RETURNING file_url, student_comment, grade");
    assert.equal(rows[0].file_url, `${ids.student}/old.pdf`);
    assert.equal(rows[0].student_comment, null);
    assert.equal(rows[0].grade, 8);
  });
  scenario('Teacher cannot reassign homework to another teacher subject', 'teacher', async db => {
    await assert.rejects(db.query("UPDATE assignments SET subject_id = 'other-subject' WHERE id = 'assignment'"), /row-level security/);
  });
  scenario('Cancelled record releases its file for cleanup', 'student', async db => {
    await db.query("DELETE FROM submissions WHERE id = 'submission'");
    const { rows } = await db.query('DELETE FROM storage.objects WHERE name = $1 RETURNING name', [`${ids.student}/old.pdf`]);
    assert.equal(rows.length, 1);
  });
  scenario('Direct profile email forgery is rejected', 'student', async db => {
    await assert.rejects(db.query('UPDATE profiles SET email = $1 WHERE id = $2', ['forged@example.test', ids.student]), /confirmed Auth email/);
  });
  test('Confirmed Auth email automatically updates the profile', async () => {
    const database = await db();
    await database.exec('BEGIN');
    try {
      await database.query('UPDATE auth.users SET email = $1 WHERE id = $2', ['confirmed@example.test', ids.student]);
      const { rows } = await database.query('SELECT email FROM profiles WHERE id = $1', [ids.student]);
      assert.equal(rows[0].email, 'confirmed@example.test');
    } finally { await database.exec('ROLLBACK'); }
  });
  test('Teacher deletion cannot cascade through academic history', async () => {
    const database = await db();
    await assert.rejects(database.query('DELETE FROM auth.users WHERE id = $1', [ids.teacher]), /foreign key constraint/);
  });
  test('Existing confirmed test account still has access', async () => {
    const database = await db();
    const { rows } = await database.query('SELECT email_confirmed_at FROM auth.users WHERE id = $1', [ids.student]);
    assert.ok(rows[0].email_confirmed_at);
  });
  test('Pending account cannot read academic data or homework storage', async () => {
    const database = await db();
    await database.exec('BEGIN');
    try {
      await database.query('UPDATE auth.users SET email_confirmed_at = NULL WHERE id = $1', [ids.student]);
      await database.exec('SET LOCAL ROLE authenticated');
      await database.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [ids.student]);
      for (const table of ['profiles', 'subjects', 'assignments', 'submissions', 'storage.objects']) {
        const { rows } = await database.query('SELECT * FROM ' + table);
        assert.equal(rows.length, 0, table);
      }
    } finally { await database.exec('ROLLBACK'); }
  });
  test('Close isolated PostgreSQL database', async () => { await database?.close(); database = null; });
});
