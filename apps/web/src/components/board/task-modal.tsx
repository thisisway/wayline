"use client";

import * as React from "react";
import { Plus, Send, Trash2, X } from "lucide-react";
import { Avatar, Button, Input, cn } from "@wayline/ui";
import type { BoardClientDTO, BoardMemberDTO, CommentDTO } from "@wayline/db";
import type { TaskFormInput } from "@/lib/board";
import {
  addCommentAction,
  deleteCommentAction,
  listCommentsAction,
} from "@/actions/board";

const PRIORITIES: { value: TaskFormInput["priority"]; label: string }[] = [
  { value: "urgent", label: "Urgente" },
  { value: "high", label: "Alta" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Baixa" },
];

const fieldLabel = "text-label uppercase text-subtle";
const selectClass =
  "h-10 w-full rounded-md border border-border bg-surface px-3 text-ui text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function timeAgo(value: Date): string {
  const s = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (s < 60) return "agora";
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

export interface TaskModalProps {
  mode: "create" | "edit";
  orgId: string;
  currentUserId: string | null;
  taskId?: string;
  columns: { id: string; name: string }[];
  clients: BoardClientDTO[];
  members: BoardMemberDTO[];
  initial: TaskFormInput;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (input: TaskFormInput) => void;
  onDelete?: () => void;
  onCommentCountChange?: (count: number) => void;
}

export function TaskModal({
  mode,
  orgId,
  currentUserId,
  taskId,
  columns,
  clients,
  members,
  initial,
  submitting,
  onClose,
  onSubmit,
  onDelete,
  onCommentCountChange,
}: TaskModalProps) {
  const [form, setForm] = React.useState<TaskFormInput>(initial);
  const set = <K extends keyof TaskFormInput>(key: K, value: TaskFormInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canSave = form.title.trim().length > 0 && form.statusId.length > 0 && !submitting;

  function toggleAssignee(id: string) {
    setForm((f) => ({
      ...f,
      assigneeIds: f.assigneeIds.includes(id)
        ? f.assigneeIds.filter((x) => x !== id)
        : [...f.assigneeIds, id],
    }));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="font-display text-h3 font-bold">
            {mode === "create" ? "Nova tarefa" : "Editar tarefa"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-7 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <form
            id="task-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (canSave) onSubmit({ ...form, title: form.title.trim() });
            }}
            className="space-y-4 p-5"
          >
            <div className="space-y-1.5">
              <label className={fieldLabel} htmlFor="task-title">
                Título
              </label>
              <Input
                id="task-title"
                autoFocus
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="O que precisa ser feito?"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={fieldLabel} htmlFor="task-status">
                  Coluna
                </label>
                <select
                  id="task-status"
                  className={selectClass}
                  value={form.statusId}
                  onChange={(e) => set("statusId", e.target.value)}
                >
                  {columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className={fieldLabel} htmlFor="task-priority">
                  Prioridade
                </label>
                <select
                  id="task-priority"
                  className={selectClass}
                  value={form.priority}
                  onChange={(e) => set("priority", e.target.value as TaskFormInput["priority"])}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className={fieldLabel} htmlFor="task-client">
                  Cliente
                </label>
                <select
                  id="task-client"
                  className={selectClass}
                  value={form.clientId ?? ""}
                  onChange={(e) => set("clientId", e.target.value || null)}
                >
                  <option value="">Sem cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className={fieldLabel} htmlFor="task-due">
                  Prazo
                </label>
                <Input
                  id="task-due"
                  type="date"
                  value={form.dueDate ?? ""}
                  onChange={(e) => set("dueDate", e.target.value || null)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className={fieldLabel}>Responsáveis</span>
              <div className="flex flex-wrap gap-1.5">
                {members.map((m) => {
                  const active = form.assigneeIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleAssignee(m.id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-pill border py-1 pl-1 pr-2.5 text-dense transition-colors",
                        active
                          ? "border-brand bg-brand/15 text-brand"
                          : "border-border text-muted hover:bg-elevated",
                      )}
                    >
                      <Avatar name={m.name} src={m.avatarUrl ?? undefined} size="xs" />
                      {m.name.split(" ")[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            <TagsEditor tags={form.tags} onChange={(tags) => set("tags", tags)} />
          </form>

          {mode === "edit" && taskId && (
            <CommentsSection
              orgId={orgId}
              taskId={taskId}
              currentUserId={currentUserId}
              onCountChange={onCommentCountChange}
            />
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-3.5">
          {mode === "edit" && onDelete ? (
            <Button type="button" variant="ghost" onClick={onDelete} disabled={submitting}>
              <Trash2 className="size-4 text-danger" />
              Excluir
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" form="task-form" disabled={!canSave}>
              {submitting ? "Salvando…" : mode === "create" ? "Criar" : "Salvar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

const TAG_COLORS = ["#1D66FF", "#17C86A", "#FFB800", "#FF3B30", "#7C5CFF", "#0EA5E9"];

function TagsEditor({
  tags,
  onChange,
}: {
  tags: Array<{ label: string; color: string }>;
  onChange: (tags: Array<{ label: string; color: string }>) => void;
}) {
  const [label, setLabel] = React.useState("");
  const [color, setColor] = React.useState<string>(TAG_COLORS[0]!);

  function add() {
    const l = label.trim();
    if (!l) return;
    if (!tags.some((t) => t.label.toLowerCase() === l.toLowerCase())) {
      onChange([...tags, { label: l, color }]);
    }
    setLabel("");
  }

  return (
    <div className="space-y-1.5">
      <span className={fieldLabel}>Tags</span>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t, i) => (
            <span
              key={`${t.label}-${i}`}
              className="inline-flex items-center gap-1 rounded-pill px-2 h-6 text-[11px] font-semibold"
              style={{ backgroundColor: `${t.color}22`, color: t.color }}
            >
              {t.label}
              <button
                type="button"
                onClick={() => onChange(tags.filter((_, idx) => idx !== i))}
                aria-label={`Remover ${t.label}`}
                className="hover:opacity-70"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {TAG_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Cor ${c}`}
              className={cn(
                "size-5 rounded-full border-2 transition-transform",
                color === c ? "border-foreground scale-110" : "border-transparent",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Nova tag…"
          className="h-9"
        />
        <Button
          type="button"
          size="icon"
          variant="secondary"
          onClick={add}
          disabled={!label.trim()}
          aria-label="Adicionar tag"
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}

function CommentsSection({
  orgId,
  taskId,
  currentUserId,
  onCountChange,
}: {
  orgId: string;
  taskId: string;
  currentUserId: string | null;
  onCountChange?: (count: number) => void;
}) {
  const [comments, setComments] = React.useState<CommentDTO[] | null>(null);
  const [body, setBody] = React.useState("");
  const [posting, setPosting] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    listCommentsAction(orgId, taskId).then((c) => alive && setComments(c));
    return () => {
      alive = false;
    };
  }, [orgId, taskId]);

  async function post() {
    const text = body.trim();
    if (!text || !currentUserId || posting) return;
    setPosting(true);
    try {
      const created = await addCommentAction(orgId, taskId, currentUserId, text);
      const next = [...(comments ?? []), created];
      setComments(next);
      setBody("");
      onCountChange?.(next.length);
    } catch (err) {
      console.error("Falha ao comentar:", err);
    } finally {
      setPosting(false);
    }
  }

  async function remove(id: string) {
    try {
      await deleteCommentAction(orgId, id);
      const next = (comments ?? []).filter((c) => c.id !== id);
      setComments(next);
      onCountChange?.(next.length);
    } catch (err) {
      console.error("Falha ao excluir comentário:", err);
    }
  }

  return (
    <div className="border-t border-border px-5 py-4">
      <span className={cn(fieldLabel, "mb-3 block")}>
        Comentários {comments ? `(${comments.length})` : ""}
      </span>

      <div className="space-y-3">
        {comments === null ? (
          <p className="text-dense text-subtle">Carregando…</p>
        ) : comments.length === 0 ? (
          <p className="text-dense text-subtle">Nenhum comentário ainda.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="group flex gap-2.5">
              <Avatar name={c.author.name} src={c.author.avatarUrl ?? undefined} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-dense font-semibold text-foreground">
                    {c.author.name}
                  </span>
                  <span className="text-[11px] text-subtle">{timeAgo(c.createdAt)}</span>
                  <button
                    type="button"
                    onClick={() => remove(c.id)}
                    aria-label="Excluir comentário"
                    className="ml-auto text-subtle opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <p className="whitespace-pre-wrap text-ui text-muted">{c.body}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void post();
            }
          }}
          placeholder={currentUserId ? "Escreva um comentário…" : "Sem usuário para comentar"}
          disabled={!currentUserId || posting}
        />
        <Button
          type="button"
          size="icon"
          onClick={() => void post()}
          disabled={!currentUserId || posting || body.trim().length === 0}
          aria-label="Comentar"
        >
          <Send />
        </Button>
      </div>
    </div>
  );
}
