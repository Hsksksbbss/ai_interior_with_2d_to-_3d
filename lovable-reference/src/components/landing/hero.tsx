import { Link } from "@tanstack/react-router";
import { ArrowRight, Boxes, LineChart, Ruler, Sparkles } from "lucide-react";

import heroInterior from "@/assets/hero-interior.jpg";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-24">
      <div className="pointer-events-none absolute inset-0 gradient-soft" />
      <div
        className="pointer-events-none absolute -top-40 -right-24 size-[34rem] rounded-full opacity-35 blur-3xl gradient-brand animate-float-slow"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-24 size-[26rem] rounded-full opacity-25 blur-3xl gradient-brand animate-float"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:px-8">
        <div className="animate-rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/70 px-4 py-1.5 text-xs font-medium backdrop-blur">
            <Sparkles className="size-3.5 text-primary" />
            AI interior design · 2D plans · 3D homes
          </span>

          <h1 className="mt-6 text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl">
            Design Your <span className="text-gradient">Dream Home</span> With AI
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Turn your ideas, floor plans and rooms into intelligent interior designs with
            AI-powered 2D planning, 3D visualization and smart interior recommendations.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Button variant="hero" size="xl" asChild>
              <Link to="/signup">
                Start Designing <ArrowRight />
              </Link>
            </Button>
            <Button variant="heroOutline" size="xl" asChild>
              <Link to="/" hash="features">
                Explore Features
              </Link>
            </Button>
          </div>

          <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6">
            {[
              { k: "2D → 3D", v: "One structured geometry" },
              { k: "Multi-floor", v: "Floor 1, 2 & both" },
              { k: "Editable", v: "Walls, doors, rooms" },
            ].map((item) => (
              <div key={item.k}>
                <dt className="font-display text-lg font-bold text-gradient">{item.k}</dt>
                <dd className="mt-1 text-xs text-muted-foreground">{item.v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative animate-rise">
          <div className="relative overflow-hidden rounded-[2rem] border border-primary/15 shadow-glow">
            <img
              src={heroInterior}
              alt="AI-designed modern living room with sofa, plants and wall art"
              width={1280}
              height={960}
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/25 to-transparent" />
          </div>

          <FloatingCard
            className="-left-4 top-10 animate-float sm:-left-8"
            icon={<LineChart className="size-4" />}
            label="AI Analysis"
            value="12 rooms scanned"
          />
          <FloatingCard
            className="-right-2 top-1/3 animate-float-slow sm:-right-6"
            icon={<Ruler className="size-4" />}
            label="2D Floor Plan"
            value="4.2 × 5.6 m living"
          />
          <FloatingCard
            className="bottom-16 -left-2 animate-float-slow sm:-left-10"
            icon={<Boxes className="size-4" />}
            label="3D Visualization"
            value="Isometric · Floor 2"
          />
          <FloatingCard
            className="-bottom-6 right-4 animate-float sm:right-10"
            icon={<Sparkles className="size-4" />}
            label="Smart Recommendations"
            value="Warm oak + sage"
          />
        </div>
      </div>
    </section>
  );
}

function FloatingCard({
  className,
  icon,
  label,
  value,
}: {
  className: string;
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      className={`absolute hidden rounded-2xl glass-panel px-4 py-3 shadow-soft sm:block ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-xl gradient-brand text-primary-foreground">
          {icon}
        </span>
        <div>
          <p className="text-xs font-semibold">{label}</p>
          <p className="text-[11px] text-muted-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}
