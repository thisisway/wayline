import { eq } from "drizzle-orm";
import { getDb } from "../client";
import { organizations } from "../schema";

/** Plano da org (organizations não tem RLS: acesso global). */
export async function getOrgPlan(orgId: string): Promise<string> {
  const db = getDb();
  const o = await db.query.organizations.findFirst({ where: eq(organizations.id, orgId) });
  return o?.plan ?? "free";
}

export interface OrgBilling {
  plan: string;
  trialEndsAt: Date | null;
}

/** Plano + fim do trial da org (para calcular o plano efetivo). */
export async function getOrgBilling(orgId: string): Promise<OrgBilling> {
  const db = getDb();
  const o = await db.query.organizations.findFirst({ where: eq(organizations.id, orgId) });
  return { plan: o?.plan ?? "free", trialEndsAt: o?.trialEndsAt ?? null };
}

/** Define o plano da org (usado quando houver cobrança/admin). */
export async function setOrgPlan(orgId: string, plan: string): Promise<void> {
  const db = getDb();
  await db.update(organizations).set({ plan }).where(eq(organizations.id, orgId));
}

/** Define/estende/encerra o trial da org (null = encerra). */
export async function setOrgTrial(orgId: string, trialEndsAt: Date | null): Promise<void> {
  const db = getDb();
  await db.update(organizations).set({ trialEndsAt }).where(eq(organizations.id, orgId));
}

/** Marca personalizada da org (logo em data URL e cor hex). */
export async function setOrgBranding(
  orgId: string,
  patch: { logoUrl?: string | null; brandColor?: string | null },
): Promise<void> {
  const db = getDb();
  const set: { logoUrl?: string | null; brandColor?: string | null } = {};
  if ("logoUrl" in patch) set.logoUrl = patch.logoUrl || null;
  if ("brandColor" in patch) set.brandColor = patch.brandColor || null;
  if (Object.keys(set).length === 0) return;
  await db.update(organizations).set(set).where(eq(organizations.id, orgId));
}
