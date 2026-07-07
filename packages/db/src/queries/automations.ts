import { and, asc, eq, inArray } from "drizzle-orm";
import { withOrg } from "../client";
import { automations, notifications, statuses, taskAssignees, tasks, users } from "../schema";

export type AutomationTriggerType = "status" | "approved" | "changes";
export type AutomationActionType = "assign" | "priority" | "move";

export interface AutomationDTO {
  id: string;
  triggerType: AutomationTriggerType;
  triggerStatusId: string | null;
  triggerLabel: string;
  actionType: AutomationActionType;
  actionValue: string;
  actionLabel: string;
}

export type AutomationTrigger =
  | { type: "status"; statusId: string }
  | { type: "approved" }
  | { type: "changes" };

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "Urgente",
  high: "Alta",
  normal: "Normal",
  low: "Baixa",
};

const TRIGGER_LABELS: Record<string, string> = {
  approved: "Cliente aprovar",
  changes: "Cliente pedir ajustes",
};

export async function listAutomations(orgId: string, listId: string): Promise<AutomationDTO[]> {
  return withOrg(orgId, async (tx) => {
    const rows = await tx.query.automations.findMany({
      where: eq(automations.listId, listId),
      orderBy: [asc(automations.createdAt)],
    });
    if (rows.length === 0) return [];

    // Nomes de status (gatilho 'status' e ação 'move') e de membros (ação 'assign').
    const statusIds = [
      ...new Set(
        rows
          .flatMap((r) => [
            r.triggerType === "status" ? r.triggerStatusId : null,
            r.actionType === "move" ? r.actionValue : null,
          ])
          .filter((x): x is string => !!x),
      ),
    ];
    const memberIds = rows.filter((r) => r.actionType === "assign").map((r) => r.actionValue);

    const statusRows = statusIds.length
      ? await tx.select({ id: statuses.id, name: statuses.name }).from(statuses).where(inArray(statuses.id, statusIds))
      : [];
    const memberRows = memberIds.length
      ? await tx.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, memberIds))
      : [];
    const statusName = new Map(statusRows.map((s) => [s.id, s.name]));
    const memberName = new Map(memberRows.map((u) => [u.id, u.name]));

    return rows.map((r) => ({
      id: r.id,
      triggerType: r.triggerType as AutomationTriggerType,
      triggerStatusId: r.triggerStatusId,
      triggerLabel:
        r.triggerType === "status"
          ? `Entrar em ${statusName.get(r.triggerStatusId ?? "") ?? "—"}`
          : (TRIGGER_LABELS[r.triggerType] ?? r.triggerType),
      actionType: r.actionType as AutomationActionType,
      actionValue: r.actionValue,
      actionLabel:
        r.actionType === "priority"
          ? (PRIORITY_LABELS[r.actionValue] ?? r.actionValue)
          : r.actionType === "move"
            ? (statusName.get(r.actionValue) ?? "—")
            : (memberName.get(r.actionValue) ?? "—"),
    }));
  });
}

export async function createAutomation(
  orgId: string,
  listId: string,
  triggerType: AutomationTriggerType,
  triggerStatusId: string | null,
  actionType: AutomationActionType,
  actionValue: string,
): Promise<void> {
  await withOrg(orgId, async (tx) => {
    await tx.insert(automations).values({
      orgId,
      listId,
      triggerType,
      triggerStatusId: triggerType === "status" ? triggerStatusId : null,
      actionType,
      actionValue,
    });
  });
}

export async function deleteAutomation(orgId: string, id: string): Promise<void> {
  await withOrg(orgId, async (tx) => {
    await tx.delete(automations).where(eq(automations.id, id));
  });
}

/** Aplica as automações disparadas por um gatilho numa tarefa. */
export async function applyAutomations(
  orgId: string,
  taskId: string,
  trigger: AutomationTrigger,
): Promise<boolean> {
  return withOrg(orgId, async (tx) => {
    const where =
      trigger.type === "status"
        ? and(
            eq(automations.triggerType, "status"),
            eq(automations.triggerStatusId, trigger.statusId),
          )
        : eq(automations.triggerType, trigger.type);
    const rules = await tx.query.automations.findMany({ where });
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
      } else if (r.actionType === "move") {
        // Move sem re-disparar automações de status (evita loop).
        await tx
          .update(tasks)
          .set({ statusId: r.actionValue, updatedAt: new Date() })
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
