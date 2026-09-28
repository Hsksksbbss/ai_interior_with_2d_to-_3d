import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 ${className ?? ""}`} aria-label="DesignAI home">
      <span className="grid size-9 place-items-center rounded-xl gradient-brand shadow-soft">
        <Sparkles className="size-5 text-primary-foreground" />
      </span>
      <span className="font-display text-lg font-bold tracking-tight">
        Design<span className="text-gradient">AI</span>
      </span>
    </Link>
  );
}
