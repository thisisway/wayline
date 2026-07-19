"use client";

import * as React from "react";
import { Package, Plus, Trash2, X } from "lucide-react";
import type { ServiceDTO } from "@wayline/db";
import { Button, Input, cn } from "@wayline/ui";
import {
  createServiceAction,
  deleteServiceAction,
  listServicesAction,
  updateServiceAction,
} from "@/actions/services";

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function toCents(v: string): number {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 100)) : 0;
}

export function ServicesModal({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const [list, setList] = React.useState<ServiceDTO[] | null>(null);
  const [sel, setSel] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [value, setValue] = React.useState("");
  const [unit, setUnit] = React.useState("Unidade");
  const [term, setTerm] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const reload = React.useCallback(() => listServicesAction(orgId).then(setList), [orgId]);
  React.useEffect(() => {
    reload();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [orgId, reload, onClose]);

  function edit(s: ServiceDTO) {
    setSel(s.id);
    setName(s.name);
    setValue((s.amountCents / 100).toString());
    setUnit(s.unit);
    setTerm(s.term);
    setDescription(s.description);
  }
  function blank() {
    setSel("new");
    setName("");
    setValue("");
    setUnit("Unidade");
    setTerm("");
    setDescription("");
  }

  async function save() {
    if (!name.trim() || saving) return;
    setSaving(true);
    const input = { name, description, amountCents: toCents(value), unit, term };
    if (sel === "new") await createServiceAction(orgId, input).catch(() => null);
    else if (sel) await updateServiceAction(orgId, sel, input).catch(() => {});
    setSaving(false);
    setSel(null);
    reload();
  }
  async function remove(id: string) {
    await deleteServiceAction(orgId, id);
    if (sel === id) setSel(null);
    reload();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex h-[80vh] w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <aside className="flex w-64 shrink-0 flex-col border-r border-border">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="flex items-center gap-2 font-display text-ui font-bold">
              <Package className="size-4" /> Catálogo
            </h2>
            <button
              type="button"
              onClick={blank}
              aria-label="Novo serviço"
              className="flex size-7 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-foreground"
            >
              <Plus className="size-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {list === null ? (
              <p className="p-2 text-dense text-subtle">Carregando…</p>
            ) : list.length === 0 ? (
              <p className="p-2 text-dense text-subtle">Nenhum serviço. Crie o primeiro.</p>
            ) : (
              list.map((s) => (
                <div
                  key={s.id}
                  className={cn(
                    "group mb-1 flex items-center gap-2 rounded-md px-2.5 py-2",
                    sel === s.id ? "bg-brand/10" : "hover:bg-elevated",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => edit(s)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-dense font-medium text-foreground">{s.name}</p>
                    <p className="text-[11px] text-subtle">
                      {brl(s.amountCents)} · {s.unit}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(s.id)}
                    aria-label="Excluir"
                    className="flex size-6 items-center justify-center rounded text-subtle opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <span className="text-dense text-subtle">
              {sel ? (sel === "new" ? "Novo serviço" : "Editar serviço") : "Selecione ou crie um serviço"}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="flex size-7 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          {!sel ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted">
              <Package className="size-8 text-subtle" />
              <p className="text-ui">Serviços do catálogo alimentam os itens das propostas.</p>
              <Button onClick={blank}>
                <Plus className="size-4" /> Novo serviço
              </Button>
            </div>
          ) : (
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              <label className="block">
                <span className="text-dense font-medium text-muted">Nome</span>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
              </label>
              <div className="grid grid-cols-3 gap-3">
                <label className="block">
                  <span className="text-dense font-medium text-muted">Preço (R$)</span>
                  <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="0,00" className="mt-1 text-right" />
                </label>
                <label className="block">
                  <span className="text-dense font-medium text-muted">Unidade</span>
                  <Input value={unit} onChange={(e) => setUnit(e.target.value)} className="mt-1" />
                </label>
                <label className="block">
                  <span className="text-dense font-medium text-muted">Prazo</span>
                  <Input value={term} onChange={(e) => setTerm(e.target.value)} className="mt-1" />
                </label>
              </div>
              <label className="block">
                <span className="text-dense font-medium text-muted">Descrição</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 h-32 w-full resize-y rounded-md border border-border bg-canvas p-2.5 text-ui text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="O que está incluído no serviço…"
                />
              </label>
            </div>
          )}

          {sel && (
            <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
              <Button variant="secondary" onClick={() => setSel(null)}>
                Cancelar
              </Button>
              <Button onClick={save} disabled={!name.trim() || saving}>
                {saving ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
