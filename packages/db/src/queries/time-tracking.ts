import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { withOrg } from "../client";
import { timeEntries } from "../schema";

export interface TimeEntryDTO {
  id: string;
  taskId: string;
  user: { id: string; name: string; avatarUrl: string | null };
  startedAt: Date;
  endedAt: Date | null;
  /** Segundos decorridos (até agora se estiver rodando). */
  seconds: number;
  running: boolean;
  note: string | null;
}

/** Cronômetro em andamento do usuário (em qualquer tarefa), se houver. */
export interface RunningTimer {
  id: string;
  taskId: string;
  startedAt: Date;
}

function toDTO(row: {
  id: string;
  taskId: string;
  startedAt: Date;
  endedAt: Date | null;
  note: string | null;
  user: { id: string; name: string; avatarUrl: string | null } | null;
}): TimeEntryDTO {
  const end = row.endedAt ?? new Date();
  const seconds = Math.max(0, Math.round((end.getTime() - row.startedAt.getTime()) / 1000));
  return {
    id: row.id,
    taskId: row.taskId,
    user: row.user ?? { id: "", name: "—", avatarUrl: null },
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    seconds,
    running: row.endedAt === null,
    note: row.note,
  };
}

export async function getTaskTimeEntries(orgId: string, taskId: string): Promise<TimeEntryDTO[]> {
  return withOrg(orgId, async (tx) => {
    const rows = await tx.query.timeEntries.findMany({
      where: eq(timeEntries.taskId, taskId),
      orderBy: [desc(timeEntries.startedAt)],
      with: { user: true },
    });
    return rows.map(toDTO);
  });
}

export async function getRunningTimer(
  orgId: string,
  userId: string,
): Promise<RunningTimer | null> {
  return withOrg(orgId, async (tx) => {
    const row = await tx.query.timeEntries.findFirst({
      where: and(eq(timeEntries.userId, userId), isNull(timeEntries.endedAt)),
    });
    return row ? { id: row.id, taskId: row.taskId, startedAt: row.startedAt } : null;
  });
}

/** Inicia um cronômetro; encerra qualquer outro em andamento do mesmo usuário. */
export async function startTimer(
  orgId: string,
  taskId: string,
  userId: string,
): Promise<TimeEntryDTO> {
  return withOrg(orgId, async (tx) => {
    await tx
      .update(timeEntries)
      .set({ endedAt: new Date() })
      .where(and(eq(timeEntries.userId, userId), isNull(timeEntries.endedAt)));
    const [row] = await tx
      .insert(timeEntries)
      .values({ orgId, taskId, userId })
      .returning();
    if (!row) throw new Error("falha ao iniciar cronômetro");
    const withUser = await tx.query.timeEntries.findFirst({
      where: eq(timeEntries.id, row.id),
      with: { user: true },
    });
    return toDTO(withUser!);
  });
}

export async function stopTimer(orgId: string, entryId: string): Promise<TimeEntryDTO | null> {
  return withOrg(orgId, async (tx) => {
    await tx
      .update(timeEntries)
      .set({ endedAt: new Date() })
      .where(and(eq(timeEntries.id, entryId), isNull(timeEntries.endedAt)));
    const row = await tx.query.timeEntries.findFirst({
      where: eq(timeEntries.id, entryId),
      with: { user: true },
    });
    return row ? toDTO(row) : null;
  });
}

/** Lançamento manual (started = now - seconds). */
export async function addManualEntry(
  orgId: string,
  taskId: string,
  userId: string,
  seconds: number,
  note: string | null,
): Promise<TimeEntryDTO> {
  return withOrg(orgId, async (tx) => {
    const endedAt = new Date();
    const startedAt = new Date(endedAt.getTime() - Math.max(1, seconds) * 1000);
    const [row] = await tx
      .insert(timeEntries)
      .values({ orgId, taskId, userId, startedAt, endedAt, note })
      .returning();
    if (!row) throw new Error("falha ao lançar tempo");
    const withUser = await tx.query.timeEntries.findFirst({
      where: eq(timeEntries.id, row.id),
      with: { user: true },
    });
    return toDTO(withUser!);
  });
}

export async function deleteTimeEntry(orgId: string, entryId: string): Promise<void> {
  await withOrg(orgId, async (tx) => {
    await tx.delete(timeEntries).where(eq(timeEntries.id, entryId));
  });
}

/** Segundos totais rastreados numa tarefa (concluídos + em andamento). */
export async function getTaskTrackedSeconds(orgId: string, taskId: string): Promise<number> {
  return withOrg(orgId, async (tx) => {
    const [row] = await tx
      .select({
        total: sql<number>`coalesce(sum(extract(epoch from (coalesce(${timeEntries.endedAt}, now()) - ${timeEntries.startedAt}))), 0)`.mapWith(
          Number,
        ),
      })
      .from(timeEntries)
      .where(eq(timeEntries.taskId, taskId));
    return Math.round(row?.total ?? 0);
  });
}
