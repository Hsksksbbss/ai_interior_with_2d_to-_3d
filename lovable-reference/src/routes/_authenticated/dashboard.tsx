import { createFileRoute, Link } from "@tanstack/react-router";
import { Boxes, LayoutGrid, PencilRuler, ScanSearch } from "lucide-react";

import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — DesignAI" },
      { name: "description", content: "Your DesignAI workspace for 2D floor plans and 3D homes." },
      { property: "og:title", content: "Dashboard — DesignAI" },
      { property: "og:description", content: "Your DesignAI workspace." },
    ],
  }),
  component: DashboardPage,
});

const PANELS = [
  { icon: PencilRuler, title: "2D Floor Plan Designer", text: "Generate a structured plan from your room requirements." },
  { icon: LayoutGrid, title: "2D Editor", text: "Edit rooms, walls, doors, windows and dimensions." },
  { icon: Boxes, title: "3D Visualization", text: "Explore the same geometry as an interactive 3D home." },
  { icon: ScanSearch, title: "Smart House Analysis", text: "Review requirements, areas and AI suggestions." },
];

function DashboardPage() {
  const { user } = useSession();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 pt-28 pb-20 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Workspace</p>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
          Welcome{user?.email ? <>, <span className="text-gradient">{user.email}</span></> : null}
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          This is where your floor-plan designer and 3D viewer live. Drop your existing editor and
          3D engine into this route — the landing page and sign-in flow already point here.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {PANELS.map(({ icon: Icon, title, text }) => (
            <article key={title} className="lift rounded-3xl border border-border bg-card p-6">
              <span className="grid size-11 place-items-center rounded-2xl gradient-brand text-primary-foreground">
                <Icon className="size-5" />
              </span>
              <h2 className="mt-5 text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>

        <p className="mt-10 text-sm text-muted-foreground">
          Looking for the marketing site?{" "}
          <Link to="/" className="font-medium text-primary hover:underline">
            Back to home
          </Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}
