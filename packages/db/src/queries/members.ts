import { and, asc, eq } from "drizzle-orm";
import { getDb, withOrg } from "../client";
import { memberships, users } from "../schema";

export interface WorkspaceMember {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
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
    }));
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

/** Remove um membro da org. */
export async function removeMember(orgId: string, userId: string): Promise<void> {
  await withOrg(orgId, async (tx) => {
    await tx
      .delete(memberships)
      .where(and(eq(memberships.orgId, orgId), eq(memberships.userId, userId)));
  });
}
