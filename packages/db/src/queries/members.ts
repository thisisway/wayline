import { and, asc, eq } from "drizzle-orm";
import { getDb, withOrg } from "../client";
import { memberships, users } from "../schema";
import {
  effectiveModuleAccess,
  MODULE_KEYS,
  type AccessLevel,
  type ModuleAccessMap,
  type ModuleKey,
} from "../access-modules";

export interface WorkspaceMember {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  /** Acesso efetivo por módulo (para o painel de membros). */
  modules: ModuleAccessMap;
}

/** Membros da org (para o painel de membros e os responsáveis de tarefa). */
export async function getWorkspaceMembers(orgId: string): Promise<WorkspaceMember[]> {
  return withOrg(orgId, async (tx) => {
    const rows = await tx.query.memberships.findMany({
      where: eq(memberships.orgId, orgId),
      orderBy: [asc(memberships.createdAt)],
      with: { user: true },
    });
    return rows.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
      modules: effectiveModuleAccess(m.role, m.moduleAccess),
    }));
  });
}

/** Grava a exceção de acesso a um módulo para um membro (não mexe em owners). */
export async function setMemberModuleAccess(
  orgId: string,
  userId: string,
  moduleKey: ModuleKey,
  level: AccessLevel,
): Promise<void> {
  if (!MODULE_KEYS.includes(moduleKey)) return;
  await withOrg(orgId, async (tx) => {
    const m = await tx.query.memberships.findFirst({
      where: and(eq(memberships.orgId, orgId), eq(memberships.userId, userId)),
    });
    if (!m || m.role === "owner") return; // owner sempre tem tudo
    const next = { ...(m.moduleAccess ?? {}), [moduleKey]: level };
    await tx
      .update(memberships)
      .set({ moduleAccess: next })
      .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, userId)));
  });
}

export type AddMemberStatus = "added" | "already" | "not_found";

/** Adiciona um usuário existente (por email) como `member`. */
export async function addMemberByEmail(orgId: string, email: string): Promise<AddMemberStatus> {
  const db = getDb();
  // users não tem RLS.
  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase().trim()),
  });
  if (!user) return "not_found";

  return withOrg(orgId, async (tx) => {
    const existing = await tx.query.memberships.findFirst({
      where: and(eq(memberships.orgId, orgId), eq(memberships.userId, user.id)),
    });
    if (existing) return "already";
    await tx.insert(memberships).values({ orgId, userId: user.id, role: "member" });
    return "added";
  });
}

/** Define o papel de um membro (não altera owners). */
export async function setMemberRole(
  orgId: string,
  userId: string,
  role: "admin" | "member" | "guest",
): Promise<void> {
  await withOrg(orgId, async (tx) => {
    const m = await tx.query.memberships.findFirst({
      where: and(eq(memberships.orgId, orgId), eq(memberships.userId, userId)),
    });
    if (!m || m.role === "owner") return; // não mexe em owners
    await tx
      .update(memberships)
      .set({ role })
      .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, userId)));
  });
}

/** Remove um membro da org. */
export async function removeMember(orgId: string, userId: string): Promise<void> {
  await withOrg(orgId, async (tx) => {
    await tx
      .delete(memberships)
      .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, userId)));
  });
}
