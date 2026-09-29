// Tipos/constantes do comercial — módulo puro (sem "use server"), seguro para
// importar tanto na action quanto em componentes cliente.

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

export const EMPTY_DASHBOARD: CommercialDashboard = {
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

/** Cria um mapa de etapas zerado (evita mutação do EMPTY_DASHBOARD). */
export function emptyByStage(): CommercialDashboard["byStage"] {
  return {
    lead: { count: 0, valueCents: 0 },
    qualificado: { count: 0, valueCents: 0 },
    proposta: { count: 0, valueCents: 0 },
    ganho: { count: 0, valueCents: 0 },
    perdido: { count: 0, valueCents: 0 },
  };
}
