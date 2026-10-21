const path = require('node:path');
const assert = require('node:assert/strict');
const { describe, test } = require('../helpers/test-utils.cjs');
const load = require('../helpers/load-typescript.cjs');

function setup(options = {}) {
  let handler;
  const sent = [];
  const client = {
    from() { const q = { select() { return q; }, eq() { return q; }, async maybeSingle() { return { data: options.missing ? null : { id: 'registered-id' }, error: options.lookupError || null }; } }; return q; },
    auth: {
      admin: { async getUserById() { return { data: { user: { email: options.accountEmail || 'student@example.com', email_confirmed_at: options.unconfirmed ? null : '2026-01-01' } }, error: null }; } },
      async resetPasswordForEmail(email, params) { sent.push({ email, params }); return { error: options.sendError || null }; },
    },
  };
  load(path.join(__dirname, '../../supabase/functions/password-recovery/index.ts'), {
    'npm:@supabase/supabase-js@2.116.0': { createClient() { return client; } },
  }, { Deno: { serve(fn) { handler = fn; }, env: { get(name) { return name === 'APP_URL' ? (options.appUrl || 'https://portal.example.com') : 'test-only'; } } } });
  return { sent, call: (body) => handler(new Request('https://example.com', { method: 'POST', body: JSON.stringify(body) })) };
}

describe('Production password recovery: registered and confirmed email only', () => {
  test('Malformed email sends nothing', async () => {
    const s = setup(); assert.equal((await s.call({ email: 'fake' })).status, 400); assert.equal(s.sent.length, 0);
  });
  test('Unknown email sends nothing and returns an error', async () => {
    const s = setup({ missing: true }); assert.equal((await s.call({ email: 'fake@example.com' })).status, 404); assert.equal(s.sent.length, 0);
  });
  test('Database failure is not reported as unknown email or success', async () => {
    const s = setup({ lookupError: { message: 'offline' } }); assert.equal((await s.call({ email: 'student@example.com' })).status, 503); assert.equal(s.sent.length, 0);
  });
  test('Unconfirmed test account cannot trigger a recovery email', async () => {
    const s = setup({ unconfirmed: true }); assert.equal((await s.call({ email: 'student@example.com' })).status, 400); assert.equal(s.sent.length, 0);
  });
  test('Outdated profile email cannot recover another address', async () => {
    const s = setup({ accountEmail: 'changed@example.com' }); assert.equal((await s.call({ email: 'student@example.com' })).status, 400); assert.equal(s.sent.length, 0);
  });
  test('Verified account uses normalized email and server redirect', async () => {
    const s = setup(); const r = await s.call({ email: ' Student@Example.COM ', redirectTo: 'https://evil.example' });
    assert.equal(r.status, 200); assert.equal((await r.json()).success, true); assert.equal(s.sent[0].email, 'student@example.com'); assert.equal(s.sent[0].params.redirectTo, 'https://portal.example.com/reset-password');
  });
  test('SMTP failure never produces success', async () => {
    const s = setup({ sendError: { status: 500 } }); const r = await s.call({ email: 'student@example.com' }); assert.equal(r.status, 502); assert.equal((await r.json()).success, undefined);
  });
  test('Auth rate limit is preserved', async () => {
    const s = setup({ sendError: { status: 429 } }); assert.equal((await s.call({ email: 'student@example.com' })).status, 429);
  });
  test('Unsafe configured redirect prevents sending', async () => {
    const s = setup({ appUrl: 'http://evil.example.com' }); assert.equal((await s.call({ email: 'student@example.com' })).status, 503); assert.equal(s.sent.length, 0);
  });
});
