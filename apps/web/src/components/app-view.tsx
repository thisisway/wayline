"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Database, LayoutGrid } from "lucide-react";
import type {
  AssignedComment,
  BoardData,
  MyTask,
  NavSpace,
  NotificationDTO,
  ReplyDTO,
  UserOrg,
} from "@wayline/db";
import { useTaskEditor } from "@/lib/use-task-editor";
import { IconRail } from "@/components/shell/icon-rail";
import { HomePanel } from "@/components/shell/home-panel";
import { MyTasksDrawer } from "@/components/shell/my-tasks-drawer";
import { InboxDrawer } from "@/components/shell/inbox-drawer";
import { CommentRefDrawer } from "@/components/shell/comment-ref-drawer";
import { ShortcutsHelp } from "@/components/shell/shortcuts-help";
import { Topbar } from "@/components/shell/topbar";
import { ViewTabs } from "@/components/shell/view-tabs";
import { DndBoard } from "@/components/board/dnd-board";
import { ListView } from "@/components/board/list-view";
import { CalendarView } from "@/components/board/calendar-view";
import { GanttView } from "@/components/board/gantt-view";
import { ChatView } from "@/components/board/chat-view";
import { ReportsView } from "@/components/board/reports-view";
import { DashboardView } from "@/components/board/dashboard-view";
import { CustomFieldsManager } from "@/components/board/custom-fields-manager";
import { AutomationsManager } from "@/components/board/automations-manager";
import { ShareModal } from "@/components/shell/share-modal";
import { DocPanel } from "@/components/panels/doc-panel";
import { ExecutiveSummaryPanel } from "@/components/panels/executive-summary";
import { useBoardLive } from "@/lib/use-board-live";
import { useNotificationsLive } from "@/lib/use-notifications-live";
import {
  applyFilters,
  collectCustomFieldOptions,
  collectTags,
  EMPTY_FILTERS,
  type BoardFilters,
} from "@/lib/board-filter";
import { boardToCsv, downloadCsv } from "@/lib/export-csv";

