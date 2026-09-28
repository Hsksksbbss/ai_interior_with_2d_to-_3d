import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, LogOut, LayoutDashboard } from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useSession } from "@/hooks/use-session";
import { supabase } from "@/integrations/supabase/client";

type NavItem = { label: string; to: "/"; hash?: string };

const NAV_ITEMS: NavItem[] = [
  { label: "Home", to: "/" },
  { label: "Features", to: "/", hash: "features" },
  { label: "AI Tools", to: "/", hash: "ai-tools" },
  { label: "2D Floor Plan", to: "/", hash: "two-to-three-d" },
  { label: "3D Design", to: "/", hash: "three-d" },
  { label: "About", to: "/", hash: "why" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { session } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    setOpen(false);
    navigate({ to: "/login", replace: true });
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? "glass-panel shadow-soft" : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />

        <div className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              {...(item.hash ? { hash: item.hash } : {})}
              className="rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          {session ? (
            <>
              <Button variant="soft" asChild>
                <Link to="/dashboard">
                  <LayoutDashboard /> Dashboard
                </Link>
              </Button>
              <Button variant="hero" onClick={signOut}>
                <LogOut /> Log out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button variant="hero" asChild>
                <Link to="/signup">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="heroOutline" size="icon" aria-label="Open menu">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[86vw] max-w-sm">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <div className="mt-2 flex flex-col gap-1">
              <Logo className="mb-4" />
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  {...(item.hash ? { hash: item.hash } : {})}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-base font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-4 flex flex-col gap-2">
                {session ? (
                  <>
                    <Button variant="soft" asChild onClick={() => setOpen(false)}>
                      <Link to="/dashboard">Dashboard</Link>
                    </Button>
                    <Button variant="hero" onClick={signOut}>
                      Log out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="heroOutline" asChild onClick={() => setOpen(false)}>
                      <Link to="/login">Login</Link>
                    </Button>
                    <Button variant="hero" asChild onClick={() => setOpen(false)}>
                      <Link to="/signup">Get Started</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
