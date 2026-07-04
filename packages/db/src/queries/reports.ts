import { and, count, eq, isNull, sql } from "drizzle-orm";
import { withOrg } from "../client";
import { clients, tasks, timeEntries, users } from "../schema";

export interface ReportRow {
  id: string;
  name: string;
  color: string | null;
  seconds: number;
}

export interface OrgReport {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  trackedSeconds: number;
  hoursByClient: ReportRow[];
  hoursByMember: ReportRow[];
}

const secondsExpr = sql<number>`coalesce(sum(extract(epoch from (coalesce(${timeEntries.endedAt}, now()) - ${timeEntries.startedAt}))), 0)`;

/** Agregados da org (todas as listas) para o painel de Relatórios. */
export async function getOrgReport(orgId: string): Promise<OrgReport> {
  return withOrg(orgId, async (tx) => {
    const [summary] = await tx
      .select({
        total: count(),
        completed: sql<number>`count(*) filter (where ${tasks.completed})`.mapWith(Number),
        overdue:
          sql<number>`count(*) filter (where ${tasks.dueDate} < now() and not ${tasks.completed})`.mapWith(
            Number,
          ),
      })
      .from(tasks)
      .where(and(isNull(tasks.parentId), isNull(tasks.deletedAt)));

    const [tracked] = await tx
      .select({ seconds: secondsExpr.mapWith(Number) })
      .from(timeEntries);

    const clientRows = await tx
      .select({
        id: sql<string>`coalesce(${clients.id}::text, 'none')`,
        name: sql<string>`coalesce(${clients.name}, 'Sem cliente')`,
        color: clients.color,
        seconds: secondsExpr.mapWith(Number),
      })
      .from(timeEntries)
      .innerJoin(tasks, eq(tasks.id, timeEntries.taskId))
      .leftJoin(clients, eq(clients.id, tasks.clientId))
      .groupBy(clients.id, clients.name, clients.color)
      .orderBy(sql`4 desc`);

    const memberRows = await tx
      .select({
        id: users.id,
        name: users.name,
        color: sql<string | null>`null`,
        seconds: secondsExpr.mapWith(Number),
      })
      .from(timeEntries)
      .innerJoin(users, eq(users.id, timeEntries.userId))
      .groupBy(users.id, users.name)
      .orderBy(sql`4 desc`);

    return {
      totalTasks: summary?.total ?? 0,
      completedTasks: summary?.completed ?? 0,
      overdueTasks: summary?.overdue ?? 0,
      trackedSeconds: Math.round(tracked?.seconds ?? 0),
      hoursByClient: clientRows
        .map((r) => ({ ...r, seconds: Math.round(r.seconds) }))
        .filter((r) => r.seconds > 0),
      hoursByMember: memberRows
        .map((r) => ({ ...r, seconds: Math.round(r.seconds) }))
        .filter((r) => r.seconds > 0),
    };
  });
}
