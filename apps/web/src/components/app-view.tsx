"use client";

import * as React from "react";
import { Database, LayoutGrid } from "lucide-react";
import type { BoardData, NavSpace, UserOrg } from "@wayline/db";
import { IconRail } from "@/components/shell/icon-rail";
import { HomePanel } from "@/components/shell/home-panel";
import { Topbar } from "@/components/shell/topbar";
import { ViewTabs } from "@/components/shell/view-tabs";
import { DndBoard } from "@/components/board/dnd-board";
import { DocPanel } from "@/components/panels/doc-panel";
import { ExecutiveSummaryPanel } from "@/components/panels/executive-summary";
import { useBoardLive } from "@/lib/use-board-live";

export function AppView({
  data,
  orgs,
  activeOrgId,
  nav,
  activeListId,
  listName,
  userName,
}: {
  data: BoardData | null;
  orgs: UserOrg[];
  activeOrgId: string;
  nav: NavSpace[];
  activeListId: string;
  listName: string;
  userName: string;
}) {
  const [view, setView] = React.useState("board");
  const viewers = useBoardLive(data?.listId ?? "");

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas text-foreground">
      <IconRail />
      <HomePanel nav={nav} activeListId={activeListId} activeOrgId={activeOrgId} />

      <main className="flex min-w-0 flex-1 flex-col">
        <Topbar userName={userName} orgs={orgs} activeOrgId={activeOrgId} />
        <ViewTabs
          value={view}
          onValueChange={setView}
          listName={listName}
          viewers={viewers}
        />

        {view === "board" ? (
          !data || data.columns.length === 0 ? (
            <EmptyBoard />
          ) : (
            <div className="relative min-h-0 flex-1">
              {/* key por lista: remonta (reseta o estado local) ao trocar de org/board */}
              <DndBoard key={data.listId} data={data} />

              {data.columns.some((c) => c.tasks.length > 0) && (
                <>
                  <div className="pointer-events-none absolute bottom-5 left-4 z-20">
                    <DocPanel />
                  </div>
                  <div className="pointer-events-none absolute bottom-5 right-4 z-20">
                    <ExecutiveSummaryPanel />
                  </div>
                </>
              )}
            </div>
          )
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
