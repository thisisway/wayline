"use client";

import * as React from "react";
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Flag,
  Inbox,
  LayoutGrid,
  ListChecks,
  Sparkles,
} from "lucide-react";
import type { MyTask, NavSpace } from "@wayline/db";
import { cn } from "@wayline/ui";
import { IconContent } from "@/components/shell/icon-picker";

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

export function HomeDashboard({
  userName,
  myTasks,
  nav,
  onGoToList,
}: {
  userName: string;
  myTasks: MyTask[];
  nav: NavSpace[];
  onGoToList: (listId: string) => void;
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

  function dueChip(t: MyTask) {
    if (!t.dueDate) return null;
    const d = new Date(t.dueDate);
    const day = startOfDay(d);
    const overdue = day < todayStart;
    const today = day >= todayStart && day < tomorrowStart;
    const label = today
      ? "Hoje"
      : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
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
        onClick={() => onGoToList(t.listId)}
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
          <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: prio.color }}>
            <Flag className="size-3" fill={prio.color} />
          </span>
          <ChevronRight className="size-4 text-subtle opacity-0 transition-opacity group-hover:opacity-100" />
        </span>
      </button>
    );
  }

  const groupMeta: { key: Group; label: string; color: string; icon: typeof Flag }[] = [
    { key: "overdue", label: "Em atraso", color: "#FF3B30", icon: AlertTriangle },
    { key: "today", label: "Hoje", color: "#1D66FF", icon: CalendarClock },
    { key: "upcoming", label: "Próximas", color: "#7C5CFF", icon: CalendarDays },
    { key: "undated", label: "Sem data", color: "#94A3B8", icon: Inbox },
  ];

  const shortcuts = nav.flatMap((s) =>
    s.lists.map((l) => ({ spaceId: s.id, spaceColor: s.color, spaceIcon: s.icon, list: l })),
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-canvas">
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        {/* Cabeçalho */}
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-brand/10 via-surface to-surface p-6">
          <div className="absolute -right-8 -top-8 size-40 rounded-full bg-brand/10 blur-2xl" />
          <div className="relative">
            <p className="flex items-center gap-2 text-dense font-medium text-brand">
              <Sparkles className="size-4" /> Seu dia
            </p>
            <h1 className="mt-1 font-display text-h2 font-bold text-foreground">
              {greeting}, {userName.split(" ")[0]}
            </h1>
            <p className="mt-1 text-ui capitalize text-muted">{dateLabel}</p>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.key} className="rounded-xl border border-border bg-surface p-4">
                <span
                  className="flex size-8 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${s.color}1a`, color: s.color }}
                >
                  <Icon className="size-4" />
                </span>
                <p className="mt-3 font-display text-h2 font-extrabold leading-none text-foreground">
                  {s.value}
                </p>
                <p className="mt-1 text-dense text-muted">{s.label}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          {/* Minhas tarefas */}
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-label uppercase tracking-wide text-subtle">
              <ListChecks className="size-3.5" /> Minhas tarefas
            </h2>
            {myTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-surface py-14 text-center">
                <CheckCircle2 className="size-8 text-success" />
                <p className="text-ui font-medium text-foreground">Tudo em dia!</p>
                <p className="text-dense text-subtle">Nenhuma tarefa atribuída a você.</p>
              </div>
            ) : (
              groupMeta.map((gm) => {
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
                      {items.slice(0, 8).map((t) => (
                        <TaskRow key={t.id} t={t} />
                      ))}
                      {items.length > 8 && (
                        <p className="px-3 py-1.5 text-[11px] text-subtle">+ {items.length - 8} outras</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Atalhos */}
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-label uppercase tracking-wide text-subtle">
              <LayoutGrid className="size-3.5" /> Atalhos
            </h2>
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
  );
}
