"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoreHorizontal, Plus } from "lucide-react";
import { cn } from "@wayline/ui";
import type { BoardData, BoardTaskDTO } from "@wayline/db";
import { TaskCard } from "./task-card";
import { TaskModal } from "./task-modal";
import {
  createTaskAction,
  deleteTaskAction,
  saveBoard,
  updateTaskAction,
} from "@/actions/board";
import { dtoToForm, mapTaskDTO, type TaskFormInput } from "@/lib/board";
import { pokeList } from "@/actions/live";
import { useLiveList } from "@/lib/use-live-list";

interface UIColumn {
  id: string;
  name: string;
  color: string;
  cards: BoardTaskDTO[];
}

type ModalState =
  | { mode: "create"; statusId: string }
  | { mode: "edit"; task: BoardTaskDTO }
  | null;

/** Board Kanban com drag-and-drop, persistência e CRUD de tarefas. */
export function DndBoard({ data }: { data: BoardData }) {
  const orgId = data.orgId;
  const [columns, setColumns] = React.useState<UIColumn[]>(() =>
    data.columns.map((c) => ({ id: c.id, name: c.name, color: c.color, cards: c.tasks })),
  );
  const columnsRef = React.useRef(columns);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [modal, setModal] = React.useState<ModalState>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [, startTransition] = React.useTransition();

  const commit = React.useCallback((next: UIColumn[]) => {
    columnsRef.current = next;
    setColumns(next);
  }, []);

  const poke = React.useCallback(() => void pokeList(data.listId), [data.listId]);

  // Realtime: escuta mudanças da lista e refetcha (router.refresh no hook).
  useLiveList(data.listId);

  // Reconcilia o estado local com os dados novos do servidor (refetch), exceto
  // durante um drag ativo. `data` só muda de referência num refetch/navegação.
  React.useEffect(() => {
    if (activeId) return;
    commit(
      data.columns.map((c) => ({ id: c.id, name: c.name, color: c.color, cards: c.tasks })),
    );
  }, [data]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const columnIdOf = React.useCallback((id: string): string | undefined => {
    const cur = columnsRef.current;
    if (cur.some((c) => c.id === id)) return id;
    return cur.find((c) => c.cards.some((card) => card.id === id))?.id;
  }, []);

  const activeCard = React.useMemo(() => {
    if (!activeId) return undefined;
    for (const c of columns) {
      const found = c.cards.find((card) => card.id === activeId);
      if (found) return found;
    }
    return undefined;
  }, [activeId, columns]);

  // --- Drag & drop ---------------------------------------------------------
  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const fromCol = columnIdOf(activeIdStr);
    const toCol = columnIdOf(overIdStr);
    if (!fromCol || !toCol || fromCol === toCol) return;

    const cur = columnsRef.current;
    const from = cur.find((c) => c.id === fromCol)!;
    const to = cur.find((c) => c.id === toCol)!;
    const moved = from.cards.find((c) => c.id === activeIdStr);
    if (!moved) return;

    const overIsColumn = cur.some((c) => c.id === overIdStr);
    const overIndex = overIsColumn
      ? to.cards.length
      : Math.max(0, to.cards.findIndex((c) => c.id === overIdStr));

    commit(
      cur.map((c) => {
        if (c.id === fromCol) return { ...c, cards: c.cards.filter((x) => x.id !== activeIdStr) };
        if (c.id === toCol) {
          const next = [...c.cards];
          next.splice(overIndex, 0, moved);
          return { ...c, cards: next };
        }
        return c;
      }),
    );
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (over) {
      const activeIdStr = String(active.id);
      const overIdStr = String(over.id);
      const col = columnIdOf(activeIdStr);
      const overCol = columnIdOf(overIdStr);
      if (col && overCol && col === overCol && activeIdStr !== overIdStr) {
        const cur = columnsRef.current;
        const c = cur.find((x) => x.id === col)!;
        const oldIndex = c.cards.findIndex((x) => x.id === activeIdStr);
        const newIndex = cur.some((x) => x.id === overIdStr)
          ? c.cards.length - 1
          : c.cards.findIndex((x) => x.id === overIdStr);
        if (oldIndex !== newIndex && newIndex >= 0) {
          commit(
            cur.map((x) =>
              x.id === col ? { ...x, cards: arrayMove(x.cards, oldIndex, newIndex) } : x,
            ),
          );
        }
      }
    }
    persist();
  }

  function persist() {
    const order = columnsRef.current.map((c) => ({
      statusId: c.id,
      taskIds: c.cards.map((card) => card.id),
    }));
    startTransition(() => {
      saveBoard(orgId, order)
        .then(poke)
        .catch((err) => console.error("Falha ao salvar o board:", err));
    });
  }

  // --- CRUD ----------------------------------------------------------------
  function upsertCard(dto: BoardTaskDTO) {
    const cur = columnsRef.current;
    const cleaned = cur.map((c) => ({ ...c, cards: c.cards.filter((x) => x.id !== dto.id) }));
    commit(
      cleaned.map((c) => (c.id === dto.statusId ? { ...c, cards: [...c.cards, dto] } : c)),
    );
  }

  async function handleSubmit(input: TaskFormInput) {
    if (!modal) return;
    setSubmitting(true);
    try {
      const dto =
        modal.mode === "create"
          ? await createTaskAction(orgId, input)
          : await updateTaskAction(orgId, modal.task.id, input);
      if (dto) upsertCard(dto);
      setModal(null);
      poke();
    } catch (err) {
      console.error("Falha ao salvar a tarefa:", err);
    } finally {
      setSubmitting(false);
    }
  }

  function updateCommentCount(taskId: string, commentCount: number) {
    commit(
      columnsRef.current.map((c) => ({
        ...c,
        cards: c.cards.map((card) => (card.id === taskId ? { ...card, commentCount } : card)),
      })),
    );
    poke();
  }

  async function handleDelete() {
    if (modal?.mode !== "edit") return;
    const id = modal.task.id;
    setSubmitting(true);
    try {
      await deleteTaskAction(orgId, id);
      commit(columnsRef.current.map((c) => ({ ...c, cards: c.cards.filter((x) => x.id !== id) })));
      setModal(null);
      poke();
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
          statusId: modal?.mode === "create" ? modal.statusId : (columns[0]?.id ?? ""),
          title: "",
          priority: "normal",
          clientId: null,
          dueDate: null,
          assigneeIds: [],
          tags: [],
        };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex h-full gap-5 overflow-x-auto px-4 py-5">
          {columns.map((column) => (
            <Column
              key={column.id}
              column={column}
              onCreate={() => setModal({ mode: "create", statusId: column.id })}
              onEdit={(task) => setModal({ mode: "edit", task })}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeCard ? (
            <div className="w-80 rotate-2 cursor-grabbing">
              <TaskCard card={mapTaskDTO(activeCard)} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {modal && (
        <TaskModal
          mode={modal.mode}
          orgId={orgId}
          currentUserId={data.currentUserId}
          taskId={modal.mode === "edit" ? modal.task.id : undefined}
          columns={columns.map((c) => ({ id: c.id, name: c.name }))}
          clients={data.clients}
          members={data.members}
          initial={modalInitial}
          submitting={submitting}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
          onCommentCountChange={
            modal.mode === "edit"
              ? (count) => updateCommentCount(modal.task.id, count)
              : undefined
          }
        />
      )}
    </>
  );
}

function Column({
  column,
  onCreate,
  onEdit,
}: {
  column: UIColumn;
  onCreate: () => void;
  onEdit: (task: BoardTaskDTO) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <section className="flex w-80 shrink-0 flex-col">
      <div className="mb-3 flex items-center gap-2">
        <span className="size-2.5 rounded-full" style={{ backgroundColor: column.color }} />
        <h2 className="text-dense font-bold uppercase tracking-wide text-foreground">
          {column.name}
        </h2>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-elevated px-1.5 text-[11px] font-semibold text-muted">
          {column.cards.length}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            onClick={onCreate}
            aria-label="Adicionar tarefa"
            className="flex size-6 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-foreground"
          >
            <Plus className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Opções da coluna"
            className="flex size-6 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-foreground"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </div>
      </div>

      <SortableContext items={column.cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            "flex min-h-24 flex-1 flex-col gap-2.5 overflow-y-auto rounded-lg pr-1 transition-colors",
            isOver && "bg-brand/[0.04]",
          )}
        >
          {column.cards.map((card) => (
            <SortableCard key={card.id} card={card} onEdit={onEdit} />
          ))}

          <button
            type="button"
            onClick={onCreate}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 h-9 text-dense font-medium text-muted transition-colors hover:border-brand-40 hover:text-foreground"
          >
            <Plus className="size-4" />
            Nova tarefa
          </button>
        </div>
      </SortableContext>
    </section>
  );
}

function SortableCard({ card, onEdit }: { card: BoardTaskDTO; onEdit: (task: BoardTaskDTO) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("touch-none", isDragging && "opacity-40")}
      onClick={() => {
        if (!isDragging) onEdit(card);
      }}
      {...attributes}
      {...listeners}
    >
      <TaskCard card={mapTaskDTO(card)} />
    </div>
  );
}
