"use client";

import * as React from "react";
import {
  Briefcase,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  FileSignature,
  FileText,
  Filter,
  Image as ImageIcon,
  LayoutDashboard,
  Package,
  Plus,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@wayline/ui";
import {
  commercialDashboardAction,
  FUNNEL_STAGES,
  type CommercialDashboard,
  type FunnelStage,
} from "@/actions/commercial";

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const STAGE_META: Record<FunnelStage, { label: string; color: string }> = {
  lead: { label: "Lead", color: "#94A3B8" },
  qualificado: { label: "Qualificado", color: "#0EA5E9" },
  proposta: { label: "Proposta", color: "#7C5CFF" },
  ganho: { label: "Ganho", color: "#17C86A" },
  perdido: { label: "Perdido", color: "#FF3B30" },
};

export function CommercialPage({
  orgId,
  salesEnabled,
  onNewLead,
  onOpenFunnel,
  onOpenOverview,
  onOpenClients,
  onOpenProposals,
  onOpenServices,
  onOpenPortfolio,
  onOpenContracts,
  onOpenForms,
  onOpenIntegrations,
}: {
  orgId: string;
  salesEnabled: boolean;
  onNewLead: () => void;
  onOpenFunnel: () => void;
  onOpenOverview: () => void;
  onOpenClients: () => void;
  onOpenProposals: () => void;
  onOpenServices: () => void;
  onOpenPortfolio: () => void;
  onOpenContracts: () => void;
  onOpenForms: () => void;
  onOpenIntegrations: () => void;
}) {
  const [d, setD] = React.useState<CommercialDashboard | null>(null);
  React.useEffect(() => {
    commercialDashboardAction(orgId).then(setD).catch(() => {});
  }, [orgId]);

  const maxStageValue = d
    ? Math.max(1, ...FUNNEL_STAGES.map((s) => d.byStage[s].valueCents))
    : 1;

  const tools: Array<{ id: string; label: string; desc: string; icon: LucideIcon; color: string; onOpen: () => void; salesOnly?: boolean }> = [
    { id: "clients", label: "Clientes", desc: "Cadastro e histórico", icon: Users, color: "#3B82F6", onOpen: onOpenClients },
    { id: "proposals", label: "Propostas", desc: "Crie, envie e acompanhe", icon: FileText, color: "#6366F1", onOpen: onOpenProposals, salesOnly: true },
    { id: "contracts", label: "Contratos", desc: "Gere e colete assinaturas", icon: FileSignature, color: "#F59E0B", onOpen: onOpenContracts, salesOnly: true },
    { id: "services", label: "Catálogo", desc: "Serviços e preços", icon: Package, color: "#8B5CF6", onOpen: onOpenServices, salesOnly: true },
    { id: "portfolio", label: "Portfólio", desc: "Cases pro link público", icon: ImageIcon, color: "#EC4899", onOpen: onOpenPortfolio, salesOnly: true },
    { id: "overview", label: "Visão geral", desc: "Números e conversão", icon: LayoutDashboard, color: "#14B8A6", onOpen: onOpenOverview, salesOnly: true },
  ].filter((t) => !t.salesOnly || salesEnabled);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-6">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <Briefcase className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-h2 font-bold">Comercial</h1>
            <p className="text-ui text-muted">Seu funil de vendas de ponta a ponta — do lead ao contrato.</p>
          </div>
          <Button onClick={onNewLead} size="lg">
            <UserPlus className="size-4" /> Novo lead
          </Button>
        </div>

        {/* KPIs */}
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={TrendingUp} tone="#6366F1" label="Funil em aberto"
            value={d ? brl(d.openPipelineCents) : "—"}
            hint={d ? `${d.openCount} oportunidade${d.openCount === 1 ? "" : "s"}` : ""} />
          <Kpi icon={Trophy} tone="#17C86A" label="Ganhos"
            value={d ? brl(d.wonCents) : "—"}
            hint={d ? `${d.wonCount} fechado${d.wonCount === 1 ? "" : "s"}` : ""} />
          <Kpi icon={Filter} tone="#0EA5E9" label="Conversão"
            value={d ? `${d.conversionPct}%` : "—"}
            hint={d ? `${d.wonCount} ganho · ${d.lostCount} perdido` : ""} />
          <Kpi icon={Wallet} tone="#F59E0B" label="Ticket médio"
            value={d ? brl(d.avgTicketCents) : "—"}
            hint={d ? `${d.clientCount} cliente${d.clientCount === 1 ? "" : "s"}` : ""} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Pipeline por etapa */}
          <div className="rounded-xl border border-border bg-surface p-4 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-ui font-semibold text-foreground">Funil de vendas</h2>
              <button type="button" onClick={onOpenFunnel}
                className="flex items-center gap-1 text-dense font-medium text-brand hover:underline">
                Abrir Kanban <ChevronRight className="size-3.5" />
              </button>
            </div>
            <div className="space-y-2.5">
              {FUNNEL_STAGES.map((s) => {
                const cell = d?.byStage[s] ?? { count: 0, valueCents: 0 };
                const pct = Math.round((cell.valueCents / maxStageValue) * 100);
                return (
                  <button key={s} type="button" onClick={onOpenFunnel}
                    className="group block w-full text-left">
                    <div className="mb-1 flex items-center justify-between text-dense">
                      <span className="flex items-center gap-1.5 font-medium text-foreground">
                        <span className="size-2 rounded-full" style={{ backgroundColor: STAGE_META[s].color }} />
                        {STAGE_META[s].label}
                        <span className="text-subtle">· {cell.count}</span>
                      </span>
                      <span className="font-semibold text-muted">{brl(cell.valueCents)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-elevated">
                      <div className="h-full rounded-full transition-all group-hover:opacity-90"
                        style={{ width: `${Math.max(pct, cell.count > 0 ? 4 : 0)}%`, backgroundColor: STAGE_META[s].color }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Como os leads chegam + Leads recentes */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-surface p-4">
              <h2 className="mb-1 text-ui font-semibold text-foreground">Como os leads chegam</h2>
              <p className="mb-3 text-[11px] text-subtle">Cada lead cai na etapa <strong>Lead</strong> do funil.</p>
              <div className="space-y-1">
                <SourceRow icon={ClipboardList} color="#FFB800" label="Formulário / landing page"
                  desc="Destino = Funil comercial" onClick={onOpenForms} />
                <SourceRow icon={CalendarClock} color="#0EA5E9" label="Calendly"
                  desc="Agendamento vira lead" onClick={onOpenIntegrations} />
                <SourceRow icon={Plus} color="#17C86A" label="Manual"
                  desc="Botão “Novo lead” aqui" onClick={onNewLead} />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-ui font-semibold text-foreground">Leads recentes</h2>
                <span className="text-[11px] text-subtle">{d?.byStage.lead.count ?? 0} na etapa Lead</span>
              </div>
              {!d ? (
                <p className="py-3 text-center text-dense text-subtle">Carregando…</p>
              ) : d.recentLeads.length === 0 ? (
                <p className="py-3 text-center text-dense text-subtle">Nenhum lead ainda.</p>
              ) : (
                <div className="space-y-1">
                  {d.recentLeads.map((l) => (
                    <button key={l.id} type="button" onClick={onOpenFunnel}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-elevated">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[11px] font-bold text-brand">
                        {(l.clientName || l.title || "?").charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-dense text-foreground">
                        {l.title || "Sem título"}
                        {l.clientName && <span className="text-subtle"> · {l.clientName}</span>}
                      </span>
                      {l.valueCents > 0 && (
                        <span className="shrink-0 text-[11px] font-semibold text-muted">{brl(l.valueCents)}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ferramentas */}
        <h2 className="mb-2 mt-6 text-label uppercase text-subtle">Ferramentas</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} type="button" onClick={t.onOpen}
                className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5 text-left transition-all hover:border-brand-40 hover:shadow-sm">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${t.color}1a`, color: t.color }}>
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-ui font-semibold text-foreground">{t.label}</p>
                  <p className="truncate text-dense text-muted">{t.desc}</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </button>
            );
          })}
        </div>

        {!salesEnabled && (
          <p className="mt-4 rounded-lg border border-dashed border-border p-3 text-center text-dense text-subtle">
            Ative o módulo <strong>Vendas</strong> em /admin → Módulos para liberar propostas,
            catálogo, portfólio e contratos.
          </p>
        )}
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, tone, label, value, hint }: { icon: LucideIcon; tone: string; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${tone}1a`, color: tone }}>
          <Icon className="size-4" />
        </span>
        <span className="text-dense text-muted">{label}</span>
      </div>
      <p className="font-display text-h2 font-bold text-foreground">{value}</p>
      <p className="text-[11px] text-subtle">{hint}</p>
    </div>
  );
}

function SourceRow({ icon: Icon, color, label, desc, onClick }: { icon: LucideIcon; color: string; label: string; desc: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-elevated">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}1a`, color }}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-dense font-medium text-foreground">{label}</p>
        <p className="truncate text-[11px] text-subtle">{desc}</p>
      </div>
      <ChevronRight className="size-3.5 shrink-0 text-subtle group-hover:text-foreground" />
    </button>
  );
}
