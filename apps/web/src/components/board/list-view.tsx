"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronDown, MessageSquare, Plus, Trash2, X } from "lucide-react";
import type { BoardColumnDTO, BoardData, BoardTaskDTO } from "@wayline/db";
import { AvatarGroup, cn } from "@wayline/ui";
import { mapTaskDTO } from "@/lib/board";
import { useTaskEditor } from "@/lib/use-task-editor";
import { priorityMeta } from "@/components/board/task-card";
import { collectCustomFieldOptions } from "@/lib/board-filter";
import { bulkDeleteAction, bulkPriorityAction, bulkStatusAction } from "@/actions/board";
import { pokeList } from "@/actions/live";

/** "status" | "priority" | "assignee" | "client" | `cf:<nome do campo>` */
type GroupBy = string;
type SortBy = "default" | "due" | "priority" | "title";

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

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "default", label: "Padrão" },
  { value: "due", label: "Prazo" },
  { value: "priority", label: "Prioridade" },
  { value: "title", label: "Título" },
];

const PRIO_ORDER: Record<BoardTaskDTO["priority"], number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

function sortTasks(tasks: BoardTaskDTO[], sortBy: SortBy): BoardTaskDTO[] {
  if (sortBy === "default") return tasks;
  const copy = [...tasks];
  if (sortBy === "due") {
    copy.sort(
      (a, b) => (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity),
    );
  } else if (sortBy === "priority") {
    copy.sort((a, b) => PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority]);
  } else if (sortBy === "title") {
    copy.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
  }
  return copy;
}

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

  if (groupBy.startsWith("cf:")) {
    const name = groupBy.slice(3);
    const valueOf = (t: BoardTaskDTO) =>
      (t.customFields ?? []).find((f) => f.name === name)?.value ?? "";
    const type =
      all.flatMap((t) => t.customFields ?? []).find((f) => f.name === name)?.type ?? "text";
    const distinct = [...new Set(all.map(valueOf).filter((v) => v !== ""))].sort();
    const groups: Group[] = distinct.map((v) => ({
      key: `cf:${v}`,
      name: fmtFieldValue(type, v),
      color: "#7C5CFF",
      tasks: all.filter((t) => valueOf(t) === v),
    }));
    const none = all.filter((t) => valueOf(t) === "");
    if (none.length) groups.push({ key: "none", name: "Sem valor", color: "#94A3B8", tasks: none });
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
  const router = useRouter();
  const [groupBy, setGroupBy] = React.useState<GroupBy>("status");
  const [sortBy, setSortBy] = React.useState<SortBy>("default");
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  function toggleSelect(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function clearSelection() {
    setSelected(new Set());
  }
  function afterBulk() {
    clearSelection();
    void pokeList(data.listId);
    router.refresh();
  }

  const groupOptions = React.useMemo(() => {
    const custom = collectCustomFieldOptions(data).map((cf) => ({
      value: `cf:${cf.name}`,
      label: cf.name,
    }));
    return [...GROUP_OPTIONS, ...custom];
  }, [data]);

  // Se agrupava por um campo que sumiu (ex.: trocou de lista), volta p/ status.
  const activeGroupBy = groupOptions.some((o) => o.value === groupBy) ? groupBy : "status";

  const groups = React.useMemo(() => {
    const g = buildGroups(data, activeGroupBy);
    return sortBy === "default"
      ? g
      : g.map((grp) => ({ ...grp, tasks: sortTasks(grp.tasks, sortBy) }));
  }, [data, activeGroupBy, sortBy]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="text-dense text-muted">Agrupar por</span>
            <select
              value={activeGroupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="h-8 rounded-md border border-border bg-surface px-2 text-dense font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {groupOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-dense text-muted">Ordenar por</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="h-8 rounded-md border border-border bg-surface px-2 text-dense font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
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
                        selected={selected.has(dto.id)}
                        onToggleSelect={() => toggleSelect(dto.id)}
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

      {selected.size > 0 && (
        <BulkBar
          orgId={data.orgId}
          ids={[...selected]}
          count={selected.size}
          columns={data.columns}
          onClear={clearSelection}
          onDone={afterBulk}
        />
      )}

      {editor.modal}
    </div>
  );
}

function BulkBar({
  orgId,
  ids,
  count,
  columns,
  onClear,
  onDone,
}: {
  orgId: string;
  ids: string[];
  count: number;
  columns: BoardColumnDTO[];
  onClear: () => void;
  onDone: () => void;
}) {
  const [busy, setBusy] = React.useState(false);

  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
      onDone();
    }
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 shadow-xl">
        <span className="text-dense font-semibold text-foreground">
          {count} selecionada{count > 1 ? "s" : ""}
        </span>
        <div className="h-5 w-px bg-border" />
        <select
          defaultValue=""
          disabled={busy}
          onChange={(e) => e.target.value && run(() => bulkStatusAction(orgId, ids, e.target.value))}
          className="h-8 rounded-md border border-border bg-surface px-2 text-dense text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="" disabled>
            Mover para…
          </option>
          {columns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          defaultValue=""
          disabled={busy}
          onChange={(e) =>
            e.target.value &&
            run(() =>
              bulkPriorityAction(
                orgId,
                ids,
                e.target.value as "urgent" | "high" | "normal" | "low",
              ),
            )
          }
          className="h-8 rounded-md border border-border bg-surface px-2 text-dense text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="" disabled>
            Prioridade…
          </option>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (confirm(`Excluir ${count} tarefa(s)?`)) void run(() => bulkDeleteAction(orgId, ids));
          }}
          aria-label="Excluir selecionadas"
          className="flex size-8 items-center justify-center rounded-md text-subtle hover:bg-danger/10 hover:text-danger disabled:opacity-50"
        >
          <Trash2 className="size-4" />
        </button>
        <button
          type="button"
          onClick={onClear}
          aria-label="Limpar seleção"
          className="flex size-8 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

function Row({
  dto,
  first,
  selected,
  onToggleSelect,
  onClick,
}: {
  dto: BoardTaskDTO;
  first: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onClick: () => void;
}) {
  const card = mapTaskDTO(dto);
  const prio = priorityMeta[card.priority];
  return (
    <div
      className={cn(
        "group flex w-full items-center gap-2 px-3 h-11 transition-colors",
        selected ? "bg-brand/5" : "bg-surface hover:bg-elevated",
        !first && "border-t border-border",
      )}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggleSelect}
        aria-label="Selecionar tarefa"
        className={cn(
          "size-4 shrink-0 cursor-pointer accent-brand transition-opacity",
          !selected && "opacity-0 group-hover:opacity-100",
        )}
      />
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
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
    </div>
  );
}
