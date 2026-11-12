'use client';

import { FormEvent, useState } from 'react';
import { CalendarDays, Camera, CheckCircle, KeyRound, Loader2, Mail, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AccountShell, { userDisplayName } from '../../components/auth/AccountShell';
import { supabase } from '../../lib/supabase/client';

export default function ProfilePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function saveChanges(event: FormEvent<HTMLFormElement>, user: Parameters<typeof userDisplayName>[0]) {
    event.preventDefault();
    setError('');
    setMessage('');
    const trimmedName = name.trim() || userDisplayName(user);
    if (!trimmedName) {
      setError('Enter your full name.');
      return;
    }
    if (!supabase) {
      setError('Supabase authentication is not configured.');
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ data: { ...user.user_metadata, full_name: trimmedName } });
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setMessage('Profile changes saved successfully.');
  }

  return <AccountShell title="Your Profile" eyebrow="Account identity">
    {(user) => {
      const displayName = userDisplayName(user);
      const initials = displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
      return <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="rounded-3xl border border-violet-100 bg-white p-7 text-center shadow-xl shadow-violet-900/5">
          <div className="mx-auto grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-violet-600 via-blue-500 to-pink-500 text-3xl font-bold text-white shadow-xl">{initials}</div>
          <h2 className="mt-5 text-xl font-bold text-slate-900">{displayName}</h2>
          <p className="mt-1 text-sm text-slate-500">{user.email}</p>
          <div className="mt-6 rounded-2xl bg-violet-50 p-4 text-left text-sm text-slate-600"><div className="flex items-center gap-2 font-semibold text-violet-700"><CalendarDays className="h-4 w-4" /> Member since</div><p className="mt-2">{user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unavailable'}</p></div>
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-4 text-left text-xs text-slate-500"><Camera className="mb-2 h-5 w-5 text-violet-500" /><p>Profile photo uploads are unavailable because no Supabase Storage profile bucket is configured. Your secure initials avatar is used instead.</p></div>
        </div>
        <form onSubmit={(event) => void saveChanges(event, user)} className="rounded-3xl border border-violet-100 bg-white p-7 shadow-xl shadow-violet-900/5">
          <h2 className="text-xl font-bold text-slate-900">Personal information</h2><p className="mt-1 text-sm text-slate-500">Update the name shown across your DesignAI workspace.</p>
          {error ? <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          {message ? <p className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"><CheckCircle className="h-4 w-4" />{message}</p> : null}
          <label className="mt-7 block text-sm font-semibold text-slate-700">Full name<div className="relative mt-2"><UserRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={name || displayName} onChange={(event) => setName(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 pl-10 text-slate-900 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10" /></div></label>
          <label className="mt-5 block text-sm font-semibold text-slate-700">Email address<div className="relative mt-2"><Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={user.email ?? ''} readOnly className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 text-slate-500" /></div></label>
          <div className="mt-7 flex flex-wrap gap-3"><button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save Changes</button><button type="button" onClick={() => router.push('/reset-password')} className="inline-flex items-center gap-2 rounded-xl border border-violet-200 px-5 py-3 text-sm font-bold text-violet-700 hover:bg-violet-50"><KeyRound className="h-4 w-4" /> Reset Password</button></div>
        </form>
      </div>;
    }}
  </AccountShell>;
}
