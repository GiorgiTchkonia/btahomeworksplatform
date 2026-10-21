import { localizeError } from '@/lib/messages';
import React, { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { LockKeyhole, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage({ invitation = false }: { invitation?: boolean }) {
  const invalidLink = invitation ? 'მოწვევის ბმული არასწორია ან ვადა ამოიწურა. დაუკავშირდით ადმინისტრატორს.' : 'აღდგენის ბმული არასწორია ან ვადა ამოიწურა. მოითხოვეთ ახალი ბმული.';
  const [ready, setReady] = useState(false);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    if (params.has('error') || query.has('error')) {
      setReady(true);
      setError(invalidLink);
      return;
    }
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && (event === 'PASSWORD_RECOVERY' || event === 'INITIAL_SESSION' || event === 'SIGNED_OUT')) {
        setValid(Boolean(session));
        setReady(true);
      }
    });
    // Auth initialization consumes recovery tokens before returning the session.
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return;
      setValid(!sessionError && Boolean(data.session));
      setReady(true);
    }).catch(() => {
      if (active) { setReady(true); setValid(false); }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [invalidLink]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 8) { setError('პაროლი უნდა შეიცავდეს მინიმუმ 8 სიმბოლოს.'); return; }
    if (password !== confirmation) { setError('პაროლები არ ემთხვევა ერთმანეთს.'); return; }
    setSaving(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setPassword('');
      setConfirmation('');
      setSuccess(true);
      // Remove credentials from the address bar; the session is already persisted.
      window.history.replaceState(null, '', invitation ? '/accept-invite' : '/reset-password');
    } catch (failure) {
      setError(localizeError(failure, 'პაროლის შენახვა ვერ მოხერხდა.'));
    } finally {
      setSaving(false);
    }
  };

  return <div className="flex-1 flex items-center justify-center px-4 py-12">
    <section className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 sm:p-8 shadow-sm">
      <LockKeyhole className="w-8 h-8 text-[#2B4EFF] mb-4" aria-hidden="true" />
      <h1 className="text-2xl font-bold mb-2">{invitation ? 'ანგარიშის გააქტიურება' : 'პაროლის აღდგენა'}</h1>
      {invitation && valid && <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">ელფოსტა დადასტურებულია. ანგარიშისთვის დააყენეთ პაროლი.</p>}
      {!ready ? <p role="status">ბმული მოწმდება…</p> : success ? <div role="status" className="space-y-4">
        <p className="flex items-start gap-2 rounded-xl p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />დადასტურებულია — ახალი პაროლი წარმატებით შეინახა.</p>
        <Link href="/" className="text-[#2B4EFF] underline">სამუშაო დაფაზე გადასვლა</Link>
      </div> : !valid ? <div className="space-y-4">
        <p role="alert" className="flex items-start gap-2 rounded-xl p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400"><AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />{error || invalidLink}</p>
        <Link href="/login" className="text-[#2B4EFF] underline">შესვლის გვერდზე დაბრუნება</Link>
      </div> : <form onSubmit={save} className="space-y-4 mt-6">
        <div><label htmlFor="recovery-password" className="block text-sm font-semibold mb-2">ახალი პაროლი</label>
          <input id="recovery-password" type="password" autoComplete="new-password" required minLength={8} value={password}
            onChange={event => setPassword(event.target.value)} disabled={saving} aria-describedby="password-help"
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent px-4 py-3 focus:ring-2 focus:ring-[#2B4EFF]" />
          <p id="password-help" className="mt-2 text-sm text-slate-600 dark:text-slate-300">მინიმუმ 8 სიმბოლო.</p></div>
        <div><label htmlFor="recovery-confirmation" className="block text-sm font-semibold mb-2">გაიმეორეთ პაროლი</label>
          <input id="recovery-confirmation" type="password" autoComplete="new-password" required value={confirmation}
            onChange={event => setConfirmation(event.target.value)} disabled={saving}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent px-4 py-3 focus:ring-2 focus:ring-[#2B4EFF]" /></div>
        {error && <p role="alert" className="flex items-start gap-2 rounded-xl p-3 bg-red-50 dark:bg-red-950/40 text-sm text-red-700 dark:text-red-400"><AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />{error}</p>}
        <button type="submit" disabled={saving} className="w-full rounded-xl px-4 py-3 bg-[#2B4EFF] text-white font-semibold disabled:opacity-50">
          {saving ? 'ინახება…' : 'პაროლის შენახვა'}</button>
      </form>}
    </section>
  </div>;
}
