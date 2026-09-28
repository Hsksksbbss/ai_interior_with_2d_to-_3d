import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Box,
  Brush,
  CheckCircle2,
  FolderHeart,
  Layers,
  PencilRuler,
  Rotate3d,
  ShieldCheck,
  Sparkles,
  Upload,
  Zap,
} from "lucide-react";

import house3d from "@/assets/house-3d.jpg";
import { Button } from "@/components/ui/button";

function Heading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
        <Sparkles className="size-3.5" /> {eyebrow}
      </span>
      <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-muted-foreground">{text}</p>
    </div>
  );
}

export function TwoToThree() {
  const steps = [
    { icon: PencilRuler, title: "Draw walls & rooms", text: "Sketch your layout with precise measurements in the 2D planner." },
    { icon: Layers, title: "Add doors & windows", text: "Drop openings, stairs and fixtures that snap to your walls." },
    { icon: Rotate3d, title: "Switch to 3D instantly", text: "Your plan becomes a walkable 3D model in a single click." },
  ];
  return (
    <section id="two-to-three-d" className="relative py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <Heading eyebrow="2D Floor Plan" title="From flat sketch to full 3D home" text="Plan every room in 2D, then watch it rise into an accurate 3D house you can explore and style." />
          <ul className="mt-10 space-y-4">
            {steps.map((s) => (
              <li key={s.title} className="flex gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm lift">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl gradient-brand text-primary-foreground">
                  <s.icon className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div id="three-d" className="relative scroll-mt-24">
          <div className="absolute -inset-6 rounded-[2rem] gradient-brand opacity-20 blur-2xl" aria-hidden />
          <img src={house3d} alt="3D house model generated from a floor plan" loading="lazy" className="relative w-full rounded-3xl border border-border object-cover shadow-2xl" />
          <div className="glass absolute -bottom-6 left-6 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lg animate-float">
            <Box className="size-5 text-primary" />
            <span className="text-sm font-semibold text-foreground">Live 3D preview</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    { icon: Upload, title: "Start a project", text: "Create an account with just your email and open a new design." },
    { icon: PencilRuler, title: "Plan your space", text: "Draw your floor plan or upload a photo of any room." },
    { icon: Brush, title: "Style with AI", text: "Try paint colours, furniture, plants and full style makeovers." },
    { icon: FolderHeart, title: "Save & share", text: "Keep every version and revisit your favourite designs." },
  ];
  return (
    <section id="how" className="relative py-20 sm:py-28 gradient-soft">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Heading eyebrow="How it works" title="Four simple steps to your dream space" text="No design skills needed. DesignAI guides you from empty room to finished look." />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.title} className="relative rounded-2xl border border-border bg-card p-6 shadow-sm lift">
              <span className="absolute right-5 top-5 font-display text-4xl font-bold text-gradient opacity-40">0{i + 1}</span>
              <div className="grid size-11 place-items-center rounded-xl gradient-brand text-primary-foreground">
                <s.icon className="size-5" />
              </div>
              <h3 className="mt-5 font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function WhyUs() {
  const items = [
    { icon: Zap, title: "Instant results", text: "See AI changes in seconds instead of waiting on designers." },
    { icon: ShieldCheck, title: "Secure by default", text: "Passwordless email sign-in and private saved projects." },
    { icon: CheckCircle2, title: "Accurate planning", text: "Real measurements keep your plans practical and buildable." },
  ];
  return (
    <section id="why" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Heading eyebrow="Why DesignAI" title="Designed for homeowners, loved by pros" text="DesignAI brings floor planning, 3D visualisation and AI styling together in one beautiful workspace." />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {items.map((s) => (
            <div key={s.title} className="rounded-2xl border border-border bg-card p-7 text-center shadow-sm lift">
              <div className="mx-auto grid size-12 place-items-center rounded-full gradient-brand text-primary-foreground">
                <s.icon className="size-5" />
              </div>
              <h3 className="mt-5 font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
        <div id="saved" className="mt-16 grid gap-4 rounded-3xl border border-border bg-card p-8 shadow-sm sm:grid-cols-3 sm:text-center">
          {[["12+", "Design tools"], ["2D → 3D", "One-click conversion"], ["∞", "Saved designs"]].map(([n, l]) => (
            <div key={l}>
              <div className="font-display text-3xl font-bold text-gradient">{n}</div>
              <div className="mt-1 text-sm text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section id="cta" className="px-4 pb-24 sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] gradient-brand p-10 text-center text-primary-foreground shadow-2xl sm:p-16">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">Start designing your space today</h2>
        <p className="mx-auto mt-4 max-w-xl opacity-90">Create a free account in seconds with just your email — no password required.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="xl" variant="secondary">
            <Link to="/signup">Get started free <ArrowRight className="size-4" /></Link>
          </Button>
          <Button asChild size="xl" variant="ghost" className="border border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
            <Link to="/login">I already have an account</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
