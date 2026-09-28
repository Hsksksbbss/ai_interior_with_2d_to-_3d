import { Link } from "@tanstack/react-router";

import { Logo } from "./logo";

const PRODUCT = [
  { label: "AI Wall Painting", hash: "ai-tools" },
  { label: "AI Furniture", hash: "ai-tools" },
  { label: "AI Plants & Decor", hash: "ai-tools" },
  { label: "2D Floor Plan", hash: "two-to-three-d" },
  { label: "3D Visualization", hash: "three-d" },
  { label: "Saved Designs", hash: "saved" },
];

const COMPANY = [
  { label: "About", hash: "why" },
  { label: "How it works", hash: "how" },
  { label: "Contact", hash: "cta" },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="lg:col-span-1">
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            AI-assisted interior design: structured 2D floor plans, editable layouts and
            interactive 3D homes.
          </p>
        </div>

        <FooterColumn title="Product">
          {PRODUCT.map((item) => (
            <Link
              key={item.label}
              to="/"
              hash={item.hash}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </FooterColumn>

        <FooterColumn title="Company">
          {COMPANY.map((item) => (
            <Link
              key={item.label}
              to="/"
              hash={item.hash}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </FooterColumn>

        <FooterColumn title="Account">
          <Link
            to="/login"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign Up
          </Link>
          <Link
            to="/dashboard"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Dashboard
          </Link>
        </FooterColumn>
      </div>
      <div className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} DesignAI. AI-assisted design suggestions, reviewed by you.
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
        {title}
      </h3>
      <div className="mt-4 flex flex-col gap-2.5">{children}</div>
    </div>
  );
}
