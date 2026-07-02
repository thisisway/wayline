import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getBoardForOrg, getUserOrgs, type BoardData } from "@wayline/db";
import { auth } from "@/auth";
import { ACTIVE_ORG_COOKIE } from "@/lib/constants";
import { AppView } from "@/components/app-view";

// Lê o banco a cada request (nunca prerenderiza no build, que não tem DB).
export const dynamic = "force-dynamic";

export default async function AppPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgs = await getUserOrgs(session.user.id);
  if (orgs.length === 0) redirect("/login");

  // Org ativa: cookie (se ainda for membro) ou a primeira.
  const cookieOrg = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  const activeOrg = orgs.find((o) => o.id === cookieOrg) ?? orgs[0]!;

  let data: BoardData | null = null;
  try {
    data = await getBoardForOrg(activeOrg.id, session.user.id);
  } catch (err) {
    console.error("Falha ao carregar o board do Postgres:", err);
  }

  return (
    <AppView
      data={data}
      orgs={orgs}
      activeOrgId={activeOrg.id}
      listName={data?.listName ?? "Launch Campaign"}
      userName={session.user.name ?? "Usuário"}
    />
  );
}
