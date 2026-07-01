import { getDefaultBoard } from "@wayline/db";
import { AppView } from "@/components/app-view";
import { mapBoard } from "@/lib/board";
import type { BoardColumn } from "@/mock/types";

// Lê o banco a cada request (nunca prerenderiza no build, que não tem DB).
export const dynamic = "force-dynamic";

export default async function AppPage() {
  let board: BoardColumn[] = [];
  let listName = "Launch Campaign";

  try {
    const data = await getDefaultBoard();
    if (data) {
      board = mapBoard(data);
      listName = data.listName;
    }
  } catch (err) {
    // Sem DATABASE_URL ou banco inacessível: cai no estado vazio da UI.
    console.error("Falha ao carregar o board do Postgres:", err);
  }

  return <AppView board={board} listName={listName} />;
}
