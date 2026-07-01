"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
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
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { MoreHorizontal, Plus } from "lucide-react";
import { cn } from "@wayline/ui";
import type { BoardColumn as BoardColumnType, TaskCard as TaskCardType } from "@/mock/types";
import { TaskCard } from "./task-card";
import { saveBoard } from "@/actions/board";

/** Board Kanban com drag-and-drop (dnd-kit) e persistência no Postgres. */
export function DndBoard({ initialColumns }: { initialColumns: BoardColumnType[] }) {
  const [columns, setColumns] = React.useState(initialColumns);
  const columnsRef = React.useRef(columns);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  const commit = React.useCallback((next: BoardColumnType[]) => {
    columnsRef.current = next;
    setColumns(next);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const columnIdOf = React.useCallback((id: string): string | undefined => {
    const cur = columnsRef.current;
    if (cur.some((c) => c.id === id)) return id;
    return cur.find((c) => c.cards.some((card) => card.id === id))?.id;
  }, []);

  const activeCard: TaskCardType | undefined = React.useMemo(() => {
    if (!activeId) return undefined;
    for (const c of columns) {
      const found = c.cards.find((card) => card.id === activeId);
      if (found) return found;
    }
    return undefined;
  }, [activeId, columns]);

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
      saveBoard(order).catch((err) => console.error("Falha ao salvar o board:", err));
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="flex h-full gap-5 overflow-x-auto px-4 py-5">
        {columns.map((column) => (
          <Column key={column.id} column={column} />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeCard ? (
          <div className="w-80 rotate-2 cursor-grabbing">
            <TaskCard card={activeCard} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({ column }: { column: BoardColumnType }) {
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
            <SortableCard key={card.id} card={card} />
          ))}

          <button
            type="button"
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

function SortableCard({ card }: { card: TaskCardType }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("touch-none", isDragging && "opacity-40")}
      {...attributes}
      {...listeners}
    >
      <TaskCard card={card} />
    </div>
  );
}
