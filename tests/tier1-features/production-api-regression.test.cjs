const path = require('node:path');
const assert = require('node:assert/strict');
const { describe, test } = require('../helpers/test-utils.cjs');
const load = require('../helpers/load-typescript.cjs');

function setup(responses = []) {
  const events = [];
  const client = {
    auth: { async getUser() { return { data: { user: { id: 'student-1' } }, error: null }; } },
    from(table) {
      let operation = 'read';
      let payload;
      const query = {
        select() { return query; }, eq() { return query; },
        update(value) { operation = 'update'; payload = value; return query; },
        insert(value) { operation = 'insert'; payload = value; return query; },
        delete() { operation = 'delete'; return query; },
        in() { return query; },
        then(resolve,reject) { return Promise.resolve().then(execute).then(resolve,reject); },
        async single() { return execute(); }, async maybeSingle() { return execute(); },
      };
      function execute() {
        events.push({ table, operation, payload });
        if (!responses.length) throw new Error('Unexpected database call');
        return responses.shift();
      }
      return query;
    },
    storage: { from() { return {
      async remove(paths) { events.push({ operation: 'remove', paths }); return { error: null }; },
      async createSignedUrl(file) { events.push({ operation: 'sign', file }); return { data: { signedUrl: 'https://private.example/signed' }, error: null }; },
      async upload(file) { events.push({ operation: 'upload', file }); return { error: null }; },
    }; } },
    functions: { async invoke(name, options) { events.push({ name, options }); return { data: { success: true, user: { id: 'new-user' } }, error: null }; } },
  };
  const messages=load(path.join(__dirname,'../../src/lib/messages.ts'),{});
  const api = load(path.join(__dirname, '../../src/lib/api.ts'), { './supabase': { supabase: client }, './messages': messages });
  return { api, events, client };
}

const futureAssignment = { data: { due_date: '2099-01-01T00:00:00Z' }, error: null };
const previous = { data: { id: 'submission-1', file_url: 'student-1/old.pdf', submitted_at: '2026-01-01T00:00:00Z' }, error: null };
const params = { assignmentId: 'assignment-1', studentId: 'student-1', studentName: 'Student', fileUrl: 'student-1/new.pdf' };

