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
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Input, cn } from "@wayline/ui";
import type { BoardData, BoardTaskDTO } from "@wayline/db";
import { TaskCard } from "./task-card";
import { TaskModal } from "./task-modal";
import {
  clearApprovalAction,
  createColumnAction,
  createTaskAction,
  deleteColumnAction,
  deleteTaskAction,
  duplicateTaskAction,
  refreshCardAction,
  renameColumnAction,
  saveBoard,
  setColumnColorAction,
  updateTaskAction,
} from "@/actions/board";
import { dtoToForm, mapTaskDTO, type TaskFormInput } from "@/lib/board";
import { pokeList } from "@/actions/live";

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
  const router = useRouter();

  function addColumn(name: string) {
    commit([...columnsRef.current, { id: `tmp-${Date.now()}`, name, color: "#94A3B8", cards: [] }]);
    startTransition(async () => {
      await createColumnAction(orgId, data.listId, name);
      router.refresh();
      poke();
    });
  }
  function renameColumn(id: string, name: string) {
    commit(columnsRef.current.map((c) => (c.id === id ? { ...c, name } : c)));
    startTransition(async () => {
      await renameColumnAction(orgId, id, name);
      poke();
    });
  }
  function recolorColumn(id: string, color: string) {
    commit(columnsRef.current.map((c) => (c.id === id ? { ...c, color } : c)));
    startTransition(async () => {
      await setColumnColorAction(orgId, id, color);
      poke();
    });
  }
  function deleteColumn(id: string) {
    commit(columnsRef.current.filter((c) => c.id !== id));
    startTransition(async () => {
      await deleteColumnAction(orgId, id);
      router.refresh();
      poke();
    });
  }

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

  function updateSubtaskCount(taskId: string, subtaskDone: number, subtaskTotal: number) {
    commit(
      columnsRef.current.map((c) => ({
        ...c,
        cards: c.cards.map((card) =>
          card.id === taskId ? { ...card, subtaskDone, subtaskTotal } : card,
        ),
      })),
    );
    poke();
  }

  function updateAttachmentCount(taskId: string, attachmentCount: number) {
    commit(
      columnsRef.current.map((c) => ({
        ...c,
        cards: c.cards.map((card) =>
          card.id === taskId ? { ...card, attachmentCount } : card,
        ),
      })),
    );
    poke();
  }

  function updateTrackedSeconds(taskId: string, trackedSeconds: number) {
    commit(
      columnsRef.current.map((c) => ({
        ...c,
        cards: c.cards.map((card) =>
          card.id === taskId ? { ...card, trackedSeconds } : card,
        ),
      })),
    );
    poke();
  }

  async function handleDependenciesChange(taskId: string) {
    const dto = await refreshCardAction(orgId, taskId).catch(() => null);
    if (!dto) return;
    commit(
      columnsRef.current.map((c) => ({
        ...c,
        cards: c.cards.map((card) =>
          card.id === taskId ? { ...card, blocked: dto.blocked } : card,
        ),
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

  async function handleDuplicate() {
    if (modal?.mode !== "edit") return;
    setSubmitting(true);
    try {
      const dto = await duplicateTaskAction(orgId, modal.task.id);
      if (dto) upsertCard(dto);
      setModal(null);
      poke();
    } catch (err) {
      console.error("Falha ao duplicar a tarefa:", err);
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
          description: "",
          priority: "normal",
          clientId: null,
          startDate: null,
          dueDate: null,
          estimateHours: "",
          recurrence: "",
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
              canDelete={columns.length > 1}
              onCreate={() => setModal({ mode: "create", statusId: column.id })}
              onEdit={(task) => setModal({ mode: "edit", task })}
              onRename={(name) => renameColumn(column.id, name)}
              onRecolor={(color) => recolorColumn(column.id, color)}
              onDelete={() => deleteColumn(column.id)}
            />
          ))}
          <AddColumn onAdd={addColumn} />
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
          onDuplicate={modal.mode === "edit" ? handleDuplicate : undefined}
          onCommentCountChange={
            modal.mode === "edit"
              ? (count) => updateCommentCount(modal.task.id, count)
              : undefined
          }
          onSubtaskCountChange={
            modal.mode === "edit"
              ? (done, total) => updateSubtaskCount(modal.task.id, done, total)
              : undefined
          }
          onAttachmentCountChange={
            modal.mode === "edit"
              ? (count) => updateAttachmentCount(modal.task.id, count)
              : undefined
          }
          onDependenciesChange={
            modal.mode === "edit"
              ? () => handleDependenciesChange(modal.task.id)
              : undefined
          }
          onTrackedChange={
            modal.mode === "edit"
              ? (seconds) => updateTrackedSeconds(modal.task.id, seconds)
              : undefined
          }
          approvalStatus={modal.mode === "edit" ? modal.task.approvalStatus : null}
          approvalBy={modal.mode === "edit" ? modal.task.approvalBy : null}
          approvalAt={modal.mode === "edit" ? modal.task.approvalAt : null}
          onClearApproval={
            modal.mode === "edit"
              ? async () => {
                  const dto = await clearApprovalAction(orgId, modal.task.id).catch(() => null);
                  if (dto) {
                    upsertCard(dto);
                    setModal({ mode: "edit", task: dto });
                    poke();
                  }
                }
              : undefined
          }
        />
      )}
    </>
  );
}

