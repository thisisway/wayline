"use client";

import * as React from "react";
import { CheckSquare, Copy, Plus, Square, Trash2, UserPlus, X } from "lucide-react";
import { Avatar, Button, Input, cn } from "@wayline/ui";
import type {
  ActivityDTO,
  BoardClientDTO,
  BoardMemberDTO,
  CommentDTO,
  Subtask,
} from "@wayline/db";
import type { TaskFormInput } from "@/lib/board";
import { AttachmentsSection } from "@/components/board/attachments-section";
import { DependenciesSection } from "@/components/board/dependencies-section";
import { TimeTrackingSection } from "@/components/board/time-tracking-section";
import { MentionComposer, renderWithMentions } from "@/components/board/mention-composer";
import { CustomFieldsSection } from "@/components/board/custom-fields-section";
import {
  addCommentAction,
  addSubtaskAction,
  assignCommentAction,
  deleteCommentAction,
  deleteSubtaskAction,
  listActivityAction,
  listCommentsAction,
  listSubtasksAction,
  toggleSubtaskAction,
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
  onDuplicate?: () => void;
  onCommentCountChange?: (count: number) => void;
  onSubtaskCountChange?: (done: number, total: number) => void;
  onAttachmentCountChange?: (count: number) => void;
  onDependenciesChange?: () => void;
  onTrackedChange?: (seconds: number) => void;
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
  onDuplicate,
  onCommentCountChange,
  onSubtaskCountChange,
  onAttachmentCountChange,
  onDependenciesChange,
  onTrackedChange,
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

            <div className="space-y-1.5">
              <label className={fieldLabel} htmlFor="task-desc">
                Descrição
              </label>
              <textarea
                id="task-desc"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Detalhes, contexto, links…"
                rows={3}
                className="w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-ui text-foreground placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-brand"
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
                <label className={fieldLabel} htmlFor="task-start">
                  Início
                </label>
                <Input
                  id="task-start"
                  type="date"
                  value={form.startDate ?? ""}
                  onChange={(e) => set("startDate", e.target.value || null)}
                />
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

          {mode === "edit" && taskId && <CustomFieldsSection orgId={orgId} taskId={taskId} />}

          {mode === "edit" && taskId && (
            <SubtasksSection orgId={orgId} taskId={taskId} onCountsChange={onSubtaskCountChange} />
          )}

          {mode === "edit" && taskId && (
            <DependenciesSection orgId={orgId} taskId={taskId} onChange={onDependenciesChange} />
          )}

          {mode === "edit" && taskId && (
            <TimeTrackingSection orgId={orgId} taskId={taskId} onTrackedChange={onTrackedChange} />
          )}

          {mode === "edit" && taskId && (
            <AttachmentsSection
              orgId={orgId}
              taskId={taskId}
              onCountChange={onAttachmentCountChange}
            />
          )}

          {mode === "edit" && taskId && (
            <CommentsSection
              orgId={orgId}
              taskId={taskId}
              currentUserId={currentUserId}
              members={members}
              onCountChange={onCommentCountChange}
            />
          )}

          {mode === "edit" && taskId && <ActivitySection orgId={orgId} taskId={taskId} />}
        </div>

        <div className="flex items-center justify-between border-t border-border px-5 py-3.5">
          {mode === "edit" ? (
            <div className="flex gap-1">
              {onDelete && (
                <Button type="button" variant="ghost" onClick={onDelete} disabled={submitting}>
                  <Trash2 className="size-4 text-danger" />
                  Excluir
                </Button>
              )}
              {onDuplicate && (
                <Button type="button" variant="ghost" onClick={onDuplicate} disabled={submitting}>
                  <Copy className="size-4" />
                  Duplicar
                </Button>
              )}
            </div>
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

function SubtasksSection({
  orgId,
  taskId,
  onCountsChange,
}: {
  orgId: string;
  taskId: string;
  onCountsChange?: (done: number, total: number) => void;
}) {
  const [subs, setSubs] = React.useState<Subtask[] | null>(null);
  const [title, setTitle] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    listSubtasksAction(orgId, taskId).then((s) => alive && setSubs(s));
    return () => {
      alive = false;
    };
  }, [orgId, taskId]);

  function emit(list: Subtask[]) {
    onCountsChange?.(list.filter((s) => s.completed).length, list.length);
  }

  async function add() {
    const text = title.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const created = await addSubtaskAction(orgId, taskId, text);
      if (!created) return;
      const next = [...(subs ?? []), created];
      setSubs(next);
      setTitle("");
      emit(next);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(s: Subtask) {
    const next = (subs ?? []).map((x) => (x.id === s.id ? { ...x, completed: !x.completed } : x));
    setSubs(next);
    emit(next);
    await toggleSubtaskAction(orgId, s.id, !s.completed).catch(() => {});
  }

  async function remove(id: string) {
    const next = (subs ?? []).filter((x) => x.id !== id);
    setSubs(next);
    emit(next);
    await deleteSubtaskAction(orgId, id).catch(() => {});
  }

  const done = (subs ?? []).filter((s) => s.completed).length;
  const total = subs?.length ?? 0;

  return (
    <div className="border-t border-border px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <span className={fieldLabel}>Subtarefas {total > 0 ? `(${done}/${total})` : ""}</span>
        {total > 0 && (
          <div className="h-1.5 w-24 overflow-hidden rounded-pill bg-elevated">
            <div
              className="h-full rounded-pill bg-success transition-all"
              style={{ width: `${total ? (done / total) * 100 : 0}%` }}
            />
          </div>
        )}
      </div>

      <div className="space-y-1">
        {subs === null ? (
          <p className="text-dense text-subtle">Carregando…</p>
        ) : (
          subs.map((s) => (
            <div key={s.id} className="group flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggle(s)}
                aria-label={s.completed ? "Desmarcar" : "Concluir"}
                className={cn(s.completed ? "text-success" : "text-subtle hover:text-foreground")}
              >
                {s.completed ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
              </button>
              <span
                className={cn(
                  "flex-1 text-ui",
                  s.completed ? "text-subtle line-through" : "text-foreground",
                )}
              >
                {s.title}
              </span>
              <button
                type="button"
                onClick={() => remove(s.id)}
                aria-label="Excluir subtarefa"
                className="text-subtle opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void add();
            }
          }}
          placeholder="Adicionar subtarefa…"
          className="h-9"
        />
        <Button
          type="button"
          size="icon"
          variant="secondary"
          onClick={() => void add()}
          disabled={!title.trim() || busy}
          aria-label="Adicionar subtarefa"
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
  members,
  onCountChange,
}: {
  orgId: string;
  taskId: string;
  currentUserId: string | null;
  members: BoardMemberDTO[];
  onCountChange?: (count: number) => void;
}) {
  const [comments, setComments] = React.useState<CommentDTO[] | null>(null);
  const [posting, setPosting] = React.useState(false);
  const [assigningId, setAssigningId] = React.useState<string | null>(null);
  const [replyingTo, setReplyingTo] = React.useState<string | null>(null);

  const reload = React.useCallback(() => {
    listCommentsAction(orgId, taskId).then(setComments);
  }, [orgId, taskId]);

  React.useEffect(() => {
    let alive = true;
    listCommentsAction(orgId, taskId).then((c) => alive && setComments(c));
    return () => {
      alive = false;
    };
  }, [orgId, taskId]);

  async function assign(commentId: string, userId: string | null) {
    setAssigningId(null);
    await assignCommentAction(orgId, commentId, userId).catch(() => {});
    reload();
  }

  async function post(text: string, mentionIds: string[]) {
    if (!text || !currentUserId || posting) return;
    setPosting(true);
    try {
      const created = await addCommentAction(orgId, taskId, text, null, mentionIds);
      if (!created) return;
      const next = [...(comments ?? []), created];
      setComments(next);
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

  async function postReply(parentId: string, text: string, mentionIds: string[]) {
    if (!text || !currentUserId) return;
    try {
      const created = await addCommentAction(orgId, taskId, text, parentId, mentionIds);
      if (!created) return;
      const next = [...(comments ?? []), created];
      setComments(next);
      setReplyingTo(null);
      onCountChange?.(next.length);
    } catch (err) {
      console.error("Falha ao responder:", err);
    }
  }

  function renderComment(c: CommentDTO) {
    return (
      <div className="group flex gap-2.5">
        <Avatar name={c.author.name} src={c.author.avatarUrl ?? undefined} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-dense font-semibold text-foreground">{c.author.name}</span>
            <span className="text-[11px] text-subtle">{timeAgo(c.createdAt)}</span>
            <div className="relative ml-auto flex items-center gap-1">
              {c.assignedTo ? (
                <button
                  type="button"
                  onClick={() => setAssigningId(assigningId === c.id ? null : c.id)}
                  title={`Atribuído a ${c.assignedTo.name}`}
                >
                  <Avatar
                    name={c.assignedTo.name}
                    src={c.assignedTo.avatarUrl ?? undefined}
                    size="xs"
                  />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setAssigningId(assigningId === c.id ? null : c.id)}
                  aria-label="Atribuir comentário"
                  className="text-subtle opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                >
                  <UserPlus className="size-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => remove(c.id)}
                aria-label="Excluir comentário"
                className="text-subtle opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>

              {assigningId === c.id && (
                <div className="absolute right-0 top-6 z-10 w-44 rounded-lg border border-border bg-surface p-1 shadow-lg">
                  {c.assignedTo && (
                    <button
                      type="button"
                      onClick={() => assign(c.id, null)}
                      className="flex w-full items-center gap-2 rounded-md px-2 h-8 text-dense text-muted hover:bg-elevated"
                    >
                      <X className="size-3.5" /> Remover atribuição
                    </button>
                  )}
                  {members.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => assign(c.id, m.id)}
                      className="flex w-full items-center gap-2 rounded-md px-2 h-8 text-dense text-foreground hover:bg-elevated"
                    >
                      <Avatar name={m.name} src={m.avatarUrl ?? undefined} size="xs" />
                      <span className="truncate">{m.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <p className="whitespace-pre-wrap text-ui text-muted">
            {renderWithMentions(c.body, members)}
          </p>
        </div>
      </div>
    );
  }

  const topLevel = (comments ?? []).filter((c) => !c.parentId);
  const repliesByParent = new Map<string, CommentDTO[]>();
  for (const c of comments ?? []) {
    if (c.parentId) {
      const arr = repliesByParent.get(c.parentId);
      if (arr) arr.push(c);
      else repliesByParent.set(c.parentId, [c]);
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
        ) : topLevel.length === 0 ? (
          <p className="text-dense text-subtle">Nenhum comentário ainda.</p>
        ) : (
          topLevel.map((c) => (
            <div key={c.id}>
              {renderComment(c)}

              {(repliesByParent.get(c.id)?.length ?? 0) > 0 && (
                <div className="ml-8 mt-2 space-y-2 border-l border-border pl-3">
                  {repliesByParent.get(c.id)!.map((r) => (
                    <div key={r.id}>{renderComment(r)}</div>
                  ))}
                </div>
              )}

              {replyingTo === c.id ? (
                <div className="ml-8 mt-2">
                  <MentionComposer
                    small
                    autoFocus
                    members={members}
                    placeholder="Responder… (@ para mencionar)"
                    onPost={(text, ids) => void postReply(c.id, text, ids)}
                  />
                </div>
              ) : (
                currentUserId && (
                  <button
                    type="button"
                    onClick={() => setReplyingTo(c.id)}
                    className="ml-8 mt-1 text-[11px] font-medium text-subtle hover:text-brand"
                  >
                    Responder
                  </button>
                )
              )}
            </div>
          ))
        )}
      </div>

      <div className="mt-3">
        <MentionComposer
          members={members}
          placeholder={currentUserId ? "Escreva um comentário… (@ para mencionar)" : "Sem usuário para comentar"}
          disabled={!currentUserId || posting}
          onPost={(text, ids) => void post(text, ids)}
        />
      </div>
    </div>
  );
}

function activityPhrase(a: ActivityDTO): React.ReactNode {
  const d = a.detail;
  switch (a.action) {
    case "created":
      return "criou a tarefa";
    case "title":
      return <>renomeou · {d}</>;
    case "priority":
      return <>prioridade: {d}</>;
    case "completed":
      return d === "Concluída" ? "concluiu a tarefa" : "reabriu a tarefa";
    case "due":
      return <>prazo: {d}</>;
    case "client":
      return <>cliente: {d}</>;
    case "status":
      return <>moveu · {d}</>;
    case "assignees":
      return <>responsáveis · {d}</>;
    default:
      return d ?? a.action;
  }
}

function ActivitySection({ orgId, taskId }: { orgId: string; taskId: string }) {
  const [items, setItems] = React.useState<ActivityDTO[] | null>(null);

  React.useEffect(() => {
    let alive = true;
    listActivityAction(orgId, taskId).then((a) => alive && setItems(a));
    return () => {
      alive = false;
    };
  }, [orgId, taskId]);

  return (
    <div className="border-t border-border px-5 py-4">
      <span className={cn(fieldLabel, "mb-3 block")}>
        Atividade {items && items.length > 0 ? `(${items.length})` : ""}
      </span>
      {items === null ? (
        <p className="text-dense text-subtle">Carregando…</p>
      ) : items.length === 0 ? (
        <p className="text-dense text-subtle">Sem atividade registrada.</p>
      ) : (
        <div className="space-y-2.5">
          {items
            .slice()
            .reverse()
            .map((a) => (
              <div key={a.id} className="flex gap-2.5 text-dense">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-border" />
                <p className="text-muted">
                  <span className="font-semibold text-foreground">{a.actorName}</span>{" "}
                  {activityPhrase(a)}
                  <span className="ml-1.5 text-[11px] text-subtle">{timeAgo(a.createdAt)}</span>
                </p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
