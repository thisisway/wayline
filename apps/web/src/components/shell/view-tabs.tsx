"use client";

import * as React from "react";
import {
  BarChart3,
  Calendar,
  Check,
  Download,
  Filter,
  GanttChartSquare,
  LayoutDashboard,
  LayoutGrid,
  List,
  MessageSquare,
  Network,
  SlidersHorizontal,
  UserPlus,
  X,
  Zap,
} from "lucide-react";
import type { BoardClientDTO, BoardMemberDTO } from "@wayline/db";
import { Avatar, AvatarGroup, Button, Tabs, TabsList, TabsTrigger, cn } from "@wayline/ui";
import type { Viewer } from "@/lib/presence";
import {
  activeFilterCount,
  EMPTY_FILTERS,
  type BoardFilters,
  type CustomFieldOption,
} from "@/lib/board-filter";
import { clients as mockClients } from "@/mock/data";

const views = [
  { id: "chat", label: "Chat", icon: <MessageSquare /> },
  { id: "board", label: "Board", icon: <LayoutGrid /> },
  { id: "list", label: "List", icon: <List /> },
  { id: "gantt", label: "Gantt", icon: <GanttChartSquare /> },
  { id: "calendar", label: "Calendar", icon: <Calendar /> },
  { id: "mindmap", label: "Mind Map", icon: <Network /> },
  { id: "reports", label: "Relatórios", icon: <BarChart3 /> },
  // Somente admin+ (visão executiva da org inteira).
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard />, adminOnly: true },
];

const PRIORITIES = [
  { value: "urgent", label: "Urgente", color: "#FF3B30" },
  { value: "high", label: "Alta", color: "#FFB800" },
  { value: "normal", label: "Normal", color: "#1D66FF" },
  { value: "low", label: "Baixa", color: "#94A3B8" },
];

export function ViewTabs({
  value,
  onValueChange,
  listName,
  viewers,
  filters,
  onFiltersChange,
  clients,
  members,
  tags,
  customFieldOptions,
  onOpenFields,
  onExport,
  onShare,
  onOpenAutomations,
  isAdmin,
}: {
  value: string;
  onValueChange: (v: string) => void;
  listName: string;
  viewers: Viewer[];
  filters: BoardFilters;
  onFiltersChange: (f: BoardFilters) => void;
  clients: BoardClientDTO[];
  members: BoardMemberDTO[];
  tags: Array<{ label: string; color: string }>;
  customFieldOptions: CustomFieldOption[];
  onOpenFields?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onOpenAutomations?: () => void;
  isAdmin: boolean;
}) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
      <div className="flex shrink-0 items-center gap-2">
        <span
          className="flex size-5 items-center justify-center rounded text-[10px] font-bold text-white"
          style={{ backgroundColor: mockClients.acme.color }}
        >
          {listName[0]?.toUpperCase() ?? "L"}
        </span>
        <span className="max-w-[10rem] truncate text-ui font-semibold">{listName}</span>
      </div>

      <div className="h-5 w-px shrink-0 bg-border" />

      <Tabs
        value={value}
        defaultValue="board"
        onValueChange={onValueChange}
        className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <TabsList className="w-max">
          {views
            .filter((v) => !v.adminOnly || isAdmin)
            .map((v) => (
              <TabsTrigger key={v.id} value={v.id} icon={v.icon}>
                {v.label}
              </TabsTrigger>
            ))}
        </TabsList>
      </Tabs>

      <div className="flex shrink-0 items-center gap-2">
        {viewers.length > 0 && (
          <span
            className="flex items-center gap-2"
            title={`${viewers.length} online: ${viewers.map((v) => v.name).join(", ")}`}
          >
            <span className="size-2 rounded-full bg-success" />
            <AvatarGroup people={viewers.map((v) => ({ name: v.name }))} size="sm" />
          </span>
        )}
        <div className="h-5 w-px bg-border" />
        <FilterMenu
          filters={filters}
          onChange={onFiltersChange}
          clients={clients}
          members={members}
          tags={tags}
          customFieldOptions={customFieldOptions}
        />
        {isAdmin && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Automações"
            title="Automações"
            onClick={onOpenAutomations}
          >
            <Zap />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Exportar CSV"
          title="Exportar tarefas (CSV)"
          onClick={onExport}
        >
          <Download />
        </Button>
        {isAdmin && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Campos customizados"
            title="Campos customizados"
            onClick={onOpenFields}
          >
            <SlidersHorizontal />
          </Button>
        )}
        {isAdmin && (
          <Button variant="secondary" size="sm" onClick={onShare}>
            <UserPlus className="size-4" />
            Compartilhar
          </Button>
        )}
      </div>
    </div>
  );
}