export function AppView({
  data,
  orgs,
  activeOrgId,
  nav,
  activeListId,
  myTasks,
  inbox,
  assignedComments,
  replies,
  listName,
  userName,
  isAdmin,
  isGuest,
  focusTaskId,
}: {
  data: BoardData | null;
  orgs: UserOrg[];
  activeOrgId: string;
  nav: NavSpace[];
  activeListId: string;
  myTasks: MyTask[];
  inbox: { items: NotificationDTO[]; unread: number };
  assignedComments: AssignedComment[];
  replies: ReplyDTO[];
  listName: string;
  userName: string;
  isAdmin: boolean;
  isGuest: boolean;
  focusTaskId?: string;
}) {
  const router = useRouter();
  const [view, setView] = React.useState("board");
  const [myTasksOpen, setMyTasksOpen] = React.useState(false);
  const [inboxOpen, setInboxOpen] = React.useState(false);
  const [assignedOpen, setAssignedOpen] = React.useState(false);
  const [repliesOpen, setRepliesOpen] = React.useState(false);
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
  const [fieldsOpen, setFieldsOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [automationsOpen, setAutomationsOpen] = React.useState(false);

  // Abre a tarefa vinda da busca/inbox (?task=<id>) e limpa o parâmetro.
  const focusEditor = useTaskEditor(data);
  React.useEffect(() => {
    if (!focusTaskId || !data) return;
    const task = data.columns.flatMap((c) => c.tasks).find((t) => t.id === focusTaskId);
    if (task) {
      focusEditor.openEdit(task);
      router.replace("/app");
    }
  }, [focusTaskId, data]);

  // Atalhos de teclado (power-user). Ignora quando digitando ou com modal aberto.
  React.useEffect(() => {
    const VIEW_KEYS: Record<string, string> = {
      "1": "board",
      "2": "list",
      "3": "calendar",
      "4": "gantt",
      "5": "chat",
      "6": "reports",
    };
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (document.querySelector('[role="dialog"]')) return; // modal aberto

      if (VIEW_KEYS[e.key]) setView(VIEW_KEYS[e.key]!);
      else if (e.key === "n") {
        if (data) focusEditor.openCreate(data.columns[0]?.id ?? "");
      } else if (e.key === "?") setShortcutsOpen(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [data, focusEditor]);
  const [filters, setFilters] = React.useState<BoardFilters>(EMPTY_FILTERS);
  const viewers = useBoardLive(data?.listId ?? "");
  useNotificationsLive();

  const filtered = React.useMemo(() => (data ? applyFilters(data, filters) : null), [data, filters]);
  const tagOptions = React.useMemo(() => (data ? collectTags(data) : []), [data]);
  const customFieldOptions = React.useMemo(
    () => (data ? collectCustomFieldOptions(data) : []),
    [data],
  );

  function handleExport() {
    if (!filtered) return;
    const safe = listName.trim().toLowerCase().replace(/\s+/g, "-") || "tarefas";
    downloadCsv(`wayline-${safe}.csv`, boardToCsv(filtered));
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas text-foreground">
      <IconRail />
      <HomePanel
        nav={nav}
        activeListId={activeListId}
        activeOrgId={activeOrgId}
        myTasksCount={myTasks.length}
        inboxUnread={inbox.unread}
        assignedCount={assignedComments.length}
        repliesCount={replies.length}
        onOpenMyTasks={() => setMyTasksOpen(true)}
        onOpenInbox={() => setInboxOpen(true)}
        onOpenAssigned={() => setAssignedOpen(true)}
        onOpenReplies={() => setRepliesOpen(true)}
        isAdmin={isAdmin}
      />
      {myTasksOpen && (
        <MyTasksDrawer myTasks={myTasks} onClose={() => setMyTasksOpen(false)} />
      )}
      {inboxOpen && (
        <InboxDrawer orgId={activeOrgId} items={inbox.items} onClose={() => setInboxOpen(false)} />
      )}
      {assignedOpen && (
        <CommentRefDrawer
          title="Assigned Comments"
          kind="assigned"
          items={assignedComments}
          onClose={() => setAssignedOpen(false)}
        />
      )}
      {repliesOpen && (
        <CommentRefDrawer
          title="Replies"
          kind="replies"
          items={replies}
          onClose={() => setRepliesOpen(false)}
        />
      )}
      {focusEditor.modal}
      {shortcutsOpen && <ShortcutsHelp onClose={() => setShortcutsOpen(false)} />}
      {fieldsOpen && data && (
        <CustomFieldsManager
          orgId={activeOrgId}
          listId={data.listId}
          listName={listName}
          onClose={() => setFieldsOpen(false)}
        />
      )}
      {shareOpen && data && (
        <ShareModal
          orgId={activeOrgId}
          listId={data.listId}
          listName={listName}
          onClose={() => setShareOpen(false)}
        />
      )}
      {automationsOpen && data && (
        <AutomationsManager
          orgId={activeOrgId}
          listId={data.listId}
          listName={listName}
          columns={data.columns.map((c) => ({ id: c.id, name: c.name }))}
          members={data.members}
          onClose={() => setAutomationsOpen(false)}
        />
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <Topbar
          userName={userName}
          orgs={orgs}
          activeOrgId={activeOrgId}
          inboxUnread={inbox.unread}
          onOpenInbox={() => setInboxOpen(true)}
          isAdmin={isAdmin}
        />
        <ViewTabs
          value={view}
          onValueChange={setView}
          listName={listName}
          viewers={viewers}
          filters={filters}
          onFiltersChange={setFilters}
          clients={data?.clients ?? []}
          members={data?.members ?? []}
          tags={tagOptions}
          customFieldOptions={customFieldOptions}
          onOpenFields={() => setFieldsOpen(true)}
          onExport={handleExport}
          onShare={() => setShareOpen(true)}
          onOpenAutomations={() => setAutomationsOpen(true)}
          isAdmin={isAdmin}
        />

        {view === "board" ? (
          !data || data.columns.length === 0 ? (
            <EmptyBoard />
          ) : (
            <div className="relative min-h-0 flex-1">
              {/* key por lista: remonta (reseta o estado local) ao trocar de org/board */}
              <DndBoard key={data.listId} data={filtered!} isAdmin={isAdmin} isGuest={isGuest} />

              {data.columns.some((c) => c.tasks.length > 0) && (
                <>
                  <div className="pointer-events-none absolute bottom-5 left-4 z-20">
                    <DocPanel orgId={data.orgId} listId={data.listId} listName={listName} />
                  </div>
                  <div className="pointer-events-none absolute bottom-5 right-4 z-20">
                    <ExecutiveSummaryPanel data={data} />
                  </div>
                </>
              )}
            </div>
          )
        ) : view === "list" ? (
          !data || data.columns.length === 0 ? (
            <EmptyBoard />
          ) : (
            <ListView data={filtered!} />
          )
        ) : view === "calendar" ? (
          !data || data.columns.length === 0 ? (
            <EmptyBoard />
          ) : (
            <CalendarView data={filtered!} />
          )
        ) : view === "gantt" ? (
          !data || data.columns.length === 0 ? (
            <EmptyBoard />
          ) : (
            <GanttView data={filtered!} />
          )
        ) : view === "chat" ? (
          !data ? (
            <EmptyBoard />
          ) : (
            <ChatView
              orgId={data.orgId}
              listId={data.listId}
              currentUserId={data.currentUserId}
            />
          )
        ) : view === "reports" ? (
          <ReportsView orgId={activeOrgId} />
        ) : view === "dashboard" ? (
          <DashboardView orgId={activeOrgId} />
        ) : (
          <PlaceholderView view={view} />
        )}
      </main>
    </div>
  );
}

function EmptyBoard() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-elevated text-muted">
        <Database className="size-6" />
      </span>
      <div>
        <p className="font-display text-h3 font-bold">Board vazio</p>
        <p className="mt-1 max-w-sm text-ui text-muted">
          Sem lista/colunas no Postgres ainda. Rode o seed (
          <code>pnpm --filter @wayline/db db:seed</code>) ou verifique a conexão com o banco.
        </p>
      </div>
    </div>
  );
}

function PlaceholderView({ view }: { view: string }) {
  const labels: Record<string, string> = {
    chat: "Chat",
    list: "List",
    gantt: "Gantt",
    calendar: "Calendar",
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-elevated text-muted">
        <LayoutGrid className="size-6" />
      </span>
      <div>
        <p className="font-display text-h3 font-bold">View “{labels[view] ?? view}”</p>
        <p className="mt-1 text-ui text-muted">
          Renderizador em breve — a engine de views alimenta todas as visões a partir da mesma base.
        </p>
      </div>
    </div>
  );
}
