"use client";

import * as React from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import type { ClientDTO } from "@wayline/db";
import { Button, Input, cn } from "@wayline/ui";
import {
  archiveClientAction,
  createClientAction,
  listClientsAction,
  updateClientAction,
} from "@/actions/clients";

const COLORS = ["#1D66FF", "#17C86A", "#FFB800", "#FF3B30", "#7C5CFF", "#0EA5E9", "#EC4899", "#94A3B8"];

export function ClientsModal({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const [clients, setClients] = React.useState<ClientDTO[] | null>(null);
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState(COLORS[0]!);
  const [busy, setBusy] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    listClientsAction(orgId).then(setClients);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [orgId, onClose]);

  async function add() {
    const n = name.trim();
    if (!n || busy) return;
    setBusy(true);
    try {
      const created = await createClientAction(orgId, { name: n, color });
      if (created) {
        setClients((c) => [...(c ?? []), created].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
        setName("");
        setColor(COLORS[0]!);
      }
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(
    id: string,
    patch: { name?: string; color?: string; hourBudget?: number | null },
  ) {
    setClients((cs) => (cs ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c)));
    await updateClientAction(orgId, id, patch).catch(() => {});
  }

  async function archive(id: string) {
    setClients((cs) => (cs ?? []).filter((c) => c.id !== id));
    await archiveClientAction(orgId, id).catch(() => {});
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="font-display text-h3 font-bold">Clientes</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-7 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-2 border-b border-border p-5">
          <div className="flex items-center gap-2">
            <ColorDots value={color} onChange={setColor} />
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Nome do cliente"
              className="flex-1"
            />
            <Button onClick={add} disabled={!name.trim() || busy}>
              <Plus className="size-4" />
              Adicionar
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {clients === null ? (
            <p className="p-2 text-dense text-subtle">Carregando…</p>
          ) : clients.length === 0 ? (
            <p className="p-2 text-dense text-subtle">Nenhum cliente ainda.</p>
          ) : (
            clients.map((c) =>
              editingId === c.id ? (
                <EditRow
                  key={c.id}
                  client={c}
                  onSave={(patch) => {
                    void saveEdit(c.id, patch);
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div
                  key={c.id}
                  className="group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-elevated"
                >
                  <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="min-w-0 flex-1 truncate text-ui font-medium text-foreground">
                    {c.name}
                  </span>
                  {c.hourBudget != null && (
                    <span className="shrink-0 rounded-pill bg-elevated px-2 py-0.5 text-[11px] text-subtle">
                      {c.hourBudget}h/mês
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingId(c.id)}
                    aria-label={`Editar ${c.name}`}
                    className="flex size-7 items-center justify-center rounded-md text-subtle opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => archive(c.id)}
                    aria-label={`Arquivar ${c.name}`}
                    className="flex size-7 items-center justify-center rounded-md text-subtle opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ),
            )
          )}
        </div>
      </div>
    </div>
  );
}

function ColorDots({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Cor do cliente"
        className="flex size-9 items-center justify-center rounded-md border border-border"
      >
        <span className="size-4 rounded-full" style={{ backgroundColor: value }} />
      </button>
      {open && (
        <div className="absolute left-0 top-10 z-10 flex w-40 flex-wrap gap-1.5 rounded-lg border border-border bg-surface p-2 shadow-lg">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                onChange(c);
                setOpen(false);
              }}
              aria-label={`Cor ${c}`}
              className={cn(
                "size-5 rounded-full border-2 transition-transform",
                value === c ? "border-foreground scale-110" : "border-transparent",
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EditRow({
  client,
  onSave,
  onCancel,
}: {
  client: ClientDTO;
  onSave: (patch: { name: string; color: string; hourBudget: number | null }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = React.useState(client.name);
  const [color, setColor] = React.useState(client.color);
  const [budget, setBudget] = React.useState(client.hourBudget != null ? String(client.hourBudget) : "");

  function commit() {
    if (!name.trim()) return;
    const parsed = parseInt(budget, 10);
    onSave({ name, color, hourBudget: Number.isFinite(parsed) && parsed > 0 ? parsed : null });
  }

  return (
    <div className="flex items-center gap-2 rounded-md bg-elevated/60 px-2 py-2">
      <ColorDots value={color} onChange={setColor} />
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          else if (e.key === "Escape") onCancel();
        }}
        className="h-9 flex-1"
      />
      <Input
        value={budget}
        onChange={(e) => setBudget(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          else if (e.key === "Escape") onCancel();
        }}
        inputMode="numeric"
        placeholder="h/mês"
        title="Meta de horas por mês"
        className="h-9 w-20"
      />
      <button
        type="button"
        onClick={commit}
        aria-label="Salvar"
        className="flex size-8 items-center justify-center rounded-md text-success hover:bg-success/10"
      >
        <Check className="size-4" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancelar"
        className="flex size-8 items-center justify-center rounded-md text-subtle hover:bg-elevated"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
