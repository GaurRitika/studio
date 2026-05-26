import { Link, useRouterState } from "@tanstack/react-router";
import { Sparkles, LayoutGrid, CreditCard, Wand2 } from "lucide-react";

const items = [
  { to: "/", label: "Editor", icon: Wand2 },
  { to: "/pricing", label: "Pricing", icon: CreditCard },
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
] as const;

export function FloatingNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 w-[min(100%-1.5rem,720px)]">
      <div className="glass-strong rounded-2xl px-3 py-2.5 flex items-center justify-between gap-2">
        <Link to="/" className="flex items-center gap-2 pl-2 pr-3">
          <div className="size-8 rounded-xl gradient-primary grid place-items-center glow-shadow">
            <Sparkles className="size-4 text-white" />
          </div>
          <span className="font-display font-semibold tracking-tight hidden sm:inline">Carousel Studio</span>
        </Link>
        <nav className="flex items-center gap-1">
          {items.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "text-foreground bg-white/5 glow-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
