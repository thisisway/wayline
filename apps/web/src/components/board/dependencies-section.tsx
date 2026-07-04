"use client";

import * as React from "react";
import { Ban, Check, Plus, X } from "lucide-react";
import type { DependencyTaskDTO, TaskOption } from "@wayline/db";
import { cn } from "@wayline/ui";
import {
  addBlockedByAction,
  addBlocksAction,
  listDependenciesAction,
  removeDependencyAction,
  taskOptionsAction,
} from "@/actions/dependencies";

const fieldLabel = "text-label uppercase text-subtle";

type Kind = "blockedBy" | "blocks";

export function DependenciesSection({
  orgId,
  taskId,
  onChange,
}: {
  orgId: string;
  taskId: string;
  onChange?: () => void;
}) {
  const [blockedBy, setBlockedBy] = React.useState<DependencyTaskDTO[]>([]);
  const [blocks, setBlocks] = React.useState<DependencyTaskDTO[]>([]);
  const [options, setOptions] = React.useState<TaskOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [adding, setAdding] = React.useState<Kind | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    Promise.all([
      listDependenciesAction(orgId, taskId),
      taskOptionsAction(orgId, taskId),
    ]).then(([deps, opts]) => {
      if (!alive) return;
      setBlockedBy(deps.blockedBy);
      setBlocks(deps.blocks);
      setOptions(opts);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [orgId, taskId]);

  const usedIds = React.useMemo(
    () => new Set([...blockedBy, ...blocks].map((d) => d.taskId)),
    [blockedBy, blocks],
  );

  async function add(kind: Kind, otherId: string) {
    setError(null);
    setAdding(null);
    const res =
      kind === "blockedBy"
        ? await addBlockedByAction(orgId, taskId, otherId)
        : await addBlocksAction(orgId, taskId, otherId);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (kind === "blockedBy") setBlockedBy((v) => [...v, res.dep]);
    else setBlocks((v) => [...v, res.dep]);
    onChange?.();
  }

  async function remove(kind: Kind, depId: string) {
    if (kind === "blockedBy") setBlockedBy((v) => v.filter((d) => d.depId !== depId));
    else setBlocks((v) => v.filter((d) => d.depId !== depId));
    await removeDependencyAction(orgId, depId).catch(() => {});
    onChange?.();
  }

  function renderList(kind: Kind, list: DependencyTaskDTO[]) {
    const available = options.filter((o) => !usedIds.has(o.id));
    const label = kind === "blockedBy" ? "Bloqueada por" : "Bloqueia";
    return (
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className={fieldLabel}>{label}</span>
          <button
            type="button"
            onClick={() => setAdding(adding === kind ? null : kind)}
            disabled={available.length === 0}
            className={cn(
              "flex items-center gap-1 rounded-md px-1.5 h-7 text-dense font-medium transition-colors",
              available.length === 0
                ? "cursor-not-allowed text-subtle"
                : "text-brand hover:bg-brand/10",
            )}
          >
            <Plus className="size-3.5" /> Adicionar
          </button>
        </div>

        {list.length > 0 && (
          <div className="mb-1.5 space-y-1">
            {list.map((d) => (
              <div
                key={d.depId}
                className="group flex items-center gap-2 rounded-md bg-elevated/60 px-2 py-1.5"
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full",
                    d.completed ? "bg-success/15 text-success" : "bg-warning/15 text-warning",
                  )}
                  title={d.completed ? "Concluída" : "Em aberto"}
                >
                  {d.completed ? <Check className="size-3" /> : <Ban className="size-3" />}
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-dense",
                    d.completed ? "text-subtle line-through" : "text-foreground",
                  )}
                >
                  {d.title}
                </span>
                {d.statusName && (
                  <span className="shrink-0 text-[11px] text-subtle">{d.statusName}</span>
                )}
                <button
                  type="button"
                  onClick={() => remove(kind, d.depId)}
                  aria-label="Remover dependência"
                  className="text-subtle opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {adding === kind && (
          <select
            autoFocus
            defaultValue=""
            onChange={(e) => e.target.value && add(kind, e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-surface px-2 text-dense text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="" disabled>
              Escolha uma tarefa…
            </option>
            {available.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>
        )}

        {list.length === 0 && adding !== kind && (
          <p className="text-dense text-subtle">—</p>
        )}
      </div>
    );
  }

  return (
    <div className="border-t border-border px-5 py-4">
      <span className={cn(fieldLabel, "mb-3 block")}>Dependências</span>
      {loading ? (
        <p className="text-dense text-subtle">Carregando…</p>
      ) : (
        <div className="space-y-4">
          {error && <p className="text-dense text-danger">{error}</p>}
          {renderList("blockedBy", blockedBy)}
          {renderList("blocks", blocks)}
        </div>
      )}
    </div>
  );
}
