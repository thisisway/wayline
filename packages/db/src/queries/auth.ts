import { asc, eq } from "drizzle-orm";
import { getDb, withUser } from "../client";
import { memberships, users } from "../schema";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string | null;
}

/** Busca usuário por email (tabela users não tem RLS). */
export async function getUserByEmail(email: string): Promise<AuthUser | null> {
  const db = getDb();
  const u = await db.query.users.findFirst({ where: eq(users.email, email.toLowerCase()) });
  return u
    ? { id: u.id, name: u.name, email: u.email, passwordHash: u.passwordHash }
    : null;
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
      }));
  });
}
