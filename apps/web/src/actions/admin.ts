"use server";

import {
  getPlatformOverview,
  setOrgPlan,
  setOrgTrial,
  setPlatformSettings,
  type PlatformOverview,
} from "@wayline/db";
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

export type SaveBrandingResult = "ok" | "forbidden" | "invalid" | "error";

/** Superadmin define a MARCA da plataforma (logos claro/escuro + cor). */
export async function setPlatformBrandingAction(patch: {
  name?: string | null;
  logoUrl?: string | null;
  logoUrlDark?: string | null;
  iconUrl?: string | null;
  faviconUrl?: string | null;
  brandColor?: string | null;
}): Promise<SaveBrandingResult> {
  if (!(await isPlatformAdmin())) return "forbidden";
  const color = patch.brandColor?.trim() || null;
  if (color && !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) return "invalid";
  try {
    await setPlatformSettings({
      name: patch.name?.trim() || null,
      logoUrl: patch.logoUrl ?? null,
      logoUrlDark: patch.logoUrlDark ?? null,
      iconUrl: patch.iconUrl ?? null,
      faviconUrl: patch.faviconUrl ?? null,
      brandColor: color,
    });
  } catch {
    return "error"; // provável: migração das colunas de marca ainda não aplicada
  }
  revalidatePath("/", "layout"); // marca é global
  return "ok";
}

/** Superadmin define o trial: `days` a partir de agora, ou null para encerrar. */
export async function setOrgTrialAction(
  orgId: string,
  days: number | null,
): Promise<string | null> {
  if (!(await isPlatformAdmin())) return null;
  const ends = days && days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;
  await setOrgTrial(orgId, ends);
  revalidatePath("/admin");
  return ends ? ends.toISOString() : null;
}
