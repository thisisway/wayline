import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getAssignedComments,
  getBoardForOrg,
  getMyReplies,
  getMyTasks,
  getNotifications,
  getUserOrgs,
  getUserProfile,
  getWorkspaceNav,
  type AssignedComment,
  type BoardData,
  type MyTask,
  type NavSpace,
  type NotificationDTO,
  type ReplyDTO,
} from "@wayline/db";
import { auth } from "@/auth";
import { ACTIVE_LIST_COOKIE, ACTIVE_ORG_COOKIE } from "@/lib/constants";
import { AppView } from "@/components/app-view";

// Lê o banco a cada request (nunca prerenderiza no build, que não tem DB).
export const dynamic = "force-dynamic";

export default async function AppPage({
  searchParams,
}: {
  searchParams: Promise<{ task?: string }>;
}) {
  const { task: focusTaskId } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgs = await getUserOrgs(session.user.id);
  if (orgs.length === 0) redirect("/login");

  // Avatar vem do banco (não do JWT): reflete edições sem exigir novo login.
  const profile = await getUserProfile(session.user.id);

  const store = await cookies();

  // Org ativa: cookie (se ainda for membro) ou a primeira.
  const cookieOrg = store.get(ACTIVE_ORG_COOKIE)?.value;
  const activeOrg = orgs.find((o) => o.id === cookieOrg) ?? orgs[0]!;

  // Nav (spaces/lists) da org ativa + lista ativa (cookie, se pertencer à org).
  let nav: NavSpace[] = [];
  let data: BoardData | null = null;
  let myTasks: MyTask[] = [];
  let inbox: { items: NotificationDTO[]; unread: number } = { items: [], unread: 0 };
  let assignedComments: AssignedComment[] = [];
  let replies: ReplyDTO[] = [];
  // Guest: enxerga só listas/tarefas em que participa (visibilidade restrita).
  const guestId = activeOrg.role === "guest" ? session.user.id : null;
  try {
    nav = await getWorkspaceNav(activeOrg.id, guestId);
    const orgListIds = new Set(nav.flatMap((s) => s.lists.map((l) => l.id)));
    const cookieList = store.get(ACTIVE_LIST_COOKIE)?.value;
    const activeListId = cookieList && orgListIds.has(cookieList) ? cookieList : undefined;
    data = await getBoardForOrg(activeOrg.id, session.user.id, activeListId, guestId);
    myTasks = await getMyTasks(activeOrg.id, session.user.id);
    inbox = await getNotifications(activeOrg.id, session.user.id);
    assignedComments = await getAssignedComments(activeOrg.id, session.user.id);
    replies = await getMyReplies(activeOrg.id, session.user.id);
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
      inbox={inbox}
      assignedComments={assignedComments}
      replies={replies}
      listName={data?.listName ?? "Tarefas"}
      userName={session.user.name ?? "Usuário"}
      userAvatar={profile?.avatarUrl ?? undefined}
      isAdmin={activeOrg.role === "owner" || activeOrg.role === "admin"}
      isGuest={activeOrg.role === "guest"}
      focusTaskId={focusTaskId}
    />
  );
}
