'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AuthLayout from '../../components/auth/AuthLayout';
import { supabase, supabaseConfigured } from '../../lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!supabaseConfigured || !supabase) {
      setError('Supabase authentication is not configured.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Password and confirm password must match.');
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setMessage('Your password has been updated. Redirecting to login...');
    window.setTimeout(() => router.replace('/login'), 1500);
  }

  return (
    <AuthLayout caption="Keep your creative workspace secure while you design your dream home.">
      <div className="w-full max-w-md">
        <Link href="/login" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" /> Back to Login</Link>
        <div className="rounded-3xl border border-white/60 bg-white/80 p-7 shadow-2xl shadow-indigo-900/10 backdrop-blur-xl sm:p-9">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 via-blue-500 to-pink-500 text-white shadow-lg"><KeyRound className="h-5 w-5" /></span>
          <h1 className="mt-5 text-3xl font-bold text-slate-950">Choose a New Password</h1>
          <p className="mt-2 text-sm text-slate-500">Create a new password for your DesignAI account.</p>
          {error ? <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          {message ? <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
          <form className="mt-7 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
            <PasswordField id="reset-password" label="New password" value={password} visible={showPassword} onChange={setPassword} onToggle={() => setShowPassword((value) => !value)} />
            <PasswordField id="reset-confirm-password" label="Confirm password" value={confirmPassword} visible={showConfirmPassword} onChange={setConfirmPassword} onToggle={() => setShowConfirmPassword((value) => !value)} />
            <button type="submit" disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-blue-600 to-pink-500 font-semibold text-white shadow-lg shadow-violet-500/20 disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Update Password</button>
          </form>
        </div>
      </div>
    </AuthLayout>
  );
}

function PasswordField({ id, label, value, visible, onChange, onToggle }: { id: string; label: string; value: string; visible: boolean; onChange: (value: string) => void; onToggle: () => void }) {
  return (
    <label className="relative block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input id={id} type={visible ? 'text' : 'password'} autoComplete="new-password" value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-11 text-slate-900 outline-none ring-violet-500 focus:ring-2" required />
      <button type="button" onClick={onToggle} className="absolute right-3 top-8 p-1 text-slate-400 hover:text-slate-700" aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}>{visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
    </label>
  );
}
