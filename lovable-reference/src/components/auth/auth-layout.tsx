import type { ReactNode } from "react";

import authVisual from "@/assets/auth-visual.jpg";
import { Logo } from "@/components/site/logo";

export function AuthLayout({ children, caption }: { children: ReactNode; caption: string }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <img
          src={authVisual}
          alt="Modern interior with staircase and plants"
          width={912}
          height={1200}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 gradient-brand opacity-35" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Logo className="[&_span:last-child]:text-primary-foreground" />
          <div className="max-w-sm rounded-3xl glass-panel p-6">
            <p className="font-display text-xl font-semibold leading-snug">{caption}</p>
          </div>
        </div>
      </div>

      <div className="relative flex items-center justify-center gradient-soft px-4 py-14 sm:px-8">
        {children}
      </div>
    </main>
  );
}
