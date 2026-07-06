import type { BoardColumn } from "@/mock/types";
import { TaskCard } from "@/components/board/task-card";

/** Board somente-leitura para o link público (portal do cliente). */
export function PublicBoard({
  listName,
  columns,
}: {
  listName: string;
  columns: BoardColumn[];
}) {
  const total = columns.reduce((n, c) => n + c.cards.length, 0);
  return (
    <div className="min-h-dvh bg-canvas text-foreground">
      <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-brand font-display font-extrabold text-white">
            W
          </div>
          <div>
            <p className="text-ui font-semibold leading-tight">{listName}</p>
            <p className="text-[11px] text-subtle">Compartilhado via Wayline · somente leitura</p>
          </div>
        </div>
        <span className="rounded-pill border border-border px-2.5 py-1 text-[11px] font-medium text-muted">
          {total} tarefa{total === 1 ? "" : "s"}
        </span>
      </header>

      {columns.length === 0 ? (
        <p className="p-10 text-center text-ui text-muted">Este quadro está vazio.</p>
      ) : (
        <div className="flex gap-5 overflow-x-auto p-5">
          {columns.map((col) => (
            <div key={col.id} className="w-80 shrink-0">
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: col.color }}
                />
                <span className="text-dense font-bold uppercase tracking-wide text-foreground">
                  {col.name}
                </span>
                <span className="text-[11px] font-semibold text-subtle">{col.cards.length}</span>
              </div>
              <div className="space-y-3">
                {col.cards.map((card) => (
                  <TaskCard key={card.id} card={card} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
