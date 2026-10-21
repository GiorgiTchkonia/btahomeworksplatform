const path = require('node:path');
const assert = require('node:assert/strict');
const { describe, test } = require('../helpers/test-utils.cjs');
const load = require('../helpers/load-typescript.cjs');

const existing = { id: 'teacher-1', name: 'Teacher', role: 'TEACHER', email: 'teacher@example.test', subject: 'Math', phone: '123', grade: null };
const response = data => ({ data, error: null });

function setup(results, options = {}) {
  const events = [];
  const filters = [];
  let handler;
  const admin = {
    from(table) {
      let payload;
      let operation = 'query';
      const execute = () => {
        if (table === 'college_groups') return { data: { id: '00000000-0000-0000-0000-000000000010', active: !options.archivedGroup }, error: null };
        events.push({ operation, table, payload });
        if (!results.length) throw new Error('Unexpected database call');
        return results.shift();
      };
      const query = {
        select() { return query; }, eq(key,value) { filters.push([key,value]); return query; }, is() { return query; }, update(value) { operation = 'profile-update'; payload = value; return query; },
        insert(value) { operation = 'profile-insert'; payload = value; return query; },
        async maybeSingle() { return execute(); },
        async single() { return execute(); }, then(resolve, reject) { return Promise.resolve().then(execute).then(resolve, reject); },
      };
      return query;
    },
    auth: { admin: {
      async inviteUserByEmail(email, payload) { events.push({ operation: 'invite', email, payload }); return options.inviteError ? { data: {}, error: options.inviteError } : response({ user: { id: 'new-user', email, email_confirmed_at: null } }); },
      async updateUserById(id, payload) { events.push({ operation: 'auth-update', id, payload }); return { error: options.authError || null }; },
      async deleteUser(id) { events.push({ operation: 'auth-delete', id }); return { error: null }; },
    } },
  };
  let clientIndex = 0;
  load(path.join(__dirname, '../../supabase/functions/admin-users/index.ts'), {
    'npm:@supabase/supabase-js@2.116.0': { createClient() {
      if (clientIndex++ === 0) return { async rpc() { return { data: options.passwordMissing ? 'PASSWORD_REQUIRED' : 'ACTIVE', error: null }; }, auth: { async getUser() { return { data: { user: { id: 'caller', email_confirmed_at: options.unconfirmedCaller ? null : '2026-01-01T00:00:00Z' } }, error: null }; } } };
      return admin;
    } },
  }, { Deno: { serve(fn) { handler = fn; }, env: { get(name) { return name === 'APP_URL' ? (options.appUrl ?? 'https://portal.example.test') : 'test-only'; } } } });
  return {
    filters,
    events,
    async call(body) {
      return handler(new Request('https://example.test/admin-users', {
        method: 'POST', headers: { Authorization: 'Bearer test-only', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }));
    },
  };
}

describe('Production Edge Function: partial updates and Auth rollback', () => {
  test('Multiple teacher subjects use valid array comparisons without overwriting legacy subject', async () => {
    const record={...existing,teaching_subjects:['Math']};
    const {call,events,filters}=setup([response({role:'ADMIN'}),response(record),response(record)]);
    assert.equal((await call({action:'update',userId:'teacher-1',updates:{subject:'Old legacy value',teaching_subjects:['Math',' Physics ']}})).status,200);
    const update=events.find(e=>e.operation==='profile-update').payload;
    assert.equal(Array.from(update.teaching_subjects).join(','),'Math,Physics');
    assert.equal('subject' in update,false);
    assert.equal(filters.find(([key])=>key==='teaching_subjects')[1],'{"Math"}');
  });
  test('Empty teacher subjects are rejected before any profile update', async () => {
    const {call,events}=setup([response({role:'ADMIN'}),response(existing)]);
    assert.equal((await call({action:'update',userId:'teacher-1',updates:{teaching_subjects:[]}})).status,400);
    assert.equal(events.some(e=>e.operation==='profile-update'),false);
  });
  test('Student invitation without a group sends no email', async () => {
    const { call, events }=setup([response({role:'ADMIN'})]);
    assert.equal((await call({action:'create',user:{name:'Student',email:'student@example.test',role:'STUDENT',group_id:null}})).status,400);
    assert.equal(events.some(e=>e.operation==='invite'),false);
  });
  test('Archived group cannot receive a new student invitation', async () => {
    const { call,events }=setup([response({role:'ADMIN'})],{archivedGroup:true});
    assert.equal((await call({action:'create',user:{name:'Student',email:'student@example.test',role:'STUDENT',group_id:'00000000-0000-0000-0000-000000000010'}})).status,400);
    assert.equal(events.some(e=>e.operation==='invite'),false);
  });
  test('Name-only update preserves omitted teacher subject and phone', async () => {
    const { call, events } = setup([response({ role: 'ADMIN' }), response(existing), response(existing)]);
    assert.equal((await call({ action: 'update', userId: 'teacher-1', updates: { name: ' Updated ' } })).status, 200);
    const payload = events.find(event => event.operation === 'profile-update').payload;
    assert.equal(payload.name, 'Updated');
    assert.equal('phone' in payload, false);
    assert.equal('subject' in payload, false);
  });
  test('Explicit null clears the optional field', async () => {
    const { call, events } = setup([response({ role: 'ADMIN' }), response(existing), response(existing)]);
    assert.equal((await call({ action: 'update', userId: 'teacher-1', updates: { subject: null, phone: '' } })).status, 200);
    const payload = events.find(event => event.operation === 'profile-update').payload;
    assert.equal(payload.subject, null);
    assert.equal(payload.phone, null);
  });
  test('Profile validation failure leaves Auth untouched', async () => {
    const { call, events } = setup([response({ role: 'ADMIN' }), response(existing), { data: null, error: { message: 'duplicate email' } }]);
    assert.equal((await call({ action: 'update', userId: 'teacher-1', updates: { name: 'New', password: 'new-password' } })).status, 400);
    assert.equal(events.some(event => event.operation === 'auth-update'), false);
  });
  test('Auth failure restores profile snapshot', async () => {
    const { call, events } = setup([response({ role: 'ADMIN' }), response(existing), response(existing), response({ id: existing.id })], { authError: { message: 'Auth unavailable' } });
    const result = await call({ action: 'update', userId: 'teacher-1', updates: { name: 'New', password: 'new-password' } });
    assert.equal(result.status, 400);
    const updates = events.filter(event => event.operation === 'profile-update');
    assert.equal(updates.length, 2);
    assert.equal(updates[1].payload.name, existing.name);
  });
  test('Unchanged normalized email does not change Auth', async () => {
    const { call, events } = setup([response({ role: 'ADMIN' }), response(existing), response(existing)]);
    assert.equal((await call({ action: 'update', userId: 'teacher-1', updates: { email: ' TEACHER@Example.Test ' } })).status, 200);
    assert.equal(events.some(event => event.operation === 'auth-update'), false);
    assert.equal('email' in events.find(event => event.operation === 'profile-update').payload, false);
  });
  test('Concurrent edit during rollback is reported for reconciliation', async () => {
    const { call } = setup([response({ role: 'ADMIN' }), response(existing), response(existing), response(null)], { authError: { message: 'Auth unavailable' } });
    const result = await call({ action: 'update', userId: 'teacher-1', updates: { name: 'New', password: 'new-password' } });
    assert.equal(result.status, 500);
    assert.match((await result.json()).error, /სინქრონიზაცია/);
  });
  test('Admin cannot silently confirm a different email', async () => {
    const { call, events } = setup([response({ role: 'ADMIN' }), response(existing)]);
    assert.equal((await call({ action: 'update', userId: 'teacher-1', updates: { email: 'new@example.test' } })).status, 400);
    assert.equal(events.some(event => event.operation === 'profile-update' || event.operation === 'auth-update'), false);
  });
  test('New user is invited without an admin-created password or auto-confirmation', async () => {
    const { call, events } = setup([response({ role: 'ADMIN' }), response(null), response({ id: 'new-user' })]);
    const result = await call({ action: 'create', user: { name: 'Student', email: ' STUDENT@Example.Test ', role: 'STUDENT', group_id: '00000000-0000-0000-0000-000000000010' } });
    assert.equal(result.status, 200);
    assert.equal((await result.json()).invitationSent, true);
    const invitation = events.find(event => event.operation === 'invite');
    assert.equal(invitation.email, 'student@example.test');
    assert.equal(invitation.payload.redirectTo, 'https://portal.example.test/accept-invite');
    assert.equal('password' in invitation.payload, false);
    assert.equal('email_confirm' in invitation.payload, false);
  });
  test('Invitation failure does not create a profile', async () => {
    const { call, events } = setup([response({ role: 'ADMIN' }), response(null)], { inviteError: { message: 'SMTP unavailable' } });
    assert.equal((await call({ action: 'create', user: { name: 'Student', email: 'student@example.test', role: 'STUDENT', group_id: '00000000-0000-0000-0000-000000000010' } })).status, 400);
    assert.equal(events.some(event => event.operation === 'profile-insert'), false);
  });
  test('Profile failure after invitation never deletes an existing Auth account', async () => {
    const { call, events } = setup([response({ role: 'ADMIN' }), response(null), { error: { message: 'profile failed' } }]);
    assert.equal((await call({ action: 'create', user: { name: 'Student', email: 'student@example.test', role: 'STUDENT', group_id: '00000000-0000-0000-0000-000000000010' } })).status, 500);
    assert.equal(events.some(event => event.operation === 'auth-delete'), false);
  });
  test('Existing test account is preserved and not invited again by create', async () => {
    const { call, events } = setup([response({ role: 'ADMIN' }), response({ id: 'existing-test-student' })]);
    assert.equal((await call({ action: 'create', user: { name: 'Student', email: 'student@example.test', role: 'STUDENT', group_id: '00000000-0000-0000-0000-000000000010' } })).status, 409);
    assert.equal(events.some(event => event.operation === 'invite' || event.operation === 'auth-delete'), false);
  });
  test('Missing trusted APP_URL prevents invitation', async () => {
    const { call, events } = setup([response({ role: 'ADMIN' })], { appUrl: '' });
    assert.equal((await call({ action: 'create', user: { name: 'Student', email: 'student@example.test', role: 'STUDENT', group_id: '00000000-0000-0000-0000-000000000010' } })).status, 500);
    assert.equal(events.some(event => event.operation === 'invite'), false);
  });
  test('Unconfirmed caller cannot use the admin service even with a valid session', async () => {
    const { call, events } = setup([], { unconfirmedCaller: true });
    assert.equal((await call({ action: 'update', userId: 'teacher-1', updates: { name: 'Name' } })).status, 403);
    assert.equal(events.length, 0);
  });
  test('Non-admin caller cannot update a user', async () => {
    const { call, events } = setup([response({ role: 'STUDENT', group_id: '00000000-0000-0000-0000-000000000010' })]);
    assert.equal((await call({ action: 'update', userId: 'teacher-1', updates: { name: 'New' } })).status, 403);
    assert.equal(events.length, 1);
  });
  test('Invitation session without a password cannot perform privileged actions', async () => {
    const { call, events } = setup([], { passwordMissing: true });
    assert.equal((await call({ action: 'create', user: { name: 'Test', email: 'test@example.com', role: 'STUDENT', group_id: '00000000-0000-0000-0000-000000000010' } })).status, 403);
    assert.equal(events.length, 0);
  });
  test('Caller cannot demote their own administrator account', async () => {
    const { call, events } = setup([response({ role: 'ADMIN' }), response({ ...existing, id: 'caller', role: 'ADMIN' })]);
    assert.equal((await call({ action: 'update', userId: 'caller', updates: { role: 'STUDENT', group_id: '00000000-0000-0000-0000-000000000010' } })).status, 400);
    assert.equal(events.some(event => event.operation === 'profile-update'), false);
  });
  test('Caller cannot delete their own account', async () => {
    const { call, events } = setup([response({ role: 'ADMIN' })]);
    assert.equal((await call({ action: 'delete', userId: 'caller' })).status, 400);
    assert.equal(events.some(event => event.operation === 'auth-delete'), false);
  });
  test('Deleting a teacher with linked homework is blocked', async () => {
    const { call, events } = setup([response({ role: 'ADMIN' }), { count: 1, error: null }, { count: 2, error: null }]);
    assert.equal((await call({ action: 'delete', userId: 'teacher-1' })).status, 409);
    assert.equal(events.some(event => event.operation === 'auth-delete'), false);
  });
});
