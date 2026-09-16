"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@wayline/ui";
import type { ProposalListItem, ProposalStage } from "@wayline/db";
import { listProposalsAction, moveProposalStageAction } from "@/actions/proposals";

/** Colunas do funil (rótulos/cores só do cliente; ordem = ordem visual). */
const STAGES: { key: ProposalStage; label: string; color: string }[] = [
  { key: "lead", label: "Lead", color: "#94A3B8" },
  { key: "qualificado", label: "Qualificado", color: "#0EA5E9" },
  { key: "proposta", label: "Proposta", color: "#7C5CFF" },
  { key: "ganho", label: "Ganho", color: "#17C86A" },
  { key: "perdido", label: "Perdido", color: "#FF3B30" },
];

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function SalesFunnel({
  orgId,
  canEdit,
  onOpenProposal,
  onClose,
}: {
  orgId: string;
  canEdit: boolean;
  onOpenProposal: (id: string) => void;
  onClose: () => void;
}) {
  const [rows, setRows] = React.useState<ProposalListItem[] | null>(null);
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [over, setOver] = React.useState<ProposalStage | null>(null);

  React.useEffect(() => {
    listProposalsAction(orgId)
      .then(setRows)
      .catch(() => setRows([]));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [orgId, onClose]);

  function move(id: string, stage: ProposalStage) {
    setRows((rs) => rs?.map((r) => (r.id === id ? { ...r, stage } : r)) ?? rs);
    void moveProposalStageAction(orgId, id, stage).catch(() => {});
  }

  const byStage = (key: ProposalStage) => (rows ?? []).filter((r) => r.stage === key);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex h-[86vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div>
            <h2 className="font-display text-h3 font-bold">Funil de vendas</h2>
            <p className="text-dense text-subtle">
              Arraste as oportunidades entre as etapas. Clique para abrir a proposta.
            </p>
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

        <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-4">
          {STAGES.map((st) => {
            const cards = byStage(st.key);
            const total = cards.reduce((s, c) => s + c.totalCents, 0);
            return (
              <div
                key={st.key}
                onDragOver={(e) => {
                  if (!canEdit) return;
                  e.preventDefault();
                  if (over !== st.key) setOver(st.key);
                }}
                onDragLeave={() => setOver((o) => (o === st.key ? null : o))}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(null);
                  if (canEdit && dragId) move(dragId, st.key);
                  setDragId(null);
                }}
                className={cn(
                  "flex w-72 shrink-0 flex-col rounded-lg bg-elevated/40 transition-colors",
                  over === st.key && "ring-2 ring-brand",
                )}
              >
                <div className="flex items-center justify-between px-3 pt-3 pb-2">
                  <span className="flex items-center gap-1.5 text-dense font-semibold text-foreground">
                    <span className="size-2 rounded-full" style={{ backgroundColor: st.color }} />
                    {st.label}
                    <span className="text-subtle">{cards.length}</span>
                  </span>
                  {total > 0 && <span className="text-[11px] text-muted">{brl(total)}</span>}
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
                  {rows === null ? (
                    <p className="px-1 py-2 text-dense text-subtle">Carregando…</p>
                  ) : cards.length === 0 ? (
                    <p className="px-1 py-6 text-center text-[12px] text-subtle">Vazio</p>
                  ) : (
                    cards.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        draggable={canEdit}
                        onDragStart={() => setDragId(c.id)}
                        onDragEnd={() => setDragId(null)}
                        onClick={() => onOpenProposal(c.id)}
                        className={cn(
                          "rounded-lg border border-border bg-surface p-2.5 text-left transition-shadow hover:shadow-sm",
                          canEdit && "cursor-grab active:cursor-grabbing",
                          dragId === c.id && "opacity-50",
                        )}
                      >
                        <p className="truncate text-dense font-medium text-foreground">
                          #{c.number} · {c.title || "Sem título"}
                        </p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className="truncate text-[11px] text-subtle">
                            {c.clientName ?? "Sem cliente"}
                          </span>
                          <span className="shrink-0 text-[11px] font-semibold text-foreground">
                            {brl(c.totalCents)}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
