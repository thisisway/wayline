"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import type { SearchResult } from "@wayline/db";
import { cn } from "@wayline/ui";
import { searchTasksAction } from "@/actions/search";
import { switchList } from "@/actions/org";

const PRIO_COLOR: Record<SearchResult["priority"], string> = {
  urgent: "#FF3B30",
  high: "#FFB800",
  normal: "#1D66FF",
  low: "#94A3B8",
};

export function CommandPalette({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = setTimeout(() => {
      searchTasksAction(orgId, term)
        .then((r) => {
          setResults(r);
          setActive(0);
        })
        .finally(() => setLoading(false));
    }, 180);
    return () => clearTimeout(id);
  }, [q, orgId]);

  const go = React.useCallback(
    (r: SearchResult) => {
      startTransition(async () => {
        await switchList(r.listId);
        router.push(`/app?task=${r.id}`);
        onClose();
      });
    },
    [onClose, router],
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active]!);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-dark/60 p-4 pt-24 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="size-4 text-subtle" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Buscar tarefas por título…"
            className="h-12 w-full bg-transparent text-ui text-foreground outline-none placeholder:text-subtle"
          />
          {(loading || pending) && <span className="text-[11px] text-subtle">…</span>}
        </div>

        <div className="max-h-80 overflow-y-auto p-1.5">
          {q.trim().length < 2 ? (
            <p className="px-3 py-6 text-center text-dense text-subtle">
              Digite ao menos 2 caracteres para buscar.
            </p>
          ) : results.length === 0 && !loading ? (
            <p className="px-3 py-6 text-center text-dense text-subtle">Nada encontrado.</p>
          ) : (
            results.map((r, i) => (
              <button
                key={r.id}
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left",
                  i === active ? "bg-elevated" : "hover:bg-elevated",
                )}
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: PRIO_COLOR[r.priority] }}
                />
                <span className="min-w-0 flex-1 truncate text-ui text-foreground">{r.title}</span>
                <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-subtle">
                  {r.statusName && (
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: r.statusColor ?? "#94A3B8" }}
                      />
                      {r.statusName}
                    </span>
                  )}
                  <span>·</span>
                  <span className="truncate">{r.listName}</span>
                  {i === active && <CornerDownLeft className="size-3.5" />}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
