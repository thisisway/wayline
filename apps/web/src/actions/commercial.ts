"use server";

import { listClients, listContracts, listProposals } from "@wayline/db";
import { assertModule } from "@/lib/authz";
import {
  EMPTY_DASHBOARD,
  emptyByStage,
  FUNNEL_STAGES,
  LEAD_SOURCES,
  type CommercialDashboard,
  type FunnelStage,
  type LeadSource,
  type OwnerStat,
} from "@/lib/commercial";

/** KPIs do funil (por etapa) + leads recentes. Resiliente. */
export async function commercialDashboardAction(orgId: string): Promise<CommercialDashboard> {
  if (!(await assertModule(orgId, "comercial", "view"))) return EMPTY_DASHBOARD;
  const [proposals, clients] = await Promise.all([
    listProposals(orgId).catch(() => []),
    listClients(orgId).catch(() => []),
  ]);

  const d: CommercialDashboard = {
    ...EMPTY_DASHBOARD,
    byStage: emptyByStage(),
    clientCount: clients.length,
    recentLeads: [],
    bySource: { form: { count: 0 }, api: { count: 0 }, manual: { count: 0 } },
    leaderboard: [],
  };

  const byOwner = new Map<string, OwnerStat>();
  for (const p of proposals) {
    const st = (FUNNEL_STAGES as readonly string[]).includes(p.stage)
      ? (p.stage as FunnelStage)
      : "lead";
    d.byStage[st].count += 1;
    d.byStage[st].valueCents += p.totalCents;

    const src = (LEAD_SOURCES as readonly string[]).includes(p.source)
      ? (p.source as LeadSource)
      : "manual";
    d.bySource[src].count += 1;

    if (p.ownerId) {
      const key = p.ownerId;
      const stat = byOwner.get(key) ?? {
        ownerId: p.ownerId,
        ownerName: p.ownerName ?? "—",
        wonCount: 0,
        wonCents: 0,
        openCount: 0,
      };
      if (st === "ganho") {
        stat.wonCount += 1;
        stat.wonCents += p.totalCents;
      } else if (st !== "perdido") {
        stat.openCount += 1;
      }
      byOwner.set(key, stat);
    }
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
    .map((p) => ({
      id: p.id,
      title: p.title,
      clientName: p.clientName,
      valueCents: p.totalCents,
      ownerName: p.ownerName,
      ownerAvatarUrl: p.ownerAvatarUrl,
    }));

  d.leaderboard = [...byOwner.values()].sort((a, b) => b.wonCents - a.wonCents);

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
