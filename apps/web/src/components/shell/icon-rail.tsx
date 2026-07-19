"use client";

import {
  Bell,
  CheckSquare,
  Home,
  PanelLeft,
  Plus,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import { cn } from "@wayline/ui";
import { BrandLogo, hasBrandLogo } from "@/components/shell/brand-logo";

function RailButton({
  icon: Icon,
  label,
  active,
  accent,
  badge,
  onClick,
}: {
  icon: typeof Home;
  label: string;
  active?: boolean;
  accent?: boolean;
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
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
      {badge != null && badge > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-dark">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

export function IconRail({
  activeView,
  inboxUnread = 0,
  icon,
  logoLight,
  logoDark,
  onCreate,
  onHome,
  onToggleSidebar,
  onOpenMyTasks,
  onOpenBrain,
  onOpenSearch,
  onOpenInbox,
  onOpenSettings,
}: {
  activeView: string;
  inboxUnread?: number;
  icon?: string | null;
  logoLight?: string | null;
  logoDark?: string | null;
  onCreate: () => void;
  onHome: () => void;
  onToggleSidebar: () => void;
  onOpenMyTasks: () => void;
  onOpenBrain: () => void;
  onOpenSearch: () => void;
  onOpenInbox: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <nav className="flex w-14 shrink-0 flex-col items-center gap-2 bg-dark py-3">
      {/* Marca: ícone (símbolo) > logo > badge "W" de fallback */}
      {icon ? (
        <div className="mb-1 flex size-9 items-center justify-center overflow-hidden">
          <img src={icon} alt="Ícone" className="size-full object-contain" />
        </div>
      ) : hasBrandLogo(logoLight, logoDark) ? (
        <div className="mb-1 flex h-9 w-12 items-center justify-center overflow-hidden">
          <BrandLogo light={logoLight} dark={logoDark} className="max-h-9 max-w-full" />
        </div>
      ) : (
        <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-brand font-display text-h3 font-extrabold text-white shadow-xl">
          W
        </div>
      )}

      <RailButton icon={Plus} label="Criar tarefa" accent onClick={onCreate} />

      <div className="my-1 h-px w-6 bg-white/10" />

      <RailButton icon={Home} label="Board" active={activeView === "board"} onClick={onHome} />
      <RailButton icon={PanelLeft} label="Mostrar/ocultar menu" onClick={onToggleSidebar} />
      <RailButton icon={CheckSquare} label="Minhas tarefas" onClick={onOpenMyTasks} />
      <RailButton icon={Sparkles} label="Wayline Brain" onClick={onOpenBrain} />
      <RailButton icon={Search} label="Buscar (⌘K)" onClick={onOpenSearch} />

      <div className="mt-auto flex flex-col items-center gap-2">
        <RailButton
          icon={Bell}
          label="Notificações"
          badge={inboxUnread}
          onClick={onOpenInbox}
        />
        <RailButton icon={Settings} label="Configurações" onClick={onOpenSettings} />
      </div>
    </nav>
  );
}
