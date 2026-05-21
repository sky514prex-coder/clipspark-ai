import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Wand2,
  FolderDown,
  LayoutTemplate,
  Settings as SettingsIcon,
  Sparkles,
} from "lucide-react";

const items = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Wand2, label: "Generate Clips", active: false },
  { icon: FolderDown, label: "My Exports", active: false },
  { icon: LayoutTemplate, label: "Community Templates", active: false },
  { icon: SettingsIcon, label: "Settings", active: false },
];

export function DashboardSidebar() {
  return (
    <aside className="glass sticky top-4 hidden h-[calc(100vh-2rem)] w-64 shrink-0 flex-col rounded-2xl p-4 lg:flex">
      <Link to="/" className="mb-6 flex items-center gap-2 px-2 py-1">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-base font-semibold">
          ClipRush <span className="text-gradient">AI</span>
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {items.map((it) => (
          <button
            key={it.label}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
              it.active
                ? "bg-gradient-primary text-primary-foreground glow-cyan"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            }`}
          >
            <it.icon className="h-4 w-4" />
            {it.label}
          </button>
        ))}
      </nav>

      <div className="glass-strong mt-4 rounded-xl p-3 text-xs text-muted-foreground">
        <p className="font-semibold text-foreground">100% Free Forever</p>
        <p className="mt-1">No accounts. No paywalls. Open source.</p>
      </div>
    </aside>
  );
}
