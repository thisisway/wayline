import { getDefaultBoard, type BoardData } from "@wayline/db";
import { AppView } from "@/components/app-view";

// Lê o banco a cada request (nunca prerenderiza no build, que não tem DB).
export const dynamic = "force-dynamic";

export default async function AppPage() {
  let data: BoardData | null = null;

  try {
    data = await getDefaultBoard();
  } catch (err) {
    // Sem DATABASE_URL ou banco inacessível: cai no estado vazio da UI.
    console.error("Falha ao carregar o board do Postgres:", err);
  }

  return <AppView data={data} listName={data?.listName ?? "Launch Campaign"} />;
}
