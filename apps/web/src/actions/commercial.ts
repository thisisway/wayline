"use server";

import { listClients, listContracts, listProposals } from "@wayline/db";
import { assertModule } from "@/lib/authz";

/** Etapas do funil na ordem de exibição. */
export const FUNNEL_STAGES = ["lead", "qualificado", "proposta", "ganho", "perdido"] as const;
export type FunnelStage = (typeof FUNNEL_STAGES)[number];

export interface CommercialDashboard {
  /** Por etapa: quantidade e valor (soma dos totais). */
  byStage: Record<FunnelStage, { count: number; valueCents: number }>;
  /** Valor em aberto (lead+qualificado+proposta). */
  openPipelineCents: number;
  /** Oportunidades abertas (não ganho/perdido). */
  openCount: number;
  wonCount: number;
  wonCents: number;
  lostCount: number;
  /** Ganhos / (ganhos + perdidos). */
  conversionPct: number;
  /** Ticket médio dos ganhos. */
  avgTicketCents: number;
  clientCount: number;
  /** Últimas oportunidades na etapa Lead. */
  recentLeads: Array<{ id: string; title: string; clientName: string | null; valueCents: number }>;
}

const EMPTY_DASH: CommercialDashboard = {
  byStage: {
    lead: { count: 0, valueCents: 0 },
    qualificado: { count: 0, valueCents: 0 },
    proposta: { count: 0, valueCents: 0 },
    ganho: { count: 0, valueCents: 0 },
    perdido: { count: 0, valueCents: 0 },
  },
  openPipelineCents: 0,
  openCount: 0,
  wonCount: 0,
  wonCents: 0,
  lostCount: 0,
  conversionPct: 0,
  avgTicketCents: 0,
  clientCount: 0,
  recentLeads: [],
};

/** KPIs do funil (por etapa) + leads recentes. Resiliente. */
export async function commercialDashboardAction(orgId: string): Promise<CommercialDashboard> {
  if (!(await assertModule(orgId, "comercial", "view"))) return EMPTY_DASH;
  const [proposals, clients] = await Promise.all([
    listProposals(orgId).catch(() => []),
    listClients(orgId).catch(() => []),
  ]);

  const d: CommercialDashboard = {
    ...EMPTY_DASH,
    byStage: {
      lead: { count: 0, valueCents: 0 },
      qualificado: { count: 0, valueCents: 0 },
      proposta: { count: 0, valueCents: 0 },
      ganho: { count: 0, valueCents: 0 },
      perdido: { count: 0, valueCents: 0 },
    },
    clientCount: clients.length,
    recentLeads: [],
  };

  for (const p of proposals) {
    const st = (FUNNEL_STAGES as readonly string[]).includes(p.stage)
      ? (p.stage as FunnelStage)
      : "lead";
    d.byStage[st].count += 1;
    d.byStage[st].valueCents += p.totalCents;
  }

  const open: FunnelStage[] = ["lead", "qualificado", "proposta"];
  d.openCount = open.reduce((s, st) => s + d.byStage[st].count, 0);
  d.openPipelineCents = open.reduce((s, st) => s + d.byStage[st].valueCents, 0);
  d.wonCount = d.byStage.ganho.count;
  d.wonCents = d.byStage.ganho.valueCents;
  d.lostCount = d.byStage.perdido.count;
  const decided = d.wonCount + d.lostCount;
  d.conversionPct = decided > 0 ? Math.round((d.wonCount / decided) * 100) : 0;
  d.avgTicketCents = d.wonCount > 0 ? Math.round(d.wonCents / d.wonCount) : 0;

  d.recentLeads = proposals
    .filter((p) => p.stage === "lead")
    .slice(0, 6)
    .map((p) => ({ id: p.id, title: p.title, clientName: p.clientName, valueCents: p.totalCents }));

  return d;
}

export interface CommercialOverview {
  proposals: {
    total: number;
    byStatus: { draft: number; sent: number; accepted: number; rejected: number };
    pipelineCents: number; // soma dos totais das propostas ainda "enviadas"
    wonCents: number; // soma dos totais das propostas aceitas
    conversionPct: number; // aceitas / (aceitas + recusadas)
  };
  contracts: {
    total: number;
    byStatus: { draft: number; sent: number; signed: number; canceled: number };
    signedCents: number;
  };
}

const EMPTY: CommercialOverview = {
  proposals: {
    total: 0,
    byStatus: { draft: 0, sent: 0, accepted: 0, rejected: 0 },
    pipelineCents: 0,
    wonCents: 0,
    conversionPct: 0,
  },
  contracts: {
    total: 0,
    byStatus: { draft: 0, sent: 0, signed: 0, canceled: 0 },
    signedCents: 0,
  },
};

/** Agrega o funil comercial a partir das queries resilientes (nunca lança). */
export async function commercialOverviewAction(orgId: string): Promise<CommercialOverview> {
  if (!(await assertModule(orgId, "comercial", "view"))) return EMPTY;
  const [proposals, contracts] = await Promise.all([
    listProposals(orgId),
    listContracts(orgId),
  ]);

  const p = { ...EMPTY.proposals, byStatus: { draft: 0, sent: 0, accepted: 0, rejected: 0 } };
  for (const it of proposals) {
    if (it.status in p.byStatus) p.byStatus[it.status as keyof typeof p.byStatus] += 1;
    if (it.status === "sent") p.pipelineCents += it.totalCents;
    if (it.status === "accepted") p.wonCents += it.totalCents;
  }
  p.total = proposals.length;
  const decided = p.byStatus.accepted + p.byStatus.rejected;
  p.conversionPct = decided > 0 ? Math.round((p.byStatus.accepted / decided) * 100) : 0;

  const c = { ...EMPTY.contracts, byStatus: { draft: 0, sent: 0, signed: 0, canceled: 0 } };
  for (const it of contracts) {
    if (it.status in c.byStatus) c.byStatus[it.status as keyof typeof c.byStatus] += 1;
    if (it.status === "signed") c.signedCents += it.valueCents;
  }
  c.total = contracts.length;

  return { proposals: p, contracts: c };
}