function fmtFieldValue(type: string, value: string): string {
  if (type === "checkbox") return value === "1" ? "Sim" : "Não";
  if (type === "date") {
    const d = new Date(value);
    return isNaN(d.getTime())
      ? value
      : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }
  return value;
}

function FilterMenu({
  filters,
  onChange,
  clients,
  members,
  tags,
  customFieldOptions,
}: {
  filters: BoardFilters;
  onChange: (f: BoardFilters) => void;
  clients: BoardClientDTO[];
  members: BoardMemberDTO[];
  tags: Array<{ label: string; color: string }>;
  customFieldOptions: CustomFieldOption[];
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const count = activeFilterCount(filters);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  function toggle(key: "priorities" | "assigneeIds" | "clientIds" | "tags", item: string) {
    const list = filters[key];
    const next = list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
    onChange({ ...filters, [key]: next });
  }

  function toggleCustom(name: string, value: string) {
    const current = filters.customFields[name] ?? [];
    const next = current.includes(value)
      ? current.filter((x) => x !== value)
      : [...current, value];
    const customFields = { ...filters.customFields };
    if (next.length) customFields[name] = next;
    else delete customFields[name];
    onChange({ ...filters, customFields });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Filtrar"
        className={cn(
          "flex h-9 items-center gap-1.5 rounded-md px-2 text-muted transition-colors hover:bg-elevated hover:text-foreground",
          count > 0 && "bg-brand/15 text-brand hover:bg-brand/20 hover:text-brand",
        )}
      >
        <Filter className="size-4" />
        {count > 0 && <span className="text-dense font-semibold">{count}</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-72 space-y-3 rounded-lg border border-border bg-surface p-3 shadow-lg animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-label uppercase text-subtle">Filtros</span>
            {count > 0 && (
              <button
                type="button"
                onClick={() => onChange(EMPTY_FILTERS)}
                className="flex items-center gap-1 text-dense text-muted hover:text-danger"
              >
                <X className="size-3.5" /> Limpar
              </button>
            )}
          </div>

          <Section label="Prioridade">
            {PRIORITIES.map((p) => (
              <Chip
                key={p.value}
                active={filters.priorities.includes(p.value)}
                onClick={() => toggle("priorities", p.value)}
              >
                <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
                {p.label}
              </Chip>
            ))}
          </Section>

          {members.length > 0 && (
            <Section label="Responsável">
              {members.map((m) => (
                <Chip
                  key={m.id}
                  active={filters.assigneeIds.includes(m.id)}
                  onClick={() => toggle("assigneeIds", m.id)}
                >
                  <Avatar name={m.name} src={m.avatarUrl ?? undefined} size="xs" />
                  {m.name.split(" ")[0]}
                </Chip>
              ))}
            </Section>
          )}

          {clients.length > 0 && (
            <Section label="Cliente">
              {clients.map((c) => (
                <Chip
                  key={c.id}
                  active={filters.clientIds.includes(c.id)}
                  onClick={() => toggle("clientIds", c.id)}
                >
                  <span className="size-2 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name}
                </Chip>
              ))}
            </Section>
          )}

          {tags.length > 0 && (
            <Section label="Tag">
              {tags.map((t) => (
                <Chip
                  key={t.label}
                  active={filters.tags.includes(t.label)}
                  onClick={() => toggle("tags", t.label)}
                >
                  <span className="size-2 rounded-full" style={{ backgroundColor: t.color }} />
                  {t.label}
                </Chip>
              ))}
            </Section>
          )}

          {customFieldOptions.map((cf) => (
            <Section key={cf.name} label={cf.name}>
              {cf.values.map((v) => (
                <Chip
                  key={v}
                  active={(filters.customFields[cf.name] ?? []).includes(v)}
                  onClick={() => toggleCustom(cf.name, v)}
                >
                  {fmtFieldValue(cf.type, v)}
                </Chip>
              ))}
            </Section>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="text-[11px] font-semibold text-subtle">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill border py-1 pl-1.5 pr-2 text-dense transition-colors",
        active
          ? "border-brand bg-brand/15 text-brand"
          : "border-border text-muted hover:bg-elevated",
      )}
    >
      {children}
      {active && <Check className="size-3" />}
    </button>
  );
}
