"use server";

import { listContracts, listProposals } from "@wayline/db";
import { assertMember } from "@/lib/authz";

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
  if (!(await assertMember(orgId))) return EMPTY;
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
