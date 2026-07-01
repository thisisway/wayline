"use client";

import { MoreHorizontal, Plus } from "lucide-react";
import type { BoardColumn as BoardColumnType } from "@/mock/types";
import { TaskCard } from "./task-card";

export function BoardColumn({ column }: { column: BoardColumnType }) {
  return (
    <section className="flex w-80 shrink-0 flex-col">
      {/* Cabeçalho da coluna */}
      <div className="mb-3 flex items-center gap-2">
        <span className="size-2.5 rounded-full" style={{ backgroundColor: column.color }} />
        <h2 className="text-dense font-bold uppercase tracking-wide text-foreground">
          {column.name}
        </h2>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-elevated px-1.5 text-[11px] font-semibold text-muted">
          {column.cards.length}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            aria-label="Adicionar tarefa"
            className="flex size-6 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-foreground"
          >
            <Plus className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Opções da coluna"
            className="flex size-6 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-foreground"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
        {column.cards.map((card) => (
          <TaskCard key={card.id} card={card} />
        ))}

        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 h-9 text-dense font-medium text-muted transition-colors hover:border-brand-40 hover:text-foreground"
        >
          <Plus className="size-4" />
          Nova tarefa
        </button>
      </div>
    </section>
  );
}
