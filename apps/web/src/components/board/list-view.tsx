"use client";

import * as React from "react";
import { CalendarDays, ChevronDown, MessageSquare, Plus } from "lucide-react";
import type { BoardData, BoardTaskDTO } from "@wayline/db";
import { AvatarGroup, cn } from "@wayline/ui";
import { mapTaskDTO } from "@/lib/board";
import { useTaskEditor } from "@/lib/use-task-editor";
import { priorityMeta } from "@/components/board/task-card";

/** Renderizador em LISTA sobre os mesmos dados do board (engine de views). */
export function ListView({ data }: { data: BoardData }) {
  const editor = useTaskEditor(data);
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      <div className="mx-auto max-w-4xl space-y-6">
        {data.columns.map((column) => {
          const open = !collapsed[column.id];
          return (
            <section key={column.id}>
              <div className="mb-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCollapsed((s) => ({ ...s, [column.id]: open }))}
                  className="flex items-center gap-2"
                >
                  <ChevronDown
                    className={cn(
                      "size-3.5 text-subtle transition-transform",
                      !open && "-rotate-90",
                    )}
                  />
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: column.color }} />
                  <span className="text-dense font-bold uppercase tracking-wide text-foreground">
                    {column.name}
                  </span>
                  <span className="text-[11px] font-semibold text-muted">
                    {column.tasks.length}
                  </span>
                </button>
              </div>

              {open && (
                <div className="overflow-hidden rounded-lg border border-border">
                  {column.tasks.map((dto, i) => (
                    <Row key={dto.id} dto={dto} first={i === 0} onClick={() => editor.openEdit(dto)} />
                  ))}
                  <button
                    type="button"
                    onClick={() => editor.openCreate(column.id)}
                    className={cn(
                      "flex w-full items-center gap-1.5 px-3 h-9 text-dense font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground",
                      column.tasks.length > 0 && "border-t border-border",
                    )}
                  >
                    <Plus className="size-4" />
                    Nova tarefa
                  </button>
                </div>
              )}
            </section>
          );
        })}
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
