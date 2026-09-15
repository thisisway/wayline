"use client";

import * as React from "react";
import {
  AlertTriangle,
  Briefcase,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Flag,
  Inbox,
  LayoutGrid,
  LifeBuoy,
  ListChecks,
  Search,
  Sparkles,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { MyTask, NavSpace } from "@wayline/db";
import { Clock } from "lucide-react";
import { cn } from "@wayline/ui";
import { IconContent } from "@/components/shell/icon-picker";
import type { RecentTask } from "@/lib/recents";

const PRIO: Record<MyTask["priority"], { label: string; color: string }> = {
  urgent: { label: "Urgente", color: "#FF3B30" },
  high: { label: "Alta", color: "#FFB800" },
  normal: { label: "Normal", color: "#1D66FF" },
  low: { label: "Baixa", color: "#94A3B8" },
};

function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

type Group = "overdue" | "today" | "upcoming" | "undated";

interface Action {
  label: string;
  icon: LucideIcon;
  color: string;
  onClick?: () => void;
}

export function HomeDashboard({
  userName,
  myTasks,
  nav,
  recents,
  isAdmin,
  onGoToList,
  onOpenTask,
  onSearch,
  onOpenBrain,
  onOpenComercial,
  onOpenFinance,
  onOpenForms,
  onOpenSupport,
}: {
  userName: string;
  myTasks: MyTask[];
  nav: NavSpace[];
  recents: RecentTask[];
  isAdmin: boolean;
  onGoToList: (listId: string) => void;
  onOpenTask: (listId: string, taskId: string) => void;
  onSearch?: () => void;
  onOpenBrain?: () => void;
  onOpenComercial?: () => void;
  onOpenFinance?: () => void;
  onOpenForms?: () => void;
  onOpenSupport?: () => void;
}) {
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const dateLabel = now.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  const todayStart = startOfDay(now);
  const tomorrowStart = todayStart + 86_400_000;
  const weekEnd = todayStart + 7 * 86_400_000;

  const groups = React.useMemo(() => {
    const g: Record<Group, MyTask[]> = { overdue: [], today: [], upcoming: [], undated: [] };
    for (const t of myTasks) {
      if (!t.dueDate) {
        g.undated.push(t);
        continue;
      }
      const d = startOfDay(new Date(t.dueDate));
      if (d < todayStart) g.overdue.push(t);
      else if (d < tomorrowStart) g.today.push(t);
      else g.upcoming.push(t);
    }
    return g;
  }, [myTasks, todayStart, tomorrowStart]);

  const upcomingWeek = groups.upcoming.filter(
    (t) => t.dueDate && startOfDay(new Date(t.dueDate)) < weekEnd,
  ).length;

  const stats = [
    { key: "overdue", label: "Em atraso", value: groups.overdue.length, icon: AlertTriangle, color: "#FF3B30" },
    { key: "today", label: "Para hoje", value: groups.today.length, icon: CalendarClock, color: "#1D66FF" },
    { key: "week", label: "Próximos 7 dias", value: upcomingWeek, icon: CalendarDays, color: "#7C5CFF" },
    { key: "total", label: "Pendentes", value: myTasks.length, icon: ListChecks, color: "#17C86A" },
  ];

  const summary =
    myTasks.length === 0
      ? "Você está em dia — nada pendente por enquanto."
      : `Você tem ${myTasks.length} tarefa(s) pendente(s)` +
        (groups.overdue.length ? `, ${groups.overdue.length} em atraso.` : ".");

  const actions: Action[] = [
    { label: "Buscar", icon: Search, color: "#1D66FF", onClick: onSearch },
    { label: "Wayline Brain", icon: Sparkles, color: "#7C5CFF", onClick: onOpenBrain },
    ...(isAdmin ? [{ label: "Comercial", icon: Briefcase, color: "#0EA5E9", onClick: onOpenComercial } as Action] : []),
    ...(isAdmin ? [{ label: "Financeiro", icon: Wallet, color: "#17C86A", onClick: onOpenFinance } as Action] : []),
    { label: "Formulários", icon: ClipboardList, color: "#FFB800", onClick: onOpenForms },
    { label: "Suporte", icon: LifeBuoy, color: "#EC4899", onClick: onOpenSupport },
  ];

  const shortcuts = nav.flatMap((s) =>
    s.lists.map((l) => ({ spaceColor: s.color, spaceIcon: s.icon, list: l })),
  );

  function dueChip(t: MyTask) {
    if (!t.dueDate) return null;
    const d = new Date(t.dueDate);
    const day = startOfDay(d);
    const overdue = day < todayStart;
    const today = day >= todayStart && day < tomorrowStart;
    const label = today ? "Hoje" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-[11px] font-medium",
          overdue ? "text-danger" : today ? "text-brand" : "text-muted",
        )}
      >
        <CalendarDays className="size-3" /> {label}
      </span>
    );
  }

  function TaskRow({ t }: { t: MyTask }) {
    const prio = PRIO[t.priority];
    return (
      <button
        type="button"
        onClick={() => onOpenTask(t.listId, t.id)}
        className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-elevated"
      >
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: t.statusColor ?? "#94A3B8" }}
          title={t.statusName ?? undefined}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-ui text-foreground">{t.title}</span>
          <span className="mt-0.5 flex items-center gap-2 text-[11px] text-subtle">
            <span className="truncate">{t.listName}</span>
            {t.clientName && <span className="truncate">· {t.clientName}</span>}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2.5">
          {dueChip(t)}
          <Flag className="size-3" style={{ color: prio.color }} fill={prio.color} />
          <ChevronRight className="size-4 text-subtle opacity-0 transition-opacity group-hover:opacity-100" />
        </span>
      </button>
    );
  }

  const groupMeta: { key: Group; label: string; color: string; icon: LucideIcon }[] = [
    { key: "overdue", label: "Em atraso", color: "#FF3B30", icon: AlertTriangle },
    { key: "today", label: "Hoje", color: "#1D66FF", icon: CalendarClock },
    { key: "upcoming", label: "Próximas", color: "#7C5CFF", icon: CalendarDays },
    { key: "undated", label: "Sem data", color: "#94A3B8", icon: Inbox },
  ];

  function SectionTitle({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
    return (
      <h2 className="mb-3 flex items-center gap-2 text-label uppercase tracking-wide text-subtle">
        <Icon className="size-3.5" /> {children}
      </h2>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-canvas">
      <div className="w-full px-6 py-6 lg:px-10">
        {/* Hero */}
        <div className="relative mb-5 overflow-hidden rounded-2xl border border-border bg-gradient-to-r from-brand/15 via-brand/5 to-surface p-6 lg:p-7">
          <div className="absolute -right-10 -top-10 size-52 rounded-full bg-brand/15 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-dense font-medium text-brand">
                <Sparkles className="size-4" /> Seu dia
              </p>
              <h1 className="mt-1 font-display text-h2 font-bold text-foreground">
                {greeting}, {userName.split(" ")[0]}
              </h1>
              <p className="mt-1 text-ui text-muted">
                <span className="capitalize">{dateLabel}</span> · {summary}
              </p>
            </div>
            {onSearch && (
              <button
                type="button"
                onClick={onSearch}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface/70 px-3 h-10 text-dense font-medium text-muted backdrop-blur transition-colors hover:text-foreground"
              >
                <Search className="size-4" /> Buscar tarefas
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.key}
                className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4"
              >
                <span
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${s.color}1a`, color: s.color }}
                >
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="font-display text-h1 font-extrabold leading-none text-foreground">
                    {s.value}
                  </p>
                  <p className="mt-1 text-dense text-muted">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Corpo: tarefas (2/3) + lateral (1/3) */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <SectionTitle icon={ListChecks}>Minhas tarefas</SectionTitle>
            {myTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-surface py-16 text-center">
                <CheckCircle2 className="size-9 text-success" />
                <p className="text-ui font-medium text-foreground">Tudo em dia!</p>
                <p className="text-dense text-subtle">
                  Nenhuma tarefa atribuída a você. Use os atalhos ao lado para começar.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {groupMeta.map((gm) => {
                  const items = groups[gm.key];
                  if (items.length === 0) return null;
                  const Icon = gm.icon;
                  return (
                    <div key={gm.key} className="overflow-hidden rounded-xl border border-border bg-surface">
                      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                        <Icon className="size-3.5" style={{ color: gm.color }} />
                        <span className="text-dense font-semibold text-foreground">{gm.label}</span>
                        <span
                          className="flex h-5 min-w-5 items-center justify-center rounded-pill px-1.5 text-[11px] font-bold"
                          style={{ backgroundColor: `${gm.color}1a`, color: gm.color }}
                        >
                          {items.length}
                        </span>
                      </div>
                      <div className="p-1.5">
                        {items.slice(0, 10).map((t) => (
                          <TaskRow key={t.id} t={t} />
                        ))}
                        {items.length > 10 && (
                          <p className="px-3 py-1.5 text-[11px] text-subtle">+ {items.length - 10} outras</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lateral */}
          <div className="space-y-6">
            {recents.length > 0 && (
              <div>
                <SectionTitle icon={Clock}>Recentes</SectionTitle>
                <div className="overflow-hidden rounded-xl border border-border bg-surface p-1.5">
                  {recents.slice(0, 6).map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => onOpenTask(r.listId, r.id)}
                      className="group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-elevated"
                    >
                      <Clock className="size-3.5 shrink-0 text-subtle" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-ui text-foreground">{r.title}</span>
                        {r.listName && (
                          <span className="block truncate text-[11px] text-subtle">{r.listName}</span>
                        )}
                      </span>
                      <ChevronRight className="size-4 text-subtle opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <SectionTitle icon={Zap}>Ações rápidas</SectionTitle>
              <div className="grid grid-cols-2 gap-2.5">
                {actions.map((a) => {
                  const Icon = a.icon;
                  return (
                    <button
                      key={a.label}
                      type="button"
                      onClick={a.onClick}
                      className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:bg-elevated"
                    >
                      <span
                        className="flex size-8 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${a.color}1a`, color: a.color }}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="text-dense font-medium text-foreground">{a.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <SectionTitle icon={LayoutGrid}>Atalhos</SectionTitle>
              <div className="overflow-hidden rounded-xl border border-border bg-surface p-1.5">
                {shortcuts.length === 0 ? (
                  <p className="px-3 py-6 text-center text-dense text-subtle">Nenhuma lista ainda.</p>
                ) : (
                  shortcuts.slice(0, 12).map(({ list, spaceColor, spaceIcon }) => (
                    <button
                      key={list.id}
                      type="button"
                      onClick={() => onGoToList(list.id)}
                      className="group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-elevated"
                    >
                      <span
                        className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded text-[11px] font-bold text-white"
                        style={{ backgroundColor: spaceColor }}
                      >
                        <IconContent icon={list.icon ?? spaceIcon} fallback={list.name[0] ?? "L"} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-ui text-foreground">{list.name}</span>
                      <ChevronRight className="size-4 text-subtle opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
