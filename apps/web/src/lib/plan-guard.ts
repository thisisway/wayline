import "server-only";
import { getOrgPlan } from "@wayline/db";
import { resolvePlan, type PlanFlags } from "@/lib/plans";

/** Flags de features do plano da org (resolve legado como Business). */
export async function getOrgFlags(orgId: string): Promise<PlanFlags> {
  return resolvePlan(await getOrgPlan(orgId)).flags;
}

/** O plano da org libera esta feature? (defesa no servidor) */
export async function planAllows(orgId: string, feature: keyof PlanFlags): Promise<boolean> {
  const flags = await getOrgFlags(orgId);
  return flags[feature];
}
