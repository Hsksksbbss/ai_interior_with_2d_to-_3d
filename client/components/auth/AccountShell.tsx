'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown, Home, LogOut, Settings, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase/client';

export function userDisplayName(user: User) {
  return (user.user_metadata?.full_name as string | undefined)?.trim() || user.email?.split('@')[0] || 'Designer';
}

export default function AccountShell({ title, eyebrow, children }: { title: string; eyebrow: string; children: (user: User) => ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      router.replace('/login');
      return;
    }
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) setUser(data.session.user);
      else router.replace('/login');
      setLoading(false);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session) setUser(session.user);
      else router.replace('/login');
    });
    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [router]);

  async function handleLogout() {
    await supabase?.auth.signOut();
    localStorage.removeItem('user');
    router.replace('/login');
  }

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center bg-[#f5f3ff] text-slate-500">Checking your session...</div>;

  const name = userDisplayName(user);
  const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <main className="min-h-screen bg-[#f5f3ff]">
      <header className="sticky top-0 z-30 border-b border-violet-100 bg-white/90 px-4 py-4 shadow-sm backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <button onClick={() => router.push('/dashboard')} className="flex items-center gap-3" aria-label="Go to DesignAI dashboard">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-500 text-lg text-white shadow-lg">🎨</span>
            <span className="text-xl font-bold bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">DesignAI</span>
          </button>
          <div className="relative">
            <button onClick={() => setProfileOpen((open) => !open)} className="flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 p-1.5 pr-3" aria-expanded={profileOpen}>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-blue-500 text-sm font-bold text-white">{initials}</span>
              <span className="hidden max-w-[150px] truncate text-sm font-semibold text-slate-700 sm:block">{name}</span>
              <ChevronDown className="h-4 w-4 text-violet-600" />
            </button>
            {profileOpen ? <div className="absolute right-0 top-14 w-64 rounded-2xl border border-violet-100 bg-white p-2 shadow-2xl">
              <div className="rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 p-3 text-white"><p className="font-bold">{name}</p><p className="truncate text-xs text-violet-100">{user.email}</p></div>
              <button onClick={() => router.push('/profile')} className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-violet-50"><UserRound className="h-4 w-4 text-violet-600" /> Profile</button>
              <button onClick={() => router.push('/settings')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-violet-50"><Settings className="h-4 w-4 text-violet-600" /> Settings</button>
              <button onClick={() => router.push('/dashboard?tool=saved-designs')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-violet-50"><Home className="h-4 w-4 text-violet-600" /> Saved Designs</button>
              <button onClick={handleLogout} className="flex w-full items-center gap-3 border-t border-slate-100 px-3 py-3 text-sm font-semibold text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" /> Logout</button>
            </div> : null}
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <div className="relative mb-8 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#34146e] via-[#5635bd] to-[#1676cf] p-7 text-white shadow-2xl shadow-violet-900/20 sm:p-10">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
          <p className="relative text-xs font-bold uppercase tracking-[0.2em] text-violet-200">{eyebrow}</p>
          <h1 className="relative mt-2 text-3xl font-bold sm:text-4xl">{title}</h1>
        </div>
        {children(user)}
      </section>
    </main>
  );
}
