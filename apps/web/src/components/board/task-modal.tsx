"use client";

import * as React from "react";
import { Trash2, X } from "lucide-react";
import { Avatar, Button, Input, cn } from "@wayline/ui";
import type { BoardClientDTO, BoardMemberDTO } from "@wayline/db";
import type { TaskFormInput } from "@/lib/board";

const PRIORITIES: { value: TaskFormInput["priority"]; label: string }[] = [
  { value: "urgent", label: "Urgente" },
  { value: "high", label: "Alta" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Baixa" },
];

const fieldLabel = "text-label uppercase text-subtle";
const selectClass =
  "h-10 w-full rounded-md border border-border bg-surface px-3 text-ui text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export interface TaskModalProps {
  mode: "create" | "edit";
  columns: { id: string; name: string }[];
  clients: BoardClientDTO[];
  members: BoardMemberDTO[];
  initial: TaskFormInput;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (input: TaskFormInput) => void;
  onDelete?: () => void;
}

export function TaskModal({
  mode,
  columns,
  clients,
  members,
  initial,
  submitting,
  onClose,
  onSubmit,
  onDelete,
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
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
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

        <form
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

          <div className="flex items-center justify-between pt-2">
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
              <Button type="submit" disabled={!canSave}>
                {submitting ? "Salvando…" : mode === "create" ? "Criar" : "Salvar"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
