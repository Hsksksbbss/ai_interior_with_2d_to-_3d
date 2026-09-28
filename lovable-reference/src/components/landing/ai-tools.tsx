import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Armchair, PaintRoller, ScanSearch, Sparkles, Sprout } from "lucide-react";

import toolWall from "@/assets/tool-wall.jpg";
import toolFurniture from "@/assets/tool-furniture.jpg";
import toolPlants from "@/assets/tool-plants.jpg";
import toolStyling from "@/assets/tool-styling.jpg";
import toolAnalysis from "@/assets/tool-analysis.jpg";
import { Button } from "@/components/ui/button";

const TOOLS = [
  {
    icon: PaintRoller,
    title: "AI Wall Painting",
    text: "Preview colours, finishes and accent walls before you buy a single tin of paint.",
    image: toolWall,
    wide: true,
  },
  {
    icon: Armchair,
    title: "AI Furniture",
    text: "Try furniture concepts and arrangements that fit your real room dimensions.",
    image: toolFurniture,
  },
  {
    icon: Sprout,
    title: "AI Plants & Decor",
    text: "Get plant, lighting and decor suggestions matched to light and space.",
    image: toolPlants,
  },
  {
    icon: Sparkles,
    title: "AI Room Styling",
    text: "Restyle a whole room around a mood, palette or material direction.",
    image: toolStyling,
  },
  {
    icon: ScanSearch,
    title: "Smart House Analysis",
    text: "Analyse requirements, room counts and areas before layout generation.",
    image: toolAnalysis,
    wide: true,
  },
];

export function AiTools() {
  return (
    <section id="ai-tools" className="relative overflow-hidden py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 gradient-soft opacity-80" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">AI Tools</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
            AI Tools For Every Part of Your Home
          </h2>
          <p className="mt-4 text-muted-foreground">
            Each tool works on your own rooms and plans, inside the same workspace.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-6">
          {TOOLS.map(({ icon: Icon, title, text, image, wide }) => (
            <article
              key={title}
              className={`lift group overflow-hidden rounded-3xl border border-border bg-card ${
                wide ? "lg:col-span-3" : "lg:col-span-2"
              }`}
            >
              <div className="relative overflow-hidden">
                <img
                  src={image}
                  alt={title}
                  loading="lazy"
                  className="h-52 w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
                <span className="absolute left-4 top-4 grid size-10 place-items-center rounded-2xl glass-panel text-primary">
                  <Icon className="size-5" />
                </span>
              </div>
              <div className="p-6">
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
                <Button variant="soft" className="mt-5" asChild>
                  <Link to="/dashboard">
                    Try Now <ArrowUpRight />
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
