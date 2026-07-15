/**
 * Catálogo de planos (comercialização, modelo ClickUp) — fonte única para a
 * tela de preços/upgrade e para a aplicação de limites.
 *
 * Preços em BRL, por usuário/mês. Sem cobrança ainda: os limites já valem, mas
 * o pagamento entra numa fase posterior (gateway a definir).
 */

export type PlanId = "free" | "pro" | "business" | "enterprise";

export interface PlanLimits {
  /** Máximo de membros no workspace (Infinity = ilimitado). */
  members: number;
  /** Máximo de Spaces (Infinity = ilimitado). */
  spaces: number;
  /** Armazenamento em MB (Infinity = ilimitado). */
  storageMB: number;
}

export interface PlanFlags {
  gantt: boolean;
  customFields: boolean;
  timeTracking: boolean;
  guests: boolean;
  automations: boolean;
  mindmap: boolean;
  dashboard: boolean;
  sso: boolean;
}

export type BillingCycle = "monthly" | "yearly";

export interface Plan {
  id: PlanId;
  name: string;
  /** Preço em BRL por usuário/mês (mensal); null = sob consulta (Enterprise). */
  priceBRL: number | null;
  /** Preço por usuário/mês quando cobrado anualmente (com desconto). */
  priceBRLYearly: number | null;
  tagline: string;
  cta: string;
  highlight?: boolean;
  limits: PlanLimits;
  /** Bullets exibidos na tela de planos. O 1º pode ser um cabeçalho "Tudo do X, mais:". */
  features: string[];
  flags: PlanFlags;
}

const UNLIMITED: PlanLimits = { members: Infinity, spaces: Infinity, storageMB: Infinity };

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    priceBRL: 0,
    priceBRLYearly: 0,
    tagline: "Para começar e organizar o time",
    cta: "Começar grátis",
    limits: { members: 5, spaces: 3, storageMB: 100 },
    features: [
      "Até 5 membros",
      "Até 3 Spaces",
      "Tarefas ilimitadas",
      "Board Kanban, Lista e Calendário",
      "Docs colaborativos e Chat",
      "100 MB de armazenamento",
    ],
    flags: {
      gantt: false,
      customFields: false,
      timeTracking: false,
      guests: false,
      automations: false,
      mindmap: false,
      dashboard: false,
      sso: false,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceBRL: 29,
    priceBRLYearly: 23,
    tagline: "Para times em crescimento",
    cta: "Assinar Pro",
    limits: { ...UNLIMITED },
    features: [
      "Tudo do Free, mais:",
      "Membros e Spaces ilimitados",
      "Gráfico de Gantt",
      "Campos personalizados",
      "Controle de tempo",
      "Metas e portfólio",
      "Convidados com permissão",
      "Armazenamento ilimitado",
    ],
    flags: {
      gantt: true,
      customFields: true,
      timeTracking: true,
      guests: true,
      automations: false,
      mindmap: false,
      dashboard: false,
      sso: false,
    },
  },
  business: {
    id: "business",
    name: "Business",
    priceBRL: 49,
    priceBRLYearly: 39,
    tagline: "Para operações que escalam",
    cta: "Assinar Business",
    highlight: true,
    limits: { ...UNLIMITED },
    features: [
      "Tudo do Pro, mais:",
      "Automações",
      "Mind Map",
      "Dashboard executivo",
      "Relatórios avançados",
      "Papéis e permissões",
      "Exportação (CSV)",
    ],
    flags: {
      gantt: true,
      customFields: true,
      timeTracking: true,
      guests: true,
      automations: true,
      mindmap: true,
      dashboard: true,
      sso: false,
    },
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    priceBRL: null,
    priceBRLYearly: null,
    tagline: "Para grandes organizações",
    cta: "Falar com vendas",
    limits: { ...UNLIMITED },
    features: [
      "Tudo do Business, mais:",
      "SSO / SAML",
      "Log de auditoria",
      "Branding personalizado",
      "Data residency (Brasil/LGPD)",
      "Suporte dedicado e onboarding",
    ],
    flags: {
      gantt: true,
      customFields: true,
      timeTracking: true,
      guests: true,
      automations: true,
      mindmap: true,
      dashboard: true,
      sso: true,
    },
  },
};

export const PLAN_ORDER: PlanId[] = ["free", "pro", "business", "enterprise"];

/**
 * Resolve o plano de um valor guardado em `organizations.plan`.
 * Valores legados/desconhecidos (ex.: "growth") caem em Business (permissivo),
 * para não impor limites a workspaces criados antes desta modelagem.
 */
export function resolvePlan(planValue: string | null | undefined): Plan {
  if (planValue && planValue in PLANS) return PLANS[planValue as PlanId];
  return PLANS.business;
}

export function isKnownPlan(planValue: string | null | undefined): planValue is PlanId {
  return Boolean(planValue && planValue in PLANS);
}

/** Formata o preço para exibição (R$). */
export function formatPrice(priceBRL: number | null): string {
  if (priceBRL == null) return "Sob consulta";
  if (priceBRL === 0) return "R$ 0";
  return `R$ ${priceBRL.toLocaleString("pt-BR")}`;
}
