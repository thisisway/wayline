import { eq } from "drizzle-orm";
import { getDb } from "../client";
import { organizations } from "../schema";

/** Plano da org (organizations não tem RLS: acesso global). */
export async function getOrgPlan(orgId: string): Promise<string> {
  const db = getDb();
  const o = await db.query.organizations.findFirst({ where: eq(organizations.id, orgId) });
  return o?.plan ?? "free";
}

/** Define o plano da org (usado quando houver cobrança/admin). */
export async function setOrgPlan(orgId: string, plan: string): Promise<void> {
  const db = getDb();
  await db.update(organizations).set({ plan }).where(eq(organizations.id, orgId));
}
