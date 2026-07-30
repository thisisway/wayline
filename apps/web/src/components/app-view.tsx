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
import { MindMapView } from "@/components/board/mindmap-view";
import { DocsView } from "@/components/board/docs-view";
import { CustomFieldsManager } from "@/components/board/custom-fields-manager";
import { AutomationsManager } from "@/components/board/automations-manager";
import { ShareModal } from "@/components/shell/share-modal";
import { CommercialPage } from "@/components/shell/commercial-page";
import { FinancePage } from "@/components/shell/finance-page";
import { FormsPage } from "@/components/shell/forms-page";
import { WelcomeChecklist, type OnboardStep } from "@/components/shell/welcome-checklist";
import { CheckSquare, ClipboardList as ClipboardIcon, Briefcase as BriefcaseIcon, Settings as SettingsIcon } from "lucide-react";
import { OverviewModal } from "@/components/shell/overview-modal";
import { ClientsModal } from "@/components/shell/clients-modal";
import { ProposalsModal } from "@/components/shell/proposals-modal";
import { ServicesModal } from "@/components/shell/services-modal";
import { PortfolioModal } from "@/components/shell/portfolio-modal";
import { ContractsModal } from "@/components/shell/contracts-modal";
import { SettingsModal } from "@/components/shell/settings-modal";
import { IntegrationsModal } from "@/components/shell/integrations-modal";
import { SupportModal } from "@/components/shell/support-modal";
import { PlansModal } from "@/components/shell/plans-modal";
import { CommandPalette } from "@/components/shell/command-palette";
import { DocPanel } from "@/components/panels/doc-panel";
import { ExecutiveSummaryPanel } from "@/components/panels/executive-summary";
import { BrainModal } from "@/components/panels/brain-modal";
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
import { supportAwaitingCountAction } from "@/actions/support";
import type { PlanFlags } from "@/lib/plans";
import { Lock } from "lucide-react";

