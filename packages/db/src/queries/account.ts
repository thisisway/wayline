import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { getDb } from "../client";
import { memberships, organizations, users } from "../schema";

export interface UserDataExport {
  exportedAt: string;
  profile: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    createdAt: Date;
  };
  workspaces: Array<{ name: string; role: string; since: Date }>;
}

/** Exporta os dados pessoais do usuário (portabilidade LGPD). Resiliente. */
export async function exportUserData(userId: string): Promise<UserDataExport | null> {
  try {
    const db = getDb();
    const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!u) return null;
    const ms = await db.query.memberships.findMany({ where: eq(memberships.userId, userId) });
    const orgIds = ms.map((m) => m.orgId);
    const orgs = orgIds.length
      ? await db.query.organizations.findMany({ where: inArray(organizations.id, orgIds) })
      : [];
    const nameById = new Map(orgs.map((o) => [o.id, o.name]));
    return {
      exportedAt: new Date().toISOString(),
      profile: {
        id: u.id,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatarUrl ?? null,
        createdAt: u.createdAt,
      },
      workspaces: ms.map((m) => ({
        name: nameById.get(m.orgId) ?? m.orgId,
        role: m.role,
        since: m.createdAt,
      })),
    };
  } catch {
    return null;
  }
}

export interface DeleteAccountResult {
  ok: boolean;
  /** Workspaces em que o usuário é o dono e há outros membros (impedem a exclusão). */
  blocked?: string[];
}

/**
 * Exclui a conta (LGPD): remove os vínculos, arquiva workspaces em que o usuário
 * é dono único e ANONIMIZA o registro do usuário (preserva integridade referencial).
 * Bloqueia se o usuário for dono de um workspace com outros membros.
 */
export async function deleteUserAccount(userId: string): Promise<DeleteAccountResult> {
  const db = getDb();
  const ms = await db.query.memberships.findMany({ where: eq(memberships.userId, userId) });
  const ownedOrgIds = ms.filter((m) => m.role === "owner").map((m) => m.orgId);

  const blocked: string[] = [];
  const soleOwned: string[] = [];
  for (const orgId of ownedOrgIds) {
    const others = await db.query.memberships.findMany({
      where: and(eq(memberships.orgId, orgId), ne(memberships.userId, userId)),
    });
    if (others.length > 0) {
      const org = await db.query.organizations.findFirst({ where: eq(organizations.id, orgId) });
      blocked.push(org?.name ?? orgId);
    } else {
      soleOwned.push(orgId);
    }
  }
  if (blocked.length > 0) return { ok: false, blocked };

  // Arquiva (soft-delete) os workspaces de dono único.
  for (const orgId of soleOwned) {
    await db
      .update(organizations)
      .set({ deletedAt: new Date() })
      .where(and(eq(organizations.id, orgId), isNull(organizations.deletedAt)));
  }
  // Remove todos os vínculos.
  await db.delete(memberships).where(eq(memberships.userId, userId));
  // Anonimiza o registro do usuário (libera o e-mail e apaga dados pessoais).
  await db
    .update(users)
    .set({
      name: "Usuário removido",
      email: `deleted+${userId}@deleted.local`,
      passwordHash: null,
      avatarUrl: null,
    })
    .where(eq(users.id, userId));

  return { ok: true };
}
