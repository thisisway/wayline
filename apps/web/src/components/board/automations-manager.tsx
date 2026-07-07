"use client";

import * as React from "react";
import { ArrowRight, Plus, Trash2, X, Zap } from "lucide-react";
import type {
  AutomationActionType,
  AutomationDTO,
  AutomationTriggerType,
  BoardMemberDTO,
} from "@wayline/db";
import { Button, cn } from "@wayline/ui";
import {
  createAutomationAction,
  deleteAutomationAction,
  listAutomationsAction,
} from "@/actions/automations";

const PRIORITIES = [
  { value: "urgent", label: "Urgente" },
  { value: "high", label: "Alta" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Baixa" },
];

const selectClass =
  "h-10 rounded-md border border-border bg-surface px-2 text-dense text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AutomationsManager({
  orgId,
  listId,
  listName,
  columns,
  members,
  onClose,
}: {
  orgId: string;
  listId: string;
  listName: string;
  columns: { id: string; name: string }[];
  members: BoardMemberDTO[];
  onClose: () => void;
}) {
  const [rules, setRules] = React.useState<AutomationDTO[] | null>(null);
  const [triggerType, setTriggerType] = React.useState<AutomationTriggerType>("status");
  const [statusId, setStatusId] = React.useState(columns[0]?.id ?? "");
  const [actionType, setActionType] = React.useState<AutomationActionType>("assign");
  const [actionValue, setActionValue] = React.useState(members[0]?.id ?? "");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    listAutomationsAction(orgId, listId)
      .then(setRules)
      .catch(() => {
        setRules([]);
        setError("Não foi possível carregar as automações. Tente novamente.");
      });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [orgId, listId, onClose]);

  // Ao trocar o tipo de ação, reseta o valor para uma opção válida.
  React.useEffect(() => {
    setActionValue(
      actionType === "assign"
        ? (members[0]?.id ?? "")
        : actionType === "move"
          ? (columns[0]?.id ?? "")
          : "normal",
    );
  }, [actionType, members, columns]);

  async function add() {
    if (!actionValue || (triggerType === "status" && !statusId) || busy) return;
    setBusy(true);
    try {
      const ok = await createAutomationAction(
        orgId,
        listId,
        triggerType,
        triggerType === "status" ? statusId : null,
        actionType,
        actionValue,
      );
      if (ok) listAutomationsAction(orgId, listId).then(setRules);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setRules((r) => (r ?? []).filter((x) => x.id !== id));
    await deleteAutomationAction(orgId, id).catch(() => {});
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div>
            <h2 className="flex items-center gap-2 font-display text-h3 font-bold">
              <Zap className="size-4 text-brand" /> Automações
            </h2>
            <p className="text-dense text-subtle">{listName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-7 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {error && <p className="mb-3 text-dense text-danger">{error}</p>}
          <div className="space-y-1.5">
            {rules === null ? (
              <p className="text-dense text-subtle">Carregando…</p>
            ) : rules.length === 0 ? (
              <p className="py-2 text-dense text-subtle">Nenhuma automação ainda.</p>
            ) : (
              rules.map((r) => (
                <div
                  key={r.id}
                  className="group flex items-center gap-2 rounded-md bg-elevated/60 px-3 py-2 text-dense"
                >
                  <span className="text-subtle">Quando</span>
                  <span className="font-semibold text-foreground">{r.triggerLabel}</span>
                  <ArrowRight className="size-3.5 shrink-0 text-subtle" />
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    {r.actionType === "assign"
                      ? "Atribuir a "
                      : r.actionType === "move"
                        ? "Mover para "
                        : "Prioridade "}
                    <span className="font-semibold">{r.actionLabel}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    aria-label="Excluir automação"
                    className="text-subtle opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 space-y-2 border-t border-border pt-4">
            <span className="text-label uppercase text-subtle">Nova automação</span>
            <p className="text-dense text-subtle">Quando…</p>
            <div className="flex gap-2">
              <select
                className={cn(selectClass, triggerType === "status" ? "w-56" : "flex-1")}
                value={triggerType}
                onChange={(e) => setTriggerType(e.target.value as AutomationTriggerType)}
              >
                <option value="status">A tarefa entrar numa coluna</option>
                <option value="approved">O cliente aprovar</option>
                <option value="changes">O cliente pedir ajustes</option>
              </select>
              {triggerType === "status" && (
                <select
                  className={cn(selectClass, "flex-1")}
                  value={statusId}
                  onChange={(e) => setStatusId(e.target.value)}
                >
                  {columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <p className="text-dense text-subtle">Então…</p>
            <div className="flex gap-2">
              <select
                className={cn(selectClass, "w-40")}
                value={actionType}
                onChange={(e) => setActionType(e.target.value as AutomationActionType)}
              >
                <option value="assign">Atribuir a</option>
                <option value="priority">Definir prioridade</option>
                <option value="move">Mover para</option>
              </select>
              <select
                className={cn(selectClass, "flex-1")}
                value={actionValue}
                onChange={(e) => setActionValue(e.target.value)}
              >
                {actionType === "assign"
                  ? members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))
                  : actionType === "move"
                    ? columns.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))
                    : PRIORITIES.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
              </select>
            </div>

            <Button
              type="button"
              onClick={add}
              disabled={(triggerType === "status" && !statusId) || !actionValue || busy}
              className="w-full gap-1.5"
            >
              <Plus className="size-4" />
              Adicionar automação
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
