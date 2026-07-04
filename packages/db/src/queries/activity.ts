import { asc, eq, inArray } from "drizzle-orm";
import { withOrg, type Tx } from "../client";
import { activityLog, statuses } from "../schema";
import type { BoardTaskDTO } from "./board";

export interface ActivityDTO {
  id: string;
  actorName: string;
  action: string;
  detail: string | null;
  createdAt: Date;
}

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "Urgente",
  high: "Alta",
  normal: "Normal",
  low: "Baixa",
};

function fmtDate(d: Date | null): string {
  if (!d) return "sem prazo";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export async function getTaskActivity(orgId: string, taskId: string): Promise<ActivityDTO[]> {
  return withOrg(orgId, async (tx) => {
    const rows = await tx.query.activityLog.findMany({
      where: eq(activityLog.taskId, taskId),
      orderBy: [asc(activityLog.createdAt)],
    });
    return rows.map((r) => ({
      id: r.id,
      actorName: r.actorName,
      action: r.action,
      detail: r.detail,
      createdAt: r.createdAt,
    }));
  });
}

async function insertRows(
  tx: Tx,
  orgId: string,
  taskId: string,
  actorId: string | null,
  actorName: string,
  items: Array<{ action: string; detail: string | null }>,
) {
  if (items.length === 0) return;
  await tx.insert(activityLog).values(
    items.map((it) => ({ orgId, taskId, actorId, actorName, action: it.action, detail: it.detail })),
  );
}

/** Registra a criação de uma tarefa. */
export async function logCreated(
  orgId: string,
  taskId: string,
  actorId: string | null,
  actorName: string,
): Promise<void> {
  await withOrg(orgId, async (tx) => {
    await insertRows(tx, orgId, taskId, actorId, actorName, [{ action: "created", detail: null }]);
  });
}

/** Compara antes/depois de uma edição e registra as mudanças relevantes. */
export async function logTaskChanges(
  orgId: string,
  taskId: string,
  actorId: string | null,
  actorName: string,
  before: BoardTaskDTO,
  after: BoardTaskDTO,
): Promise<void> {
  await withOrg(orgId, async (tx) => {
    const items: Array<{ action: string; detail: string | null }> = [];

    if (before.title !== after.title) {
      items.push({ action: "title", detail: `${before.title} → ${after.title}` });
    }
    if (before.priority !== after.priority) {
      items.push({
        action: "priority",
        detail: `${PRIORITY_LABELS[before.priority]} → ${PRIORITY_LABELS[after.priority]}`,
      });
    }
    if (before.completed !== after.completed) {
      items.push({ action: "completed", detail: after.completed ? "Concluída" : "Reaberta" });
    }
    const beforeDue = before.dueDate ? new Date(before.dueDate).getTime() : null;
    const afterDue = after.dueDate ? new Date(after.dueDate).getTime() : null;
    if (beforeDue !== afterDue) {
      items.push({ action: "due", detail: `${fmtDate(before.dueDate)} → ${fmtDate(after.dueDate)}` });
    }
    if ((before.client?.id ?? null) !== (after.client?.id ?? null)) {
      items.push({
        action: "client",
        detail: `${before.client?.name ?? "sem cliente"} → ${after.client?.name ?? "sem cliente"}`,
      });
    }
    if (before.statusId !== after.statusId) {
      const ids = [before.statusId, after.statusId].filter((x): x is string => !!x);
      const names = ids.length
        ? await tx
            .select({ id: statuses.id, name: statuses.name })
            .from(statuses)
            .where(inArray(statuses.id, ids))
        : [];
      const nameOf = (id: string | null) =>
        (id && names.find((n) => n.id === id)?.name) || "—";
      items.push({
        action: "status",
        detail: `${nameOf(before.statusId)} → ${nameOf(after.statusId)}`,
      });
    }
    // Responsáveis: adicionados / removidos por nome.
    const beforeIds = new Set(before.assignees.map((a) => a.id));
    const afterIds = new Set(after.assignees.map((a) => a.id));
    const added = after.assignees.filter((a) => !beforeIds.has(a.id)).map((a) => a.name);
    const removed = before.assignees.filter((a) => !afterIds.has(a.id)).map((a) => a.name);
    if (added.length || removed.length) {
      const parts = [
        ...added.map((n) => `+${n}`),
        ...removed.map((n) => `−${n}`),
      ];
      items.push({ action: "assignees", detail: parts.join(", ") });
    }

    await insertRows(tx, orgId, taskId, actorId, actorName, items);
  });
}
