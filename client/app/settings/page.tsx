'use client';

import { useEffect, useState } from 'react';
import { Bookmark, Check, Globe2, KeyRound, LogOut, Moon, Palette, Sun } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AccountShell from '../../components/auth/AccountShell';
import { supabase } from '../../lib/supabase/client';

type Language = 'english' | 'bengali';

export default function SettingsPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('english');

  useEffect(() => {
    const storedLanguage = localStorage.getItem('preferredLanguage');
    if (storedLanguage === 'english' || storedLanguage === 'bengali') setLanguage(storedLanguage);
    localStorage.setItem('designai-theme', 'light');
  }, []);

  function updateLanguage(value: Language) {
    setLanguage(value);
    localStorage.setItem('preferredLanguage', value);
  }

  function updateTheme(value: 'light') {
    localStorage.setItem('designai-theme', value);
    document.documentElement.dataset.theme = value;
  }

  async function signOut() {
    if (!window.confirm('Sign out of DesignAI?')) return;
    await supabase?.auth.signOut();
    localStorage.removeItem('user');
    router.replace('/login');
  }

  return <AccountShell title="Settings" eyebrow="Workspace preferences">
    {() => <div className="grid gap-6 md:grid-cols-2">
      <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-xl shadow-violet-900/5 md:col-span-2"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-100 text-violet-700"><Palette className="h-5 w-5" /></span><div><h2 className="font-bold text-slate-900">Appearance</h2><p className="text-sm text-slate-500">Choose the workspace theme.</p></div></div><div className="mt-5 flex flex-wrap gap-3"><button onClick={() => updateTheme('light')} className="flex items-center gap-2 rounded-xl border border-violet-500 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-700"><Sun className="h-4 w-4" /> Light <Check className="h-4 w-4" /></button><button disabled title="Dark theme is not yet supported consistently across the existing workspace" className="flex cursor-not-allowed items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-400"><Moon className="h-4 w-4" /> Dark (Unavailable)</button></div><p className="mt-3 text-xs text-slate-500">Light theme is the currently supported workspace style. Dark mode is unavailable until all existing tool views support it consistently.</p></section>
      <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-xl shadow-violet-900/5"><div className="flex items-center gap-3"><Globe2 className="h-5 w-5 text-violet-600" /><div><h2 className="font-bold text-slate-900">Language</h2><p className="text-sm text-slate-500">Only currently supported languages are listed.</p></div></div><select value={language} onChange={(event) => updateLanguage(event.target.value as Language)} className="mt-5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-violet-500"><option value="english">English</option><option value="bengali">বাংলা</option></select></section>
      <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-xl shadow-violet-900/5"><div className="flex items-center gap-3"><KeyRound className="h-5 w-5 text-violet-600" /><div><h2 className="font-bold text-slate-900">Account security</h2><p className="text-sm text-slate-500">Manage your password securely.</p></div></div><button onClick={() => router.push('/reset-password')} className="mt-5 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 px-4 py-3 text-sm font-bold text-white">Reset Password</button></section>
      <section className="rounded-3xl border border-violet-100 bg-white p-6 shadow-xl shadow-violet-900/5"><div className="flex items-center gap-3"><Bookmark className="h-5 w-5 text-violet-600" /><div><h2 className="font-bold text-slate-900">Saved designs and data</h2><p className="text-sm text-slate-500">Open your existing local design gallery.</p></div></div><button onClick={() => router.push('/dashboard?tool=saved-designs')} className="mt-5 rounded-xl border border-violet-200 px-4 py-3 text-sm font-bold text-violet-700 hover:bg-violet-50">View Saved Designs</button></section>
      <section className="rounded-3xl border border-amber-100 bg-amber-50/70 p-6 shadow-xl shadow-amber-900/5"><h2 className="font-bold text-slate-900">Notifications</h2><p className="mt-2 text-sm text-slate-600">DesignAI does not currently have a notification delivery mechanism, so notification toggles are unavailable.</p></section>
      <section className="rounded-3xl border border-red-100 bg-white p-6 shadow-xl shadow-red-900/5"><div className="flex items-center gap-3"><LogOut className="h-5 w-5 text-red-600" /><div><h2 className="font-bold text-slate-900">Sign out</h2><p className="text-sm text-slate-500">End this authenticated session on this device.</p></div></div><button onClick={() => void signOut()} className="mt-5 rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50">Log out</button></section>
    </div>}
  </AccountShell>;
}
