'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase, supabaseConfigured } from '../../lib/supabase/client';

const RESEND_SECONDS = 45;

type Props = {
  mode: 'login' | 'signup';
};

export default function OtpAuthCard({ mode }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function sendCode(resend = false) {
    const trimmed = email.trim();
    setError('');
    setMessage('');
    if (!supabaseConfigured || !supabase) {
      setError('Supabase authentication is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
      return;
    }
    if (!trimmed) {
      setError('Enter your email address first.');
      return;
    }
    setBusy(true);
    const { error: requestError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: mode === 'signup' },
    });
    setBusy(false);
    if (requestError) {
      setError(requestError.message);
      return;
    }
    setStep('code');
    setCooldown(RESEND_SECONDS);
    setMessage(resend ? 'A new code was sent.' : `Code sent to ${trimmed}.`);
  }

  async function verifyCode() {
    setError('');
    setMessage('');
    if (!supabase) {
      setError('Supabase authentication is not configured.');
      return;
    }
    if (code.length !== 6) {
      setError('Enter the 6-digit code.');
      return;
    }
    setBusy(true);
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code,
      type: 'email',
    });
    setBusy(false);
    if (verifyError || !data.session) {
      setError(verifyError?.message ?? "That code didn't work. Try again.");
      return;
    }
    router.replace('/dashboard');
  }

  return (
    <div className="w-full max-w-md">
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Back to Home
      </Link>
      <div className="rounded-3xl border border-white/60 bg-white/80 p-7 shadow-2xl shadow-indigo-900/10 backdrop-blur-xl sm:p-9">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 via-blue-500 to-pink-500 text-white shadow-lg">
          {step === 'email' ? <Mail className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
        </span>
        <h1 className="mt-5 text-3xl font-bold text-slate-950">{mode === 'login' ? 'Welcome Back' : 'Create Your DesignAI Account'}</h1>
        <p className="mt-2 text-sm text-slate-500">{mode === 'login' ? 'Sign in to continue designing your dream home.' : 'Start creating intelligent interior designs in 2D and 3D.'}</p>
        {error ? <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        {message ? <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
        {step === 'email' ? (
          <form className="mt-7 space-y-4" onSubmit={(event) => { event.preventDefault(); void sendCode(); }}>
            <label className="block text-sm font-medium text-slate-700" htmlFor="auth-email">Email address</label>
            <input id="auth-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none ring-violet-500 focus:ring-2" required />
            <button type="submit" disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-blue-600 to-pink-500 font-semibold text-white shadow-lg shadow-violet-500/20 disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send OTP
            </button>
          </form>
        ) : (
          <div className="mt-7 space-y-5">
            <p className="text-sm text-slate-600">Enter the 6-digit code sent to <span className="font-semibold text-violet-700">{email}</span>.</p>
            <input inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} className="h-14 w-full rounded-xl border border-slate-200 text-center text-2xl tracking-[0.6em] text-slate-900 outline-none focus:ring-2 focus:ring-violet-500" aria-label="6-digit OTP" />
            <button type="button" onClick={() => void verifyCode()} disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-blue-600 to-pink-500 font-semibold text-white shadow-lg shadow-violet-500/20 disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {mode === 'login' ? 'Verify & Continue' : 'Create Account'}
            </button>
            <div className="text-center text-sm text-slate-500">
              {cooldown > 0 ? `Resend in ${cooldown}s` : <button type="button" onClick={() => void sendCode(true)} className="font-semibold text-violet-700 hover:underline">Resend OTP</button>}
            </div>
            <button type="button" onClick={() => { setStep('email'); setCode(''); setError(''); }} className="w-full text-center text-sm text-slate-500 hover:text-slate-900">Change Email</button>
          </div>
        )}
        <p className="mt-7 text-center text-sm text-slate-500">
          {mode === 'login' ? <>Don't have an account? <Link href="/signup" className="font-semibold text-violet-700">Sign Up</Link></> : <>Already have an account? <Link href="/login" className="font-semibold text-violet-700">Login</Link></>}
        </p>
      </div>
    </div>
  );
}
