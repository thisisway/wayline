import { getUserOrgs } from "@wayline/db";
import { auth } from "@/auth";

/**
 * Autorização compartilhada pelas server actions.
 *
 * Ponto crítico do modelo de segurança: a RLS confia em `app.current_org`, que
 * o app seta a partir do `orgId` recebido. Portanto TODA action que aceita um
 * `orgId` do cliente precisa confirmar que o usuário logado é membro daquela
 * org — senão haveria acesso cross-tenant.
 */
export async function assertMember(orgId: string): Promise<boolean> {
  if (!orgId) return false;
  const session = await auth();
  if (!session?.user?.id) return false;
  const orgs = await getUserOrgs(session.user.id);
  return orgs.some((o) => o.id === orgId);
}

/** Id do usuário logado (ou null). */
export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Usuário logado (id + nome) ou null. */
export async function getSessionUser(): Promise<{ id: string; name: string } | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return { id: session.user.id, name: session.user.name ?? "Alguém" };
}
