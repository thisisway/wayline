import type { BoardData, BoardTaskDTO } from "@wayline/db";
import type { BoardColumn, TaskCard } from "@/mock/types";

/**
 * Mapeia o board vindo do Postgres (@wayline/db) para o view-model que os
 * renderizadores já consomem. Campos ainda sem tabela (anexos/comentários)
 * ficam em 0 e o card os oculta — entram na Fase 1.2.
 */

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function startOfDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function formatDue(due: Date | null, completed: boolean): { label?: string; overdue: boolean } {
  if (!due) return { overdue: false };
  const today = startOfDay(new Date());
  const target = startOfDay(due);
  const diffDays = Math.round((target - today) / 86_400_000);
  const overdue = !completed && diffDays < 0;
  let label: string;
  if (diffDays === 0) label = "Hoje";
  else if (diffDays === 1) label = "Amanhã";
  else label = `${due.getUTCDate()} ${MONTHS[due.getUTCMonth()]}`;
  return { label, overdue };
}

export function mapTaskDTO(t: BoardTaskDTO): TaskCard {
  const { label, overdue } = formatDue(t.dueDate, t.completed);
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    client: t.client ?? undefined,
    assignees: t.assignees.map((a) => ({
      id: a.id,
      name: a.name,
      avatarUrl: a.avatarUrl ?? undefined,
    })),
    priority: t.priority,
    dueLabel: label,
    overdue,
    tags: t.tags,
    attachments: t.attachmentCount,
    comments: t.commentCount,
    subtasks: t.subtaskTotal > 0 ? { done: t.subtaskDone, total: t.subtaskTotal } : undefined,
    blocked: t.blocked,
    approvalStatus: t.approvalStatus,
    recurrence: t.recurrence,
    trackedSeconds: t.trackedSeconds,
    estimateMinutes: t.estimateMinutes,
    customFields: t.customFields,
  };
}

/** Payload do formulário de tarefa (serializável; dueDate como yyyy-mm-dd). */
export interface TaskFormInput {
  statusId: string;
  title: string;
  description: string;
  priority: "urgent" | "high" | "normal" | "low";
  clientId: string | null;
  startDate: string | null;
  dueDate: string | null;
  /** Estimativa em horas (string p/ aceitar vazio/decimal). */
  estimateHours: string;
  /** Recorrência: "" | "daily" | "weekly" | "monthly". */
  recurrence: string;
  assigneeIds: string[];
  tags: Array<{ label: string; color: string }>;
}

/** Valores iniciais do form a partir de um card existente (modo edição). */
export function dtoToForm(dto: BoardTaskDTO): TaskFormInput {
  return {
    statusId: dto.statusId ?? "",
    title: dto.title,
    description: dto.description ?? "",
    priority: dto.priority,
    clientId: dto.client?.id ?? null,
    startDate: dto.startDate ? dto.startDate.toISOString().slice(0, 10) : null,
    dueDate: dto.dueDate ? dto.dueDate.toISOString().slice(0, 10) : null,
    estimateHours:
      dto.estimateMinutes != null ? String(+(dto.estimateMinutes / 60).toFixed(2)) : "",
    recurrence: dto.recurrence ?? "",
    assigneeIds: dto.assignees.map((a) => a.id),
    tags: dto.tags,
  };
}

export function mapBoard(data: BoardData): BoardColumn[] {
  return data.columns.map((col) => ({
    id: col.id,
    name: col.name,
    kind: /review/i.test(col.name) ? "review" : col.kind,
    color: col.color,
    cards: col.tasks.map(mapTaskDTO),
  }));
}
