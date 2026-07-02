"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronDown,
  MessageSquare,
  Plus,
} from "lucide-react";
import type { BoardData, BoardTaskDTO } from "@wayline/db";
import { AvatarGroup, cn } from "@wayline/ui";
import { dtoToForm, mapTaskDTO, type TaskFormInput } from "@/lib/board";
import {
  createTaskAction,
  deleteTaskAction,
  updateTaskAction,
} from "@/actions/board";
import { pokeList } from "@/actions/live";
import { priorityMeta } from "@/components/board/task-card";
import { TaskModal } from "@/components/board/task-modal";

type ModalState =
  | { mode: "create"; statusId: string }
  | { mode: "edit"; task: BoardTaskDTO }
  | null;

/** Renderizador em LISTA sobre os mesmos dados do board (engine de views). */
export function ListView({ data }: { data: BoardData }) {
  const router = useRouter();
  const [modal, setModal] = React.useState<ModalState>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  async function handleSubmit(input: TaskFormInput) {
    if (!modal) return;
    setSubmitting(true);
    try {
      if (modal.mode === "create") await createTaskAction(data.orgId, input);
      else await updateTaskAction(data.orgId, modal.task.id, input);
      void pokeList(data.listId);
      setModal(null);
      router.refresh();
    } catch (err) {
      console.error("Falha ao salvar a tarefa:", err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (modal?.mode !== "edit") return;
    setSubmitting(true);
    try {
      await deleteTaskAction(data.orgId, modal.task.id);
      void pokeList(data.listId);
      setModal(null);
      router.refresh();
    } catch (err) {
      console.error("Falha ao excluir a tarefa:", err);
    } finally {
      setSubmitting(false);
    }
  }

  const modalInitial: TaskFormInput =
    modal?.mode === "edit"
      ? dtoToForm(modal.task)
      : {
          statusId: modal?.mode === "create" ? modal.statusId : (data.columns[0]?.id ?? ""),
          title: "",
          priority: "normal",
          clientId: null,
          dueDate: null,
          assigneeIds: [],
          tags: [],
        };

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
                    <Row
                      key={dto.id}
                      dto={dto}
                      first={i === 0}
                      onClick={() => setModal({ mode: "edit", task: dto })}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => setModal({ mode: "create", statusId: column.id })}
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

      {modal && (
        <TaskModal
          mode={modal.mode}
          orgId={data.orgId}
          currentUserId={data.currentUserId}
          taskId={modal.mode === "edit" ? modal.task.id : undefined}
          columns={data.columns.map((c) => ({ id: c.id, name: c.name }))}
          clients={data.clients}
          members={data.members}
          initial={modalInitial}
          submitting={submitting}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
        />
      )}
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
