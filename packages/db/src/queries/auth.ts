import { asc, eq, inArray } from "drizzle-orm";
import { getDb, withOrg, withUser } from "../client";
import { lists, memberships, users } from "../schema";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  passwordHash: string | null;
}

/** Busca usuário por email (tabela users não tem RLS). */
export async function getUserByEmail(email: string): Promise<AuthUser | null> {
  const db = getDb();
  const u = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
  return u
    ? {
        id: u.id,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatarUrl,
        passwordHash: u.passwordHash,
      }
    : null;
}

/** Usuários por id (para envio de email; users não tem RLS). */
export async function getUsersByIds(
  ids: string[],
): Promise<Array<{ id: string; name: string; email: string }>> {
  if (ids.length === 0) return [];
  const db = getDb();
  const rows = await db.query.users.findMany({ where: inArray(users.id, ids) });
  return rows.map((u) => ({ id: u.id, name: u.name, email: u.email }));
}

/** Cria um usuário (signup). Retorna null se o email já existe. */
export async function createUser(
  name: string,
  email: string,
  passwordHash: string,
): Promise<string | null> {
  const db = getDb();
  const normalized = email.toLowerCase().trim();
  const existing = await db.query.users.findFirst({ where: eq(users.email, normalized) });
  if (existing) return null;
  const [u] = await db
    .insert(users)
    .values({ name: name.trim(), email: normalized, passwordHash })
    .returning();
  return u?.id ?? null;
}

/**
 * Resolve a org "corrente" do usuário (primeira membership). Roda com
 * `app.current_user` setado para passar pela RLS de memberships.
 */
export async function resolveUserOrg(userId: string): Promise<string | null> {
  return withUser(userId, async (tx) => {
    const m = await tx.query.memberships.findFirst({
      where: eq(memberships.userId, userId),
      orderBy: [asc(memberships.createdAt)],
    });
    return m?.orgId ?? null;
  });
}

export interface UserOrg {
  id: string;
  name: string;
  plan: string;
  role: string;
  trialEndsAt: Date | null;
}

/** O usuário tem acesso à lista? (a lista está numa org da qual ele é membro) */
export async function userCanAccessList(userId: string, listId: string): Promise<boolean> {
  if (!userId || !listId) return false;
  const orgs = await getUserOrgs(userId);
  for (const o of orgs) {
    const found = await withOrg(o.id, (tx) =>
      tx.query.lists.findFirst({ where: eq(lists.id, listId) }),
    );
    if (found) return true;
  }
  return false;
}

/** Todas as orgs às quais o usuário pertence (para o seletor de workspace). */
export async function getUserOrgs(userId: string): Promise<UserOrg[]> {
  return withUser(userId, async (tx) => {
    const rows = await tx.query.memberships.findMany({
      where: eq(memberships.userId, userId),
      orderBy: [asc(memberships.createdAt)],
      with: { organization: true },
    });
    return rows
      .filter((m) => m.organization && !m.organization.deletedAt)
      .map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        plan: m.organization.plan,
        role: m.role,
        trialEndsAt: m.organization.trialEndsAt ?? null,
      }));
  });
}
