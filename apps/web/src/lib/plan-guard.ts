import "server-only";
import { getOrgBilling } from "@wayline/db";
import { effectivePlan, type PlanFlags } from "@/lib/plans";

/** Flags de features do plano EFETIVO da org (considera trial ativo). */
export async function getOrgFlags(orgId: string): Promise<PlanFlags> {
  const { plan, trialEndsAt } = await getOrgBilling(orgId);
  return effectivePlan(plan, trialEndsAt).flags;
}

/** O plano da org libera esta feature? (defesa no servidor) */
export async function planAllows(orgId: string, feature: keyof PlanFlags): Promise<boolean> {
  const flags = await getOrgFlags(orgId);
  return flags[feature];
}
