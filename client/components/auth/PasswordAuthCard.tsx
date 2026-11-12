'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, Mail, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase, supabaseConfigError, supabaseConfigured } from '../../lib/supabase/client';

type Props = {
  mode: 'login' | 'signup';
};

export default function PasswordAuthCard({ mode }: Props) {
  const router = useRouter();
  const [forgotPassword, setForgotPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function clearStatus() {
    setError('');
    setMessage('');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearStatus();
    if (!supabaseConfigured || !supabase) {
      setError(supabaseConfigError ?? 'Supabase authentication is not configured.');
      return;
    }

    const trimmedEmail = email.trim();
    if (forgotPassword) {
      setBusy(true);
      try {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetError) {
          setError(formatAuthError(resetError));
          return;
        }
        setMessage('If an account exists for this email, a password reset link has been sent.');
      } catch (error) {
        setError(formatAuthError(error));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Password and confirm password must match.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error: signupError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (signupError) {
          setError(formatAuthError(signupError));
          return;
        }
        if (data.session) {
          router.replace('/dashboard');
        } else {
          setMessage('Account created. Check your email to confirm your account before signing in.');
        }
        return;
      }

      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (loginError || !data.session) {
        setError(formatAuthError(loginError ?? new Error('Unable to sign in. Please try again.')));
        return;
      }
      router.replace('/dashboard');
    } catch (error) {
      setError(formatAuthError(error));
    } finally {
      setBusy(false);
    }
  }

  const title = forgotPassword ? 'Reset Your Password' : mode === 'login' ? 'Welcome Back' : 'Create Your DesignAI Account';
  const description = forgotPassword
    ? 'Enter your email and we will send you a secure password reset link.'
    : mode === 'login'
      ? 'Sign in to continue designing your dream home.'
      : 'Start creating intelligent interior designs in 2D and 3D.';

  return (
    <div className="w-full max-w-md">
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back to Home
      </Link>
      <div className="rounded-3xl border border-white/60 bg-white/80 p-7 shadow-2xl shadow-indigo-900/10 backdrop-blur-xl sm:p-9">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 via-blue-500 to-pink-500 text-white shadow-lg">
          {forgotPassword ? <KeyRound className="h-5 w-5" /> : mode === 'signup' ? <UserRound className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
        </span>
        <h1 className="mt-5 text-3xl font-bold text-slate-950">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
        {error ? <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        {message ? <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}

        <form className="mt-7 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          {mode === 'signup' && !forgotPassword ? (
            <label className="relative block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Full name</span>
              <UserRound className="absolute left-3 top-9 h-4 w-4 text-slate-400" />
              <input type="text" autoComplete="name" placeholder="Your full name" value={fullName} onChange={(event) => setFullName(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-slate-900 outline-none ring-violet-500 focus:ring-2" required />
            </label>
          ) : null}
          <label className="relative block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Email address</span>
            <Mail className="absolute left-3 top-9 h-4 w-4 text-slate-400" />
            <input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-slate-900 outline-none ring-violet-500 focus:ring-2" required />
          </label>
          {!forgotPassword ? (
            <>
              <PasswordInput id="auth-password" label="Password" value={password} visible={showPassword} onChange={setPassword} onToggle={() => setShowPassword((value) => !value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
              {mode === 'signup' ? <PasswordInput id="auth-confirm-password" label="Confirm password" value={confirmPassword} visible={showConfirmPassword} onChange={setConfirmPassword} onToggle={() => setShowConfirmPassword((value) => !value)} autoComplete="new-password" /> : null}
            </>
          ) : null}
          <button type="submit" disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-blue-600 to-pink-500 font-semibold text-white shadow-lg shadow-violet-500/20 disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {forgotPassword ? 'Send Reset Link' : mode === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>

        {!forgotPassword && mode === 'login' ? <button type="button" onClick={() => { clearStatus(); setForgotPassword(true); }} className="mt-4 block w-full text-center text-sm font-semibold text-violet-700 hover:underline">Forgot password?</button> : null}
        <p className="mt-7 text-center text-sm text-slate-500">
          {forgotPassword ? <>Remember your password? <button type="button" onClick={() => { clearStatus(); setForgotPassword(false); }} className="font-semibold text-violet-700 hover:underline">Back to Login</button></> : mode === 'login' ? <>Don't have an account? <Link href="/signup" className="font-semibold text-violet-700">Sign Up</Link></> : <>Already have an account? <Link href="/login" className="font-semibold text-violet-700">Login</Link></>}
        </p>
      </div>
    </div>
  );
}

function formatAuthError(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  const normalized = message.toLowerCase();

  if (normalized.includes('failed to fetch') || normalized.includes('network')) {
    return 'Unable to reach Supabase. Check the project URL, publishable key, and your network connection.';
  }
  if (normalized.includes('email not confirmed')) {
    return 'Please confirm your email address before signing in.';
  }
  if (normalized.includes('invalid login credentials')) {
    return 'Incorrect email or password.';
  }
  return message || 'Supabase authentication failed. Please try again.';
}

function PasswordInput({ id, label, value, visible, onChange, onToggle, autoComplete }: { id: string; label: string; value: string; visible: boolean; onChange: (value: string) => void; onToggle: () => void; autoComplete: string }) {
  return (
    <label className="relative block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input id={id} type={visible ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-11 text-slate-900 outline-none ring-violet-500 focus:ring-2" required />
      <button type="button" onClick={onToggle} className="absolute right-3 top-8 p-1 text-slate-400 hover:text-slate-700" aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}>
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </label>
  );
}
