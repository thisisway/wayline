"use client";

import * as React from "react";
import {
  FileSignature,
  FileText,
  LayoutDashboard,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { Badge, cn } from "@wayline/ui";
import { commercialOverviewAction, type CommercialOverview } from "@/actions/commercial";

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PROP_STATUS: Array<{ key: keyof CommercialOverview["proposals"]["byStatus"]; label: string; variant: "neutral" | "brand" | "success" | "danger" }> = [
  { key: "draft", label: "Rascunho", variant: "neutral" },
  { key: "sent", label: "Enviadas", variant: "brand" },
  { key: "accepted", label: "Aceitas", variant: "success" },
  { key: "rejected", label: "Recusadas", variant: "danger" },
];
const CTR_STATUS: Array<{ key: keyof CommercialOverview["contracts"]["byStatus"]; label: string; variant: "neutral" | "brand" | "success" | "danger" }> = [
  { key: "draft", label: "Rascunho", variant: "neutral" },
  { key: "sent", label: "Enviados", variant: "brand" },
  { key: "signed", label: "Assinados", variant: "success" },
  { key: "canceled", label: "Cancelados", variant: "danger" },
];

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-canvas p-4">
      <div className="flex items-center gap-2 text-muted">
        <Icon className="size-4" />
        <span className="text-dense font-medium">{label}</span>
      </div>
      <p className="mt-2 font-display text-h2 font-bold tabular-nums text-foreground">{value}</p>
      {hint && <p className="mt-0.5 text-[12px] text-subtle">{hint}</p>}
    </div>
  );
}

/** Barra de distribuição por status (proporcional ao total). */
function StatusBar({
  rows,
  total,
}: {
  rows: Array<{ label: string; variant: "neutral" | "brand" | "success" | "danger"; count: number }>;
  total: number;
}) {
  const color: Record<string, string> = {
    neutral: "bg-subtle/40",
    brand: "bg-brand",
    success: "bg-success",
    danger: "bg-danger",
  };
  return (
    <div className="space-y-2">
      <div className="flex h-2 overflow-hidden rounded-full bg-elevated">
        {rows.map((r) =>
          r.count > 0 ? (
            <div
              key={r.label}
              className={cn(color[r.variant])}
              style={{ width: `${(r.count / Math.max(1, total)) * 100}%` }}
              title={`${r.label}: ${r.count}`}
            />
          ) : null,
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {rows.map((r) => (
          <span key={r.label} className="flex items-center gap-1.5 text-dense text-muted">
            <Badge variant={r.variant} size="sm">
              {r.count}
            </Badge>
            {r.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function OverviewModal({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const [data, setData] = React.useState<CommercialOverview | null>(null);

  React.useEffect(() => {
    commercialOverviewAction(orgId).then(setData);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [orgId, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="flex items-center gap-2 font-display text-ui font-bold">
            <LayoutDashboard className="size-4" /> Comercial — Visão geral
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

        {!data ? (
          <p className="p-8 text-center text-dense text-subtle">Carregando…</p>
        ) : (
          <div className="flex-1 space-y-6 overflow-y-auto p-5">
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi
                icon={FileText}
                label="Em negociação"
                value={brl(data.proposals.pipelineCents)}
                hint={`${data.proposals.byStatus.sent} proposta${data.proposals.byStatus.sent === 1 ? "" : "s"} enviada${data.proposals.byStatus.sent === 1 ? "" : "s"}`}
              />
              <Kpi
                icon={TrendingUp}
                label="Ganho (aceitas)"
                value={brl(data.proposals.wonCents)}
                hint={`${data.proposals.byStatus.accepted} aceita${data.proposals.byStatus.accepted === 1 ? "" : "s"}`}
              />
              <Kpi
                icon={TrendingUp}
                label="Conversão"
                value={`${data.proposals.conversionPct}%`}
                hint="aceitas ÷ decididas"
              />
              <Kpi
                icon={FileSignature}
                label="Contratos assinados"
                value={brl(data.contracts.signedCents)}
                hint={`${data.contracts.byStatus.signed} assinado${data.contracts.byStatus.signed === 1 ? "" : "s"}`}
              />
            </div>

            {/* Funil de propostas */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-ui font-semibold">
                  <FileText className="size-4 text-muted" /> Propostas
                </h3>
                <span className="text-dense text-subtle">{data.proposals.total} no total</span>
              </div>
              {data.proposals.total === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-4 text-center text-dense text-subtle">
                  Nenhuma proposta ainda.
                </p>
              ) : (
                <StatusBar
                  total={data.proposals.total}
                  rows={PROP_STATUS.map((s) => ({
                    label: s.label,
                    variant: s.variant,
                    count: data.proposals.byStatus[s.key],
                  }))}
                />
              )}
            </section>

            {/* Contratos */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-ui font-semibold">
                  <FileSignature className="size-4 text-muted" /> Contratos
                </h3>
                <span className="text-dense text-subtle">{data.contracts.total} no total</span>
              </div>
              {data.contracts.total === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-4 text-center text-dense text-subtle">
                  Nenhum contrato ainda.
                </p>
              ) : (
                <StatusBar
                  total={data.contracts.total}
                  rows={CTR_STATUS.map((s) => ({
                    label: s.label,
                    variant: s.variant,
                    count: data.contracts.byStatus[s.key],
                  }))}
                />
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
