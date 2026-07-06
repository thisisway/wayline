import { and, asc, eq } from "drizzle-orm";
import { withOrg } from "../client";
import { automations, notifications, statuses, taskAssignees, tasks, users } from "../schema";

export type AutomationActionType = "assign" | "priority";

export interface AutomationDTO {
  id: string;
  triggerStatusId: string;
  triggerStatusName: string;
  actionType: AutomationActionType;
  actionValue: string;
  /** Rótulo legível do alvo (nome do membro ou da prioridade). */
  actionLabel: string;
}

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "Urgente",
  high: "Alta",
  normal: "Normal",
  low: "Baixa",
};

export async function listAutomations(orgId: string, listId: string): Promise<AutomationDTO[]> {
  return withOrg(orgId, async (tx) => {
    const rows = await tx
      .select({
        id: automations.id,
        triggerStatusId: automations.triggerStatusId,
        statusName: statuses.name,
        actionType: automations.actionType,
        actionValue: automations.actionValue,
        memberName: users.name,
      })
      .from(automations)
      .leftJoin(statuses, eq(statuses.id, automations.triggerStatusId))
      .leftJoin(users, eq(users.id, automations.actionValue))
      .where(eq(automations.listId, listId))
      .orderBy(asc(automations.createdAt));

    return rows.map((r) => ({
      id: r.id,
      triggerStatusId: r.triggerStatusId,
      triggerStatusName: r.statusName ?? "—",
      actionType: r.actionType as AutomationActionType,
      actionValue: r.actionValue,
      actionLabel:
        r.actionType === "priority"
          ? (PRIORITY_LABELS[r.actionValue] ?? r.actionValue)
          : (r.memberName ?? "—"),
    }));
  });
}

export async function createAutomation(
  orgId: string,
  listId: string,
  triggerStatusId: string,
  actionType: AutomationActionType,
  actionValue: string,
): Promise<void> {
  await withOrg(orgId, async (tx) => {
    await tx.insert(automations).values({ orgId, listId, triggerStatusId, actionType, actionValue });
  });
}

export async function deleteAutomation(orgId: string, id: string): Promise<void> {
  await withOrg(orgId, async (tx) => {
    await tx.delete(automations).where(eq(automations.id, id));
  });
}

/**
 * Aplica as automações disparadas quando uma tarefa entra numa coluna.
 * Retorna true se algo mudou (para recarregar o card).
 */
export async function applyAutomations(
  orgId: string,
  statusId: string,
  taskId: string,
): Promise<boolean> {
  return withOrg(orgId, async (tx) => {
    const rules = await tx.query.automations.findMany({
      where: eq(automations.triggerStatusId, statusId),
    });
    if (rules.length === 0) return false;
    const task = await tx.query.tasks.findFirst({ where: eq(tasks.id, taskId) });
    if (!task) return false;

    let changed = false;
    for (const r of rules) {
      if (r.actionType === "priority") {
        await tx
          .update(tasks)
          .set({ priority: r.actionValue as "urgent" | "high" | "normal" | "low", updatedAt: new Date() })
          .where(eq(tasks.id, taskId));
        changed = true;
      } else if (r.actionType === "assign") {
        const existing = await tx.query.taskAssignees.findFirst({
          where: and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, r.actionValue)),
        });
        if (!existing) {
          await tx.insert(taskAssignees).values({ orgId, taskId, userId: r.actionValue });
          await tx.insert(notifications).values({
            orgId,
            userId: r.actionValue,
            type: "assigned",
            taskId,
            listId: task.listId,
            taskTitle: task.title,
            actorName: "Automação",
          });
          changed = true;
        }
      }
    }
    return changed;
  });
}
