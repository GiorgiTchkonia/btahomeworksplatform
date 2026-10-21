import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers });

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return reply(405, { error: 'Method not allowed' });
  try {
    let body;
    try { body = await request.json(); } catch { return reply(400, { error: 'არასწორი მოთხოვნა.' }); }
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return reply(400, { error: 'მიუთითეთ სწორი ელფოსტის მისამართი.' });
    }
    const url = Deno.env.get('SUPABASE_URL');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const appUrl = Deno.env.get('APP_URL');
    if (!url || !anon || !secret || !appUrl) return reply(503, { error: 'პაროლის აღდგენის სერვისი დროებით მიუწვდომელია.' });
    const app = new URL(appUrl);
    if (app.username || app.password || (app.protocol !== 'https:' && !(app.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(app.hostname)))) {
      return reply(503, { error: 'პაროლის აღდგენის სერვისი დროებით მიუწვდომელია.' });
    }
    // This public recovery endpoint returns no profile fields. Privileged lookup
    // stays on the server; anonymous users get no direct access to profiles.
    const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profile, error: lookupError } = await admin.from('profiles').select('id').eq('email', email).maybeSingle();
    if (lookupError) return reply(503, { error: 'ელფოსტის შემოწმება ვერ მოხერხდა. სცადეთ მოგვიანებით.' });
    if (!profile) return reply(404, { error: 'ამ ელფოსტით მომხმარებელი რეგისტრირებული არ არის. გადაამოწმეთ მისამართი.' });
    const { data, error: accountError } = await admin.auth.admin.getUserById(profile.id);
    if (accountError) return reply(503, { error: 'ანგარიშის შემოწმება ვერ მოხერხდა. სცადეთ მოგვიანებით.' });
    if (!data.user || data.user.email?.toLowerCase() !== email || !data.user.email_confirmed_at) {
      return reply(400, { error: 'ანგარიშის ელფოსტა ჯერ არ არის დადასტურებული. გამოიყენეთ მოწვევის ბმული ან დაუკავშირდით ადმინისტრატორს.' });
    }
    // Use the public Auth API so its email cooldown and rate limits still apply.
    const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: new URL('/reset-password', app.origin).href });
    if (error) {
      if (error.status === 429 || error.code === 'over_email_send_rate_limit') return reply(429, { error: 'მოთხოვნები ძალიან ხშირია. ცოტა ხანში სცადეთ ხელახლა.' });
      return reply(502, { error: 'წერილის გაგზავნა ვერ მოხერხდა. სცადეთ მოგვიანებით ან დაუკავშირდით ადმინისტრატორს.' });
    }
    return reply(200, { success: true });
  } catch {
    return reply(503, { error: 'პაროლის აღდგენა ვერ მოხერხდა. სცადეთ მოგვიანებით.' });
  }
});