/** Views que o usuário alterna nas abas (persistíveis como preferência). */
const BOARD_VIEWS = new Set(["board", "list", "calendar", "gantt", "chat", "reports", "dashboard", "mindmap", "docs"]);

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
  userAvatar,
  isAdmin,
  isGuest,
  isPlatformAdmin = false,
  planFlags,
  trialDaysLeft = 0,
  platformLogo,
  platformLogoDark,
  platformIcon,
  modules = [],
  focusTaskId,
  focusTicketId,
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
  userAvatar?: string;
  isAdmin: boolean;
  isGuest: boolean;
  isPlatformAdmin?: boolean;
  planFlags: PlanFlags;
  trialDaysLeft?: number;
  platformLogo?: string | null;
  platformLogoDark?: string | null;
  platformIcon?: string | null;
  modules?: string[];
  focusTaskId?: string;
  focusTicketId?: string;
}) {
  const router = useRouter();
  const [view, setView] = React.useState("board");

  // Preferência de visualização: abre na última view de board usada (por navegador).
  React.useEffect(() => {
    try {
      const v = localStorage.getItem("wl_default_view");
      if (v && BOARD_VIEWS.has(v)) setView(v);
    } catch {
      /* sem storage: mantém board */
    }
  }, []);
  React.useEffect(() => {
    if (BOARD_VIEWS.has(view)) {
      try {
        localStorage.setItem("wl_default_view", view);
      } catch {
        /* ignora */
      }
    }
  }, [view]);
  const [myTasksOpen, setMyTasksOpen] = React.useState(false);
  const [inboxOpen, setInboxOpen] = React.useState(false);
  const [assignedOpen, setAssignedOpen] = React.useState(false);
  const [repliesOpen, setRepliesOpen] = React.useState(false);
  const [shortcutsOpen, setShortcutsOpen] = React.useState(false);
  const [fieldsOpen, setFieldsOpen] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [automationsOpen, setAutomationsOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [brainOpen, setBrainOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [integrationsOpen, setIntegrationsOpen] = React.useState(false);
  const [supportOpen, setSupportOpen] = React.useState(false);
  const [supportInitialTicket, setSupportInitialTicket] = React.useState<string | null>(null);
  const [supportAwaiting, setSupportAwaiting] = React.useState(0);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [plansOpen, setPlansOpen] = React.useState(false);
  const [trialHidden, setTrialHidden] = React.useState(false);
  const [overviewOpen, setOverviewOpen] = React.useState(false);
  const [clientsOpen, setClientsOpen] = React.useState(false);
  const [proposalsOpen, setProposalsOpen] = React.useState(false);
  const [servicesOpen, setServicesOpen] = React.useState(false);
  const [portfolioOpen, setPortfolioOpen] = React.useState(false);
  const [contractsOpen, setContractsOpen] = React.useState(false);
  const salesEnabled = modules.includes("sales");

  const activeOrg = orgs.find((o) => o.id === activeOrgId);
  const orgName = activeOrg?.name ?? "Workspace";
  const orgPlan = activeOrg?.plan ?? "free";

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

  // Abre a conversa do chamado vinda do sino (?ticket=<id>) e limpa o parâmetro.
  React.useEffect(() => {
    if (!focusTicketId) return;
    setSupportInitialTicket(focusTicketId);
    setSupportOpen(true);
    router.replace("/app");
  }, [focusTicketId]);

  // Badge de "aguardando você" no ícone de Suporte; recarrega ao fechar o modal.
  React.useEffect(() => {
    if (supportOpen) return;
    supportAwaitingCountAction(activeOrgId).then(setSupportAwaiting);
  }, [supportOpen, activeOrgId]);

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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
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

  // Onboarding: passos de primeiros passos (o card some quando concluído/dispensado).
  const taskCount = React.useMemo(
    () => (data ? data.columns.reduce((n, c) => n + c.tasks.length, 0) : 0),
    [data],
  );
  const onboardingSteps: OnboardStep[] = React.useMemo(() => {
    const steps: OnboardStep[] = [
      {
        id: "task",
        label: "Crie uma tarefa",
        icon: CheckSquare,
        done: taskCount > 3, // além das 3 tarefas de exemplo
        onClick: () => data && focusEditor.openCreate(data.columns[0]?.id ?? ""),
      },
      { id: "forms", label: "Monte um formulário", icon: ClipboardIcon, onClick: () => setView("forms") },
      { id: "settings", label: "Personalize sua conta", icon: SettingsIcon, onClick: () => setSettingsOpen(true) },
    ];
    if (isAdmin) {
      steps.splice(1, 0, {
        id: "comercial",
        label: "Explore o Comercial",
        icon: BriefcaseIcon,
        onClick: () => setView("comercial"),
      });
    }
    return steps;
  }, [taskCount, data, isAdmin, focusEditor]);

  // Views bloqueadas por plano (a aba mostra cadeado e abre a tela de Planos).
  const VIEW_FLAG: Partial<Record<string, keyof PlanFlags>> = {
    gantt: "gantt",
    mindmap: "mindmap",
    dashboard: "dashboard",
  };
  const viewLocked = (v: string): boolean => {
    const f = VIEW_FLAG[v];
    return f ? !planFlags[f] : false;
  };

  function handleExport() {
    if (!filtered) return;
    const safe = listName.trim().toLowerCase().replace(/\s+/g, "-") || "tarefas";
    downloadCsv(`wayline-${safe}.csv`, boardToCsv(filtered));
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas text-foreground">
      <IconRail
        icon={platformIcon}
        logoLight={platformLogo}
        logoDark={platformLogoDark}
        activeView={view}
        sidebarOpen={sidebarOpen}
        onCreate={() => data && focusEditor.openCreate(data.columns[0]?.id ?? "")}
        onHome={() => setView("board")}
        onToggleSidebar={() => setSidebarOpen((s) => !s)}
        onOpenMyTasks={() => setMyTasksOpen(true)}
        onOpenBrain={() => setBrainOpen(true)}
        onOpenComercial={() => setView("comercial")}
        onOpenFinance={() => setView("finance")}
        onOpenForms={() => setView("forms")}
        onOpenSupport={() => setSupportOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        showComercial={isAdmin}
        showFinance={isAdmin}
        supportBadge={supportAwaiting}
      />
      {sidebarOpen && (
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
          onCollapse={() => setSidebarOpen(false)}
        />
      )}
      {overviewOpen && (
        <OverviewModal orgId={activeOrgId} onClose={() => setOverviewOpen(false)} />
      )}
      {clientsOpen && <ClientsModal orgId={activeOrgId} onClose={() => setClientsOpen(false)} />}
      {proposalsOpen && (
        <ProposalsModal orgId={activeOrgId} onClose={() => setProposalsOpen(false)} />
      )}
      {servicesOpen && <ServicesModal orgId={activeOrgId} onClose={() => setServicesOpen(false)} />}
      {portfolioOpen && (
        <PortfolioModal orgId={activeOrgId} onClose={() => setPortfolioOpen(false)} />
      )}
      {contractsOpen && (
        <ContractsModal orgId={activeOrgId} onClose={() => setContractsOpen(false)} />
      )}
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
      {searchOpen && (
        <CommandPalette orgId={activeOrgId} onClose={() => setSearchOpen(false)} />
      )}
      {brainOpen && (
        <BrainModal data={data} listName={listName} onClose={() => setBrainOpen(false)} />
      )}
      {settingsOpen && (
        <SettingsModal
          userName={userName}
          orgName={orgName}
          orgId={activeOrgId}
          isAdmin={isAdmin}
          onOpenShortcuts={() => setShortcutsOpen(true)}
          onOpenPlans={() => setPlansOpen(true)}
          onOpenIntegrations={() => setIntegrationsOpen(true)}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {integrationsOpen && (
        <IntegrationsModal orgId={activeOrgId} onClose={() => setIntegrationsOpen(false)} />
      )}
      {plansOpen && (
        <PlansModal
          orgId={activeOrgId}
          currentPlan={orgPlan}
          onClose={() => setPlansOpen(false)}
        />
      )}
      {supportOpen && (
        <SupportModal
          orgId={activeOrgId}
          orgName={orgName}
          initialTicketId={supportInitialTicket}
          onClose={() => {
            setSupportOpen(false);
            setSupportInitialTicket(null);
          }}
        />
      )}
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
        {trialDaysLeft > 0 && !trialHidden && (
          <div className="flex h-9 shrink-0 items-center justify-center gap-3 bg-brand px-4 text-dense font-medium text-white">
            <span>
              🎉 Teste grátis do <strong>Business</strong> —{" "}
              {trialDaysLeft} {trialDaysLeft === 1 ? "dia restante" : "dias restantes"}.
            </span>
            <button
              type="button"
              onClick={() => setPlansOpen(true)}
              className="rounded-md bg-white/20 px-2.5 py-0.5 font-semibold transition-colors hover:bg-white/30"
            >
              Ver planos
            </button>
            <button
              type="button"
              onClick={() => setTrialHidden(true)}
              aria-label="Ocultar"
              className="ml-1 text-white/70 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}
        <Topbar
          userName={userName}
          userAvatar={userAvatar}
          orgs={orgs}
          activeOrgId={activeOrgId}
          inboxUnread={inbox.unread}
          onOpenInbox={() => setInboxOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenBrain={() => setBrainOpen(true)}
          onOpenPlans={() => setPlansOpen(true)}
          isAdmin={isAdmin}
          isPlatformAdmin={isPlatformAdmin}
        />
        {view !== "comercial" && view !== "finance" && view !== "forms" && (
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
            planFlags={planFlags}
            onLocked={() => setPlansOpen(true)}
          />
        )}

        {view === "comercial" ? (
          <CommercialPage
            salesEnabled={salesEnabled}
            onOpenOverview={() => setOverviewOpen(true)}
            onOpenClients={() => setClientsOpen(true)}
            onOpenProposals={() => setProposalsOpen(true)}
            onOpenServices={() => setServicesOpen(true)}
            onOpenPortfolio={() => setPortfolioOpen(true)}
            onOpenContracts={() => setContractsOpen(true)}
          />
        ) : view === "finance" ? (
          <FinancePage orgId={activeOrgId} />
        ) : view === "forms" ? (
          <FormsPage orgId={activeOrgId} isAdmin={isAdmin} />
        ) : view === "board" ? (
          !data || data.columns.length === 0 ? (
            <EmptyBoard />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <WelcomeChecklist orgId={activeOrgId} steps={onboardingSteps} />
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
          viewLocked("gantt") ? (
            <UpgradeLock feature="Gráfico de Gantt" plan="Pro" onUpgrade={() => setPlansOpen(true)} />
          ) : !data || data.columns.length === 0 ? (
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
        ) : view === "mindmap" ? (
          viewLocked("mindmap") ? (
            <UpgradeLock feature="Mind Map" plan="Business" onUpgrade={() => setPlansOpen(true)} />
          ) : !data ? (
            <EmptyBoard />
          ) : (
            <MindMapView
              orgId={data.orgId}
              listId={data.listId}
              listName={listName}
              onOpenTask={(taskId) => {
                const task = data.columns.flatMap((c) => c.tasks).find((t) => t.id === taskId);
                if (task) focusEditor.openEdit(task);
              }}
            />
          )
        ) : view === "docs" ? (
          <DocsView orgId={activeOrgId} convertStatusId={data?.columns[0]?.id} />
        ) : view === "reports" ? (
          <ReportsView orgId={activeOrgId} />
        ) : view === "dashboard" ? (
          viewLocked("dashboard") ? (
            <UpgradeLock
              feature="Dashboard executivo"
              plan="Business"
              onUpgrade={() => setPlansOpen(true)}
            />
          ) : (
            <DashboardView orgId={activeOrgId} />
          )
        ) : (
          <PlaceholderView view={view} />
        )}
      </main>
    </div>
  );
}

function UpgradeLock({
  feature,
  plan,
  onUpgrade,
}: {
  feature: string;
  plan: string;
  onUpgrade: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
        <Lock className="size-7" />
      </span>
      <div>
        <p className="font-display text-h2 font-bold">{feature}</p>
        <p className="mx-auto mt-1 max-w-sm text-ui text-muted">
          Este recurso faz parte do plano <strong className="text-foreground">{plan}</strong>.
          Faça upgrade para desbloquear.
        </p>
      </div>
      <button
        type="button"
        onClick={onUpgrade}
        className="flex h-10 items-center gap-1.5 rounded-md bg-brand px-4 text-ui font-medium text-white transition-colors hover:bg-brand-80"
      >
        Ver planos & fazer upgrade
      </button>
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
        <p className="font-display text-h3 font-bold">Seu board está pronto</p>
        <p className="mt-1 max-w-sm text-ui text-muted">
          Ainda não há uma lista por aqui. Crie um Space e uma lista na barra lateral para começar a
          adicionar tarefas.
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
