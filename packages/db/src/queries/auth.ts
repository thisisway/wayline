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
