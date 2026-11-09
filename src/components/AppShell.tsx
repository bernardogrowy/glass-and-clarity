import { Link } from "@tanstack/react-router";
import { Home, MessageCircle, Layers, BarChart3 } from "lucide-react";
import type { ReactNode } from "react";

const tabs = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/pratica", icon: MessageCircle, label: "Praticar" },
  { to: "/baralhos", icon: Layers, label: "Baralhos" },
  { to: "/progresso", icon: BarChart3, label: "Progresso" },
] as const;

export function AppShell({ children, hideTabs }: { children: ReactNode; hideTabs?: boolean }) {
  return (
    <div className="mx-auto min-h-screen max-w-md px-5 pb-32 pt-6">
      {children}
      {!hideTabs && (
        <nav className="glass fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 gap-1 rounded-full p-1.5">
          {tabs.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              aria-label={label}
              activeOptions={{ exact: true }}
              className="press flex h-12 items-center gap-2 rounded-full px-4 text-muted-foreground"
              activeProps={{ className: "glass-dark text-primary-foreground" }}
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-5 w-5" strokeWidth={2} />
                  {isActive && <span className="text-sm font-medium">{label}</span>}
                </>
              )}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}

export function GlassIconButton({ children, label, onClick }: { children: ReactNode; label: string; onClick?: () => void }) {
  return (
    <button aria-label={label} onClick={onClick} className="glass press grid h-11 w-11 place-items-center rounded-full text-foreground">
      {children}
    </button>
  );
}
