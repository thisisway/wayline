"use server";

import { publish } from "@/lib/live";

/** Sinaliza aos outros clientes que o board da lista mudou (fire-and-forget). */
export async function pokeList(listId: string): Promise<void> {
  if (listId) publish(listId);
}
