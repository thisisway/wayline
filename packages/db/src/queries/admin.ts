import { and, asc, count, eq, isNull } from "drizzle-orm";
import { getDb, withOrg } from "../client";
import { memberships, organizations, tasks, users } from "../schema";

export interface AdminOrgRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  trialEndsAt: Date | null;
  createdAt: Date;
  members: number;
  tasks: number;
}

export interface PlatformOverview {
  totalOrgs: number;
  totalUsers: number;
  totalTasks: number;
  totalMembers: number;
  byPlan: Record<string, number>;
  orgs: AdminOrgRow[];
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: Date;
}

/** Todos os usuários da plataforma (users é global, sem RLS). */
export async function getPlatformUsers(): Promise<AdminUserRow[]> {
  const db = getDb();
  const rows = await db.query.users.findMany({ orderBy: [asc(users.createdAt)] });
  return rows.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    avatarUrl: u.avatarUrl,
    createdAt: u.createdAt,
  }));
}

/**
 * Visão da plataforma (todas as orgs) para o superadmin.
 * `organizations`/`users` são globais (sem RLS); contagens por org rodam via
 * `withOrg`, que respeita a RLS de cada tenant.
 */
export async function getPlatformOverview(): Promise<PlatformOverview> {
  const db = getDb();

  const orgRows = await db.query.organizations.findMany({
    where: isNull(organizations.deletedAt),
    orderBy: [asc(organizations.createdAt)],
  });
  const [{ n: totalUsers }] = (await db.select({ n: count() }).from(users)) as [{ n: number }];

  const orgs: AdminOrgRow[] = [];
  let totalTasks = 0;
  let totalMembers = 0;
  const byPlan: Record<string, number> = {};

  for (const o of orgRows) {
    byPlan[o.plan] = (byPlan[o.plan] ?? 0) + 1;
    const counts = await withOrg(o.id, async (tx) => {
      const [m] = await tx
        .select({ n: count() })
        .from(memberships)
        .where(eq(memberships.orgId, o.id));
      const [t] = await tx
        .select({ n: count() })
        .from(tasks)
        .where(and(eq(tasks.orgId, o.id), isNull(tasks.deletedAt)));
      return { members: m?.n ?? 0, tasks: t?.n ?? 0 };
    });
    totalMembers += counts.members;
    totalTasks += counts.tasks;
    orgs.push({
      id: o.id,
      name: o.name,
      slug: o.slug,
      plan: o.plan,
      trialEndsAt: o.trialEndsAt ?? null,
      createdAt: o.createdAt,
      members: counts.members,
      tasks: counts.tasks,
    });
  }

  return {
    totalOrgs: orgRows.length,
    totalUsers,
    totalTasks,
    totalMembers,
    byPlan,
    orgs,
  };
}
