"use server";

import { setOrgBranding } from "@wayline/db";
import { revalidatePath } from "next/cache";
import { assertRole } from "@/lib/authz";
import { planAllows } from "@/lib/plan-guard";

export type BrandingResult = "ok" | "forbidden" | "locked" | "invalid";

/** Aceita hex #RGB ou #RRGGBB. */
function isHex(v: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v.trim());
}

/**
 * Salva a marca do workspace (logo + cor). Requer admin+ E plano com `branding`
 * (Business+). Enviar `null`/"" limpa o respectivo campo.
 */
export async function updateBrandingAction(
  orgId: string,
  patch: { logoUrl?: string | null; brandColor?: string | null },
): Promise<BrandingResult> {
  if (!(await assertRole(orgId, "admin"))) return "forbidden";
  if (!(await planAllows(orgId, "branding"))) return "locked";
  if (patch.brandColor && !isHex(patch.brandColor)) return "invalid";
  await setOrgBranding(orgId, {
    logoUrl: patch.logoUrl ?? null,
    brandColor: patch.brandColor ? patch.brandColor.trim() : null,
  });
  revalidatePath("/app");
  return "ok";
}
