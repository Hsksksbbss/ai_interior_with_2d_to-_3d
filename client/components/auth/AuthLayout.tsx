import type { ReactNode } from 'react';

export default function AuthLayout({ children, caption }: { children: ReactNode; caption: string }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-violet-950 via-blue-900 to-pink-900 lg:block">
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-fuchsia-400/30 blur-3xl" />
        <div className="absolute bottom-12 right-10 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <a href="/" className="text-2xl font-bold tracking-tight">DesignAI</a>
          <div className="max-w-sm rounded-3xl border border-white/20 bg-white/10 p-7 backdrop-blur-xl">
            <p className="text-xl font-semibold leading-snug">{caption}</p>
          </div>
        </div>
      </section>
      <section className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-violet-50 via-white to-pink-50 px-4 py-14 sm:px-8">
        {children}
      </section>
    </main>
  );
}
