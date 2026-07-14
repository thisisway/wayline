"use server";

import { getPlatformOverview, setOrgPlan, type PlatformOverview } from "@wayline/db";
import { revalidatePath } from "next/cache";
import { isPlatformAdmin } from "@/lib/authz";
import { isKnownPlan } from "@/lib/plans";

export async function platformOverviewAction(): Promise<PlatformOverview | null> {
  if (!(await isPlatformAdmin())) return null;
  return getPlatformOverview();
}

/** Superadmin define o plano de qualquer org (antes da cobrança automática). */
export async function setOrgPlanAction(orgId: string, plan: string): Promise<boolean> {
  if (!(await isPlatformAdmin())) return false;
  if (!isKnownPlan(plan)) return false;
  await setOrgPlan(orgId, plan);
  revalidatePath("/admin");
  return true;
}
