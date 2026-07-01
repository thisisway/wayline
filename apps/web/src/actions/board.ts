"use server";

import { saveBoardOrder, type BoardOrderInput } from "@wayline/db";
import { revalidatePath } from "next/cache";

/** Persiste a nova ordem/coluna dos cards após um drag-and-drop. */
export async function saveBoard(order: BoardOrderInput[]): Promise<void> {
  await saveBoardOrder(order);
  revalidatePath("/app");
}
