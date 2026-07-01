import { eq } from "drizzle-orm";
import { getDb } from "../client";
import { tasks } from "../schema";

/** Nova ordem do board: para cada coluna (status), a sequência de task ids. */
export interface BoardOrderInput {
  statusId: string;
  taskIds: string[];
}

/**
 * Persiste a reordenação do board numa transação: cada task recebe o
 * `status_id` da sua coluna e a `position` = índice dentro dela.
 *
 * Determinístico — o client envia o estado final das colunas afetadas e o
 * servidor apenas o reconcilia (sem lógica de splice, sem race de índices).
 */
export async function saveBoardOrder(order: BoardOrderInput[]): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    for (const column of order) {
      for (let i = 0; i < column.taskIds.length; i++) {
        await tx
          .update(tasks)
          .set({ statusId: column.statusId, position: i, updatedAt: new Date() })
          .where(eq(tasks.id, column.taskIds[i]!));
      }
    }
  });
}
