import { eq } from "drizzle-orm";
import { getDb } from "../client";
import { users } from "../schema";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  /** Tem senha definida (login por credenciais). */
  hasPassword: boolean;
}

/** Perfil do usuário logado (users não tem RLS: global). */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const db = getDb();
  const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatarUrl: u.avatarUrl,
    hasPassword: Boolean(u.passwordHash),
  };
}

/** Atualiza nome e/ou avatar. Ignora campos ausentes; nome vazio é ignorado. */
export async function updateUserProfile(
  userId: string,
  patch: { name?: string; avatarUrl?: string | null },
): Promise<void> {
  const db = getDb();
  const set: { name?: string; avatarUrl?: string | null } = {};
  if (patch.name != null && patch.name.trim()) set.name = patch.name.trim();
  if ("avatarUrl" in patch) set.avatarUrl = patch.avatarUrl?.trim() || null;
  if (Object.keys(set).length === 0) return;
  await db.update(users).set(set).where(eq(users.id, userId));
}

/** Hash de senha atual (para conferir na troca de senha). */
export async function getUserPasswordHash(userId: string): Promise<string | null> {
  const db = getDb();
  const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
  return u?.passwordHash ?? null;
}

/** Grava o novo hash de senha. */
export async function setUserPasswordHash(userId: string, passwordHash: string): Promise<void> {
  const db = getDb();
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}
