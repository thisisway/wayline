"use client";

import * as React from "react";
import { LayoutGrid } from "lucide-react";
import { IconRail } from "@/components/shell/icon-rail";
import { HomePanel } from "@/components/shell/home-panel";
import { Topbar } from "@/components/shell/topbar";
import { ViewTabs } from "@/components/shell/view-tabs";
import { BoardColumn } from "@/components/board/board-column";
import { DocPanel } from "@/components/panels/doc-panel";
import { ExecutiveSummaryPanel } from "@/components/panels/executive-summary";
import { PresenceLayer } from "@/components/panels/presence-layer";
import { board } from "@/mock/data";

export default function AppPage() {
  const [view, setView] = React.useState("board");

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas text-foreground">
      <IconRail />
      <HomePanel />

      <main className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <ViewTabs value={view} onValueChange={setView} />

        {view === "board" ? (
          <div className="relative min-h-0 flex-1">
            <PresenceLayer />

            {/* Colunas do Kanban */}
            <div className="flex h-full gap-5 overflow-x-auto px-4 py-5">
              {board.map((column) => (
                <BoardColumn key={column.id} column={column} />
              ))}
            </div>

            {/* Painéis flutuantes da tela de referência */}
            <div className="pointer-events-none absolute bottom-5 left-4 z-20">
              <DocPanel />
            </div>
            <div className="pointer-events-none absolute bottom-5 right-4 z-20">
              <ExecutiveSummaryPanel />
            </div>
          </div>
        ) : (
          <PlaceholderView view={view} />
        )}
      </main>
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
