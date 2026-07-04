"use client";

import * as React from "react";
import { Pause, Play, Plus, Trash2 } from "lucide-react";
import type { TimeEntryDTO } from "@wayline/db";
import { Avatar, Button, Input, cn } from "@wayline/ui";
import {
  addManualEntryAction,
  deleteTimeEntryAction,
  listTimeEntriesAction,
  startTimerAction,
  stopTimerAction,
} from "@/actions/time-tracking";

const fieldLabel = "text-label uppercase text-subtle";

export function fmtDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

function fmtClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

function entrySeconds(e: TimeEntryDTO, nowMs: number): number {
  if (!e.running) return e.seconds;
  return Math.max(0, Math.round((nowMs - new Date(e.startedAt).getTime()) / 1000));
}

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function TimeTrackingSection({
  orgId,
  taskId,
  onTrackedChange,
}: {
  orgId: string;
  taskId: string;
  onTrackedChange?: (seconds: number) => void;
}) {
  const [entries, setEntries] = React.useState<TimeEntryDTO[] | null>(null);
  const [now, setNow] = React.useState(() => Date.now());
  const [busy, setBusy] = React.useState(false);
  const [manual, setManual] = React.useState("");
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    let alive = true;
    listTimeEntriesAction(orgId, taskId).then((e) => alive && setEntries(e));
    return () => {
      alive = false;
    };
  }, [orgId, taskId]);

  const running = React.useMemo(() => (entries ?? []).find((e) => e.running) ?? null, [entries]);

  // Tique de 1s enquanto houver cronômetro rodando (dep. primitiva p/ estabilidade).
  const isRunning = running !== null;
  React.useEffect(() => {
    if (!isRunning) return;
    setNow(Date.now()); // tique imediato ao iniciar
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [isRunning]);

  const total = (entries ?? []).reduce((acc, e) => acc + entrySeconds(e, now), 0);

  function emitTotal(list: TimeEntryDTO[]) {
    onTrackedChange?.(list.reduce((acc, e) => acc + e.seconds, 0));
  }

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      if (running) {
        const stopped = await stopTimerAction(orgId, running.id);
        const next = (entries ?? []).map((e) => (e.id === running.id ? stopped ?? e : e));
        setEntries(next);
        emitTotal(next);
      } else {
        const started = await startTimerAction(orgId, taskId);
        if (started) {
          const next = [started, ...(entries ?? [])];
          setEntries(next);
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function addManual() {
    const minutes = parseFloat(manual.replace(",", "."));
    if (!Number.isFinite(minutes) || minutes <= 0 || busy) return;
    setBusy(true);
    try {
      const created = await addManualEntryAction(
        orgId,
        taskId,
        Math.round(minutes * 60),
        note || null,
      );
      if (created) {
        const next = [created, ...(entries ?? [])];
        setEntries(next);
        setManual("");
        setNote("");
        emitTotal(next);
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const next = (entries ?? []).filter((e) => e.id !== id);
    setEntries(next);
    emitTotal(next);
    await deleteTimeEntryAction(orgId, id).catch(() => {});
  }

  return (
    <div className="border-t border-border px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <span className={fieldLabel}>Tempo</span>
        <span className="flex items-center gap-2">
          {running && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-danger">
              <span className="size-2 animate-pulse rounded-full bg-danger" />
              gravando
            </span>
          )}
          <span
            className={cn(
              "font-display text-h3 font-bold tabular-nums",
              running ? "text-brand" : "text-foreground",
            )}
          >
            {fmtClock(total)}
          </span>
        </span>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <Button
          type="button"
          variant={running ? "secondary" : "primary"}
          onClick={toggle}
          disabled={busy}
          className="gap-1.5"
        >
          {running ? <Pause className="size-4" /> : <Play className="size-4" />}
          {running ? "Parar" : "Iniciar"}
        </Button>
        <div className="flex flex-1 items-center gap-2">
          <Input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void addManual();
              }
            }}
            placeholder="min"
            inputMode="decimal"
            className="h-9 w-16"
          />
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void addManual();
              }
            }}
            placeholder="Nota (opcional)"
            className="h-9"
          />
          <Button
            type="button"
            size="icon"
            variant="secondary"
            onClick={() => void addManual()}
            disabled={!manual.trim() || busy}
            aria-label="Lançar tempo manual"
          >
            <Plus />
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        {entries === null ? (
          <p className="text-dense text-subtle">Carregando…</p>
        ) : entries.length === 0 ? (
          <p className="text-dense text-subtle">Nenhum registro de tempo.</p>
        ) : (
          entries.map((e) => (
            <div key={e.id} className="group flex items-center gap-2.5 py-1">
              <Avatar name={e.user.name} src={e.user.avatarUrl ?? undefined} size="xs" />
              <span className="min-w-0 flex-1 truncate text-dense text-muted">
                {e.note || e.user.name.split(" ")[0]}
                <span className="ml-1.5 text-subtle">· {fmtDate(e.startedAt)}</span>
              </span>
              <span
                className={cn(
                  "shrink-0 text-dense font-semibold tabular-nums",
                  e.running ? "text-brand" : "text-foreground",
                )}
              >
                {e.running ? fmtClock(entrySeconds(e, now)) : fmtDuration(e.seconds)}
              </span>
              <button
                type="button"
                onClick={() => remove(e.id)}
                aria-label="Excluir registro"
                className="text-subtle opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
