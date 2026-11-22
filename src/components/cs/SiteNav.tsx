import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Leaf, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/new", label: "New assessment" },
  { to: "/map", label: "Map" },
  { to: "/simulator", label: "Simulator" },
  { to: "/recommendations", label: "Recommendations" },
  { to: "/assessments", label: "Archive" },
  { to: "/compare", label: "Compare" },
  { to: "/methodology", label: "Methodology" },
] as const;

export function SiteNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground"><Leaf className="h-4 w-4" /></span>
          <span className="font-display text-lg">CarbonScope</span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground" activeProps={{ className: "bg-secondary text-foreground" }}>
              {l.label}
            </Link>
          ))}
        </nav>
        <Button size="icon" variant="ghost" className="lg:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>{open ? <X /> : <Menu />}</Button>
      </div>
      <nav className={cn("grid gap-1 border-t px-4 py-2 lg:hidden", !open && "hidden")}>
        {LINKS.map((l) => (
          <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm hover:bg-secondary">{l.label}</Link>
        ))}
      </nav>
    </header>
  );
}