function AddColumn({ onAdd }: { onAdd: (name: string) => void }) {
  const [adding, setAdding] = React.useState(false);
  const [name, setName] = React.useState("");
  function submit() {
    const v = name.trim();
    if (v) onAdd(v);
    setName("");
    setAdding(false);
  }
  return (
    <div className="w-72 shrink-0">
      {adding ? (
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => (name.trim() ? submit() : setAdding(false))}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            else if (e.key === "Escape") {
              setName("");
              setAdding(false);
            }
          }}
          placeholder="Nome da coluna"
          className="h-9"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex h-10 w-full items-center gap-1.5 rounded-lg border border-dashed border-border px-3 text-dense font-medium text-muted transition-colors hover:border-brand-40 hover:text-foreground"
        >
          <Plus className="size-4" /> Coluna
        </button>
      )}
    </div>
  );
}

const COLUMN_COLORS = [
  "#94A3B8",
  "#1D66FF",
  "#17C86A",
  "#FFB800",
  "#FF3B30",
  "#7C5CFF",
  "#0EA5E9",
  "#EC4899",
];

function Column({
  column,
  canDelete,
  onCreate,
  onEdit,
  onRename,
  onRecolor,
  onDelete,
}: {
  column: UIColumn;
  canDelete: boolean;
  onCreate: () => void;
  onEdit: (task: BoardTaskDTO) => void;
  onRename: (name: string) => void;
  onRecolor: (color: string) => void;
  onDelete: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(column.name);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  function commitRename() {
    const v = name.trim();
    setEditing(false);
    if (v && v !== column.name) onRename(v);
    else setName(column.name);
  }

  return (
    <section className="flex w-80 shrink-0 flex-col">
      <div className="mb-3 flex items-center gap-2">
        <span className="size-2.5 rounded-full" style={{ backgroundColor: column.color }} />
        {editing ? (
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              else if (e.key === "Escape") {
                setName(column.name);
                setEditing(false);
              }
            }}
            className="h-6 flex-1 text-dense font-bold uppercase"
          />
        ) : (
          <h2
            className="cursor-text text-dense font-bold uppercase tracking-wide text-foreground"
            onDoubleClick={() => setEditing(true)}
            title="Duplo clique para renomear"
          >
            {column.name}
          </h2>
        )}
        <span className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-elevated px-1.5 text-[11px] font-semibold text-muted">
          {column.cards.length}
        </span>
        <div className="relative ml-auto flex items-center gap-0.5" ref={menuRef}>
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
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Opções da coluna"
            className="flex size-6 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-foreground"
          >
            <MoreHorizontal className="size-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-7 z-20 w-44 rounded-lg border border-border bg-surface p-1 shadow-lg">
              <div className="flex flex-wrap gap-1.5 px-2 py-2">
                {COLUMN_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onRecolor(c);
                    }}
                    aria-label={`Cor ${c}`}
                    className={cn(
                      "size-5 rounded-full border-2 transition-transform hover:scale-110",
                      column.color === c ? "border-foreground" : "border-transparent",
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setName(column.name);
                  setEditing(true);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 h-8 text-dense text-foreground hover:bg-elevated"
              >
                <Pencil className="size-3.5" /> Renomear
              </button>
              <button
                type="button"
                disabled={!canDelete}
                onClick={() => {
                  setMenuOpen(false);
                  if (
                    canDelete &&
                    confirm("Excluir a coluna? As tarefas dela vão para a primeira coluna.")
                  )
                    onDelete();
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 h-8 text-dense text-danger hover:bg-danger/10 disabled:opacity-40"
              >
                <Trash2 className="size-3.5" /> Excluir
              </button>
            </div>
          )}
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
