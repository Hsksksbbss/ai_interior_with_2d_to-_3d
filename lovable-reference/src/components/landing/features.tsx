import {
  Armchair,
  Boxes,
  Building2,
  Layers,
  Lightbulb,
  PaintRoller,
  PencilRuler,
  RefreshCw,
  Ruler,
  Save,
  ScanSearch,
  Sprout,
} from "lucide-react";

const FEATURES = [
  {
    icon: PaintRoller,
    title: "AI Wall Painting",
    text: "Visualize wall colors, finishes and painting ideas using AI.",
  },
  {
    icon: Armchair,
    title: "AI Furniture Design",
    text: "Explore furniture arrangements and interior furniture concepts for your rooms.",
  },
  {
    icon: Sprout,
    title: "AI Plants & Decor",
    text: "Improve your interior with AI-powered plant, lighting and decor suggestions.",
  },
  {
    icon: Save,
    title: "Saved Designs",
    text: "Save your favorite designs and return to them whenever you want.",
  },
  {
    icon: ScanSearch,
    title: "Smart House Analysis",
    text: "Analyze your house requirements and get intelligent interior design suggestions.",
  },
  {
    icon: PencilRuler,
    title: "2D Floor Plan Designer",
    text: "Create structured architectural floor plans from your requirements.",
  },
  {
    icon: Layers,
    title: "2D Floor Plan Editor",
    text: "Edit rooms, walls, doors, windows, dimensions and room names.",
  },
  {
    icon: RefreshCw,
    title: "Regenerate 2D Designs",
    text: "Generate multiple valid floor-plan variations while preserving your requirements.",
  },
  {
    icon: Boxes,
    title: "3D House Visualization",
    text: "Convert structured 2D geometry into an interactive 3D house.",
  },
  {
    icon: Building2,
    title: "Multi-Floor Design",
    text: "Design and visualize multiple floors with connected staircases.",
  },
  {
    icon: Ruler,
    title: "Smart Dimensions",
    text: "View room dimensions, areas and overall building measurements.",
  },
  {
    icon: Lightbulb,
    title: "Materials & Lighting",
    text: "Visualize materials, furniture and lighting in the 3D environment.",
  },
];

export function Features() {
  return (
    <section id="features" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Features</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
            Everything You Need to Design Your Space
          </h2>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="lift group rounded-3xl border border-border bg-card p-6"
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary transition-colors group-hover:gradient-brand group-hover:text-primary-foreground">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