describe('Production API regressions: submission integrity and private storage', () => {
  test('Profile password changes reject seven characters before contacting Auth', async () => {
    const {api,events}=setup([]);
    await assert.rejects(api.updateProfile('student','student@example.test',{newPassword:'1234567'},'current-password'),/8 სიმბოლოს/);
    assert.equal(events.length,0);
  });
  test('Teacher group statistics exclude other groups and count only target students', async () => {
    const assignments = [{ id:'a1', subject_id:'s', group_ids:['g1'] },{ id:'a2', subject_id:'s', group_ids:['g2'] },{ id:'a3', subject_id:'s', group_ids:['g1','g2'] }];
    const students = [{ id:'u1',group_id:'g1' },{ id:'u2',group_id:'g2' }];
    const submissions = [{assignment_id:'a1',student_id:'u1',status:'SUBMITTED'},{assignment_id:'a2',student_id:'u2',status:'APPROVED'},{assignment_id:'a3',student_id:'u2',status:'SUBMITTED'}];
    const { api } = setup([{data:[{id:'s',name:'Subject'}]},{data:assignments},{data:submissions},{data:students}]);
    const data=await api.getTeacherDashboardData('teacher','g1');
    assert.equal(data.totalStudents,1); assert.equal(data.assignments.length,2);
    assert.equal(data.assignments.find(a=>a.id==='a1').submissionsCount,1);
    assert.equal(data.assignments.find(a=>a.id==='a3').submissionsCount,0);
    assert.equal(data.assignments.find(a=>a.id==='a3').totalStudents,1);
  });
  test('Assignment saves multiple groups and normalizes Word extensions', async () => {
    const { api,events }=setup([{data:{id:'new'}}]);
    await api.createAssignment({teacherId:'t',subjectId:'s',groupIds:['g1','g2','g1'],title:'Test',dueDate:'2099-01-01',allowedFormats:['.doc,.docx']});
    assert.equal(Array.from(events[0].payload.group_ids).join(','),'g1,g2');
    assert.equal(Array.from(events[0].payload.allowed_formats).join(','),'.doc,.docx');
    assert.equal(events[0].payload.allowed_formats.length,2);
  });
  test('Assignment creation without groups makes no database write', async () => {
    const { api,events }=setup([]);
    await assert.rejects(api.createAssignment({groupIds:[]}),/ჯგუფი/); assert.equal(events.length,0);
  });
  test('Failed replacement keeps the previous file', async () => {
    const { api, events } = setup([futureAssignment, previous, { data: null, error: new Error('save failed') }]);
    await assert.rejects(api.submitHomework(params), /save failed/);
    assert.equal(events.some(event => event.operation === 'remove'), false);
  });
  test('Replacement commits before removing old storage', async () => {
    const { api, events } = setup([futureAssignment, previous, { data: { id: 'submission-1' }, error: null }]);
    await api.submitHomework(params);
    assert.equal(events[2].operation, 'update');
    assert.equal(events[3].operation, 'remove');
    assert.deepEqual(Array.from(events[3].paths), ['student-1/old.pdf']);
    assert.equal(events[2].payload.grade, null);
  });
  test('Switching to a link also cleans up old storage after saving', async () => {
    const { api, events } = setup([futureAssignment, previous, { data: { id: 'submission-1' }, error: null }]);
    await api.submitHomework({ ...params, fileUrl: undefined, submissionLink: ' https://docs.google.com/document/d/123 ' });
    assert.equal(events[2].payload.submission_link, 'https://docs.google.com/document/d/123');
    assert.equal(events[3].operation, 'remove');
  });
  test('Failed cancellation never deletes the file', async () => {
    const { api, events } = setup([{ data: null, error: new Error('deadline expired') }]);
    await assert.rejects(api.cancelSubmission('submission-1'), /deadline expired/);
    assert.equal(events.length, 1);
  });
  test('Cancellation deletes the record before storage', async () => {
    const { api, events } = setup([{ data: { id: 'submission-1', file_url: 'student-1/old.pdf' }, error: null }]);
    await api.cancelSubmission('submission-1');
    assert.deepEqual(events.map(event => event.operation), ['delete', 'remove']);
  });
  test('Concurrent replacement with no affected row keeps the previous file', async () => {
    const { api, events } = setup([futureAssignment, previous, { data: null, error: null }]);
    await assert.rejects(api.submitHomework(params), /უკვე შეიცვალა/);
    assert.equal(events.some(event => event.operation === 'remove'), false);
  });
  test('Existing-record lookup failures do not create a duplicate submission', async () => {
    const { api, events } = setup([futureAssignment, { data: null, error: new Error('lookup failed') }]);
    await assert.rejects(api.submitHomework(params), /lookup failed/);
    assert.equal(events.length, 2);
  });
  test('Deadline rejection performs no submission mutation', async () => {
    const { api, events } = setup([{ data: { due_date: '2000-01-01T00:00:00Z' }, error: null }]);
    await assert.rejects(api.submitHomework(params), /ვადა ამოიწურა/);
    assert.equal(events.length, 1);
  });
  test('Private file opens through a signed URL', async () => {
    const { api, events } = setup();
    assert.equal(await api.getFileViewUrl('https://example.supabase.co/storage/v1/object/public/homework-files/student-1/test.pdf'), 'https://private.example/signed');
    assert.equal(events[0].file, 'student-1/test.pdf');
  });
  test('Signing failure rejects rather than returning a public URL', async () => {
    const { api, client } = setup();
    client.storage.from = () => ({ async createSignedUrl() { return { data: null, error: new Error('denied') }; } });
    await assert.rejects(api.getFileViewUrl('student-1/test.pdf'), /გახსნა ვერ მოხერხდა/);
  });
  test('Teacher format restriction rejects before uploading', async () => {
    const { api, events } = setup();
    await assert.rejects(api.uploadFile({ name: 'test.docx', size: 200, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }, { allowedFormats: ['.pdf'] }), /დაუშვებელია/);
    assert.equal(events.length, 0);
  });
  test('Upload persists a relative path instead of a public URL', async () => {
    const { api, events } = setup();
    const result = await api.uploadFile({ name: 'test.pdf', size: 200, type: 'application/pdf' });
    assert.match(result.fileUrl, /^student-1\/[\da-f-]+\.pdf$/);
    assert.equal(events[0].operation, 'upload');
  });
  test('URL validation rejects misleading hosts and embedded credentials', () => {
    const { api } = setup();
    for (const url of ['https://drive.google.com.evil.test/file', 'https://user@docs.google.com/file', 'https://docs.google.com:444/file', 'https://docs.goo\ngle.com/file']) {
      assert.equal(api.isValidSubmissionUrl(url), false, url);
    }
    assert.equal(api.isValidSubmissionUrl('https://docs.google.com/document/d/123'), true);
  });
  test('Admin function failures never invoke a privileged fallback', async () => {
    const { api, client } = setup();
    client.functions.invoke = async () => ({ data: null, error: { context: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }) } });
    await assert.rejects(api.adminUpdateUser('user-1', { name: 'Name' }), /Forbidden/);
  });
});
