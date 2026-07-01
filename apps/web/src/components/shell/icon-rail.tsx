"use client";

import {
  Bell,
  CheckSquare,
  Home,
  LayoutGrid,
  Plus,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@wayline/ui";

const primary = [
  { id: "home", icon: Home, label: "Home", active: true },
  { id: "spaces", icon: LayoutGrid, label: "Spaces" },
  { id: "tasks", icon: CheckSquare, label: "My Tasks" },
  { id: "brain", icon: Sparkles, label: "Wayline Brain" },
  { id: "search", icon: Search, label: "Buscar" },
];

function RailButton({
  icon: Icon,
  label,
  active,
  accent,
}: {
  icon: typeof Home;
  label: string;
  active?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        "group relative flex size-10 items-center justify-center rounded-lg transition-colors",
        accent
          ? "bg-brand text-white hover:bg-brand-80 shadow-sm"
          : active
            ? "bg-white/10 text-white"
            : "text-white/55 hover:bg-white/10 hover:text-white",
      )}
    >
      {active && !accent && (
        <span className="absolute -left-2 h-5 w-1 rounded-pill bg-brand" />
      )}
      <Icon className="size-5" />
    </button>
  );
}

export function IconRail() {
  return (
    <nav className="flex w-14 shrink-0 flex-col items-center gap-2 bg-dark py-3">
      {/* Marca */}
      <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-brand font-display text-h3 font-extrabold text-white shadow-xl">
        W
      </div>

      <RailButton icon={Plus} label="Criar" accent />

      <div className="my-1 h-px w-6 bg-white/10" />

      {primary.map((item) => (
        <RailButton key={item.id} icon={item.icon} label={item.label} active={item.active} />
      ))}

      <div className="mt-auto flex flex-col items-center gap-2">
        <RailButton icon={Bell} label="Notificações" />
        <RailButton icon={Settings} label="Configurações" />
      </div>
    </nav>
  );
}
