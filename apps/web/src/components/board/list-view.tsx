"use client";

import * as React from "react";
import { CalendarDays, ChevronDown, MessageSquare, Plus } from "lucide-react";
import type { BoardData, BoardTaskDTO } from "@wayline/db";
import { AvatarGroup, cn } from "@wayline/ui";
import { mapTaskDTO } from "@/lib/board";
import { useTaskEditor } from "@/lib/use-task-editor";
import { priorityMeta } from "@/components/board/task-card";

type GroupBy = "status" | "priority" | "assignee" | "client";

interface Group {
  key: string;
  name: string;
  color: string;
  tasks: BoardTaskDTO[];
  statusId?: string; // só no agrupamento por status (para "Nova tarefa")
}

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: "status", label: "Status" },
  { value: "priority", label: "Prioridade" },
  { value: "assignee", label: "Responsável" },
  { value: "client", label: "Cliente" },
];

const PRIORITIES: { value: BoardTaskDTO["priority"]; label: string; color: string }[] = [
  { value: "urgent", label: "Urgente", color: "#FF3B30" },
  { value: "high", label: "Alta", color: "#FFB800" },
  { value: "normal", label: "Normal", color: "#1D66FF" },
  { value: "low", label: "Baixa", color: "#94A3B8" },
];

function buildGroups(data: BoardData, groupBy: GroupBy): Group[] {
  if (groupBy === "status") {
    return data.columns.map((c) => ({
      key: c.id,
      name: c.name,
      color: c.color,
      tasks: c.tasks,
      statusId: c.id,
    }));
  }

  const all = data.columns.flatMap((c) => c.tasks);

  if (groupBy === "priority") {
    return PRIORITIES.map((p) => ({
      key: p.value,
      name: p.label,
      color: p.color,
      tasks: all.filter((t) => t.priority === p.value),
    })).filter((g) => g.tasks.length > 0);
  }

  if (groupBy === "client") {
    const groups: Group[] = data.clients
      .map((cl) => ({
        key: cl.id,
        name: cl.name,
        color: cl.color,
        tasks: all.filter((t) => t.client?.id === cl.id),
      }))
      .filter((g) => g.tasks.length > 0);
    const none = all.filter((t) => !t.client);
    if (none.length) groups.push({ key: "none", name: "Sem cliente", color: "#94A3B8", tasks: none });
    return groups;
  }

  // assignee (uma tarefa com N responsáveis aparece em N grupos)
  const groups: Group[] = data.members
    .map((m) => ({
      key: m.id,
      name: m.name,
      color: "#1D66FF",
      tasks: all.filter((t) => t.assignees.some((a) => a.id === m.id)),
    }))
    .filter((g) => g.tasks.length > 0);
  const none = all.filter((t) => t.assignees.length === 0);
  if (none.length) groups.push({ key: "none", name: "Sem responsável", color: "#94A3B8", tasks: none });
  return groups;
}

/** Renderizador em LISTA sobre os mesmos dados do board (engine de views). */
export function ListView({ data }: { data: BoardData }) {
  const editor = useTaskEditor(data);
  const [groupBy, setGroupBy] = React.useState<GroupBy>("status");
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  const groups = React.useMemo(() => buildGroups(data, groupBy), [data, groupBy]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-dense text-muted">Agrupar por</span>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className="h-8 rounded-md border border-border bg-surface px-2 text-dense font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {GROUP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-6">
          {groups.map((group) => {
            const open = !collapsed[group.key];
            return (
              <section key={group.key}>
                <div className="mb-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCollapsed((s) => ({ ...s, [group.key]: open }))}
                    className="flex items-center gap-2"
                  >
                    <ChevronDown
                      className={cn(
                        "size-3.5 text-subtle transition-transform",
                        !open && "-rotate-90",
                      )}
                    />
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: group.color }} />
                    <span className="text-dense font-bold uppercase tracking-wide text-foreground">
                      {group.name}
                    </span>
                    <span className="text-[11px] font-semibold text-muted">
                      {group.tasks.length}
                    </span>
                  </button>
                </div>

                {open && (
                  <div className="overflow-hidden rounded-lg border border-border">
                    {group.tasks.map((dto, i) => (
                      <Row
                        key={dto.id}
                        dto={dto}
                        first={i === 0}
                        onClick={() => editor.openEdit(dto)}
                      />
                    ))}
                    {group.statusId && (
                      <button
                        type="button"
                        onClick={() => editor.openCreate(group.statusId!)}
                        className={cn(
                          "flex w-full items-center gap-1.5 px-3 h-9 text-dense font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground",
                          group.tasks.length > 0 && "border-t border-border",
                        )}
                      >
                        <Plus className="size-4" />
                        Nova tarefa
                      </button>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>

      {editor.modal}
    </div>
  );
}

function Row({
  dto,
  first,
  onClick,
}: {
  dto: BoardTaskDTO;
  first: boolean;
  onClick: () => void;
}) {
  const card = mapTaskDTO(dto);
  const prio = priorityMeta[card.priority];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 bg-surface px-3 h-11 text-left transition-colors hover:bg-elevated",
        !first && "border-t border-border",
      )}
    >
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: prio.color }}
        title={prio.label}
      />
      <span className="min-w-0 flex-1 truncate text-ui font-medium text-foreground">
        {card.title}
      </span>

      {card.client && (
        <span className="hidden items-center gap-1.5 text-[11px] font-semibold text-muted sm:flex">
          <span className="size-2 rounded-full" style={{ backgroundColor: card.client.color }} />
          {card.client.name}
        </span>
      )}

      {card.tags.length > 0 && (
        <span
          className="hidden shrink-0 rounded-pill px-2 h-5 items-center text-[11px] font-semibold md:inline-flex"
          style={{ backgroundColor: `${card.tags[0]!.color}22`, color: card.tags[0]!.color }}
        >
          {card.tags[0]!.label}
        </span>
      )}

      {card.dueLabel && (
        <span
          className={cn(
            "hidden shrink-0 items-center gap-1 text-[11px] sm:flex",
            card.overdue ? "font-semibold text-danger" : "text-muted",
          )}
        >
          <CalendarDays className="size-3.5" />
          {card.dueLabel}
        </span>
      )}

      {card.comments > 0 && (
        <span className="hidden shrink-0 items-center gap-1 text-[11px] text-muted sm:flex">
          <MessageSquare className="size-3.5" />
          {card.comments}
        </span>
      )}

      <AvatarGroup people={card.assignees} size="xs" max={3} className="shrink-0" />
    </button>
  );
}
