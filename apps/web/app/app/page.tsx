import { redirect } from "next/navigation";
import { getBoardForOrg, type BoardData } from "@wayline/db";
import { auth } from "@/auth";
import { AppView } from "@/components/app-view";

// Lê o banco a cada request (nunca prerenderiza no build, que não tem DB).
export const dynamic = "force-dynamic";

export default async function AppPage() {
  const session = await auth();
  if (!session?.orgId) redirect("/login");

  let data: BoardData | null = null;
  try {
    data = await getBoardForOrg(session.orgId, session.user.id);
  } catch (err) {
    console.error("Falha ao carregar o board do Postgres:", err);
  }

  return (
    <AppView
      data={data}
      listName={data?.listName ?? "Launch Campaign"}
      userName={session.user.name ?? "Usuário"}
    />
  );
}
