import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getBoardForOrg,
  getMyTasks,
  getUserOrgs,
  getWorkspaceNav,
  type BoardData,
  type MyTask,
  type NavSpace,
} from "@wayline/db";
import { auth } from "@/auth";
import { ACTIVE_LIST_COOKIE, ACTIVE_ORG_COOKIE } from "@/lib/constants";
import { AppView } from "@/components/app-view";

// Lê o banco a cada request (nunca prerenderiza no build, que não tem DB).
export const dynamic = "force-dynamic";

export default async function AppPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgs = await getUserOrgs(session.user.id);
  if (orgs.length === 0) redirect("/login");

  const store = await cookies();

  // Org ativa: cookie (se ainda for membro) ou a primeira.
  const cookieOrg = store.get(ACTIVE_ORG_COOKIE)?.value;
  const activeOrg = orgs.find((o) => o.id === cookieOrg) ?? orgs[0]!;

  // Nav (spaces/lists) da org ativa + lista ativa (cookie, se pertencer à org).
  let nav: NavSpace[] = [];
  let data: BoardData | null = null;
  let myTasks: MyTask[] = [];
  try {
    nav = await getWorkspaceNav(activeOrg.id);
    const orgListIds = new Set(nav.flatMap((s) => s.lists.map((l) => l.id)));
    const cookieList = store.get(ACTIVE_LIST_COOKIE)?.value;
    const activeListId = cookieList && orgListIds.has(cookieList) ? cookieList : undefined;
    data = await getBoardForOrg(activeOrg.id, session.user.id, activeListId);
    myTasks = await getMyTasks(activeOrg.id, session.user.id);
  } catch (err) {
    console.error("Falha ao carregar o board do Postgres:", err);
  }

  return (
    <AppView
      data={data}
      orgs={orgs}
      activeOrgId={activeOrg.id}
      nav={nav}
      activeListId={data?.listId ?? ""}
      myTasks={myTasks}
      listName={data?.listName ?? "Tarefas"}
      userName={session.user.name ?? "Usuário"}
    />
  );
}
