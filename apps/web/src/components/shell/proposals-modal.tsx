"use client";

import * as React from "react";
import { Check, Copy, FileText, Plus, Sparkles, Trash2, X } from "lucide-react";
import type { ProposalDTO, ProposalListItem } from "@wayline/db";
import { Badge, Button, Input, cn } from "@wayline/ui";
import {
  aiEnabledAction,
  clientOptionsAction,
  createProposalAction,
  deleteProposalAction,
  draftProposalAction,
  getProposalAction,
  listProposalsAction,
  updateProposalAction,
} from "@/actions/proposals";

const STATUS: Record<string, { label: string; variant: "neutral" | "brand" | "success" | "danger" }> = {
  draft: { label: "Rascunho", variant: "neutral" },
  sent: { label: "Enviada", variant: "brand" },
  accepted: { label: "Aceita", variant: "success" },
  rejected: { label: "Recusada", variant: "danger" },
};

const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface ItemRow {
  description: string;
  value: string; // reais como texto
}

function toCents(v: string): number {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 100)) : 0;
}

export function ProposalsModal({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const [list, setList] = React.useState<ProposalListItem[] | null>(null);
  const [clients, setClients] = React.useState<Array<{ id: string; name: string }>>([]);
  const [aiOn, setAiOn] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  // Editor
  const [title, setTitle] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [validUntil, setValidUntil] = React.useState("");
  const [status, setStatus] = React.useState("draft");
  const [intro, setIntro] = React.useState("");
  const [items, setItems] = React.useState<ItemRow[]>([]);
  const [token, setToken] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // IA
  const [briefing, setBriefing] = React.useState("");
  const [aiBusy, setAiBusy] = React.useState(false);
  const [aiPanel, setAiPanel] = React.useState(false);

  const reload = React.useCallback(() => {
    listProposalsAction(orgId).then(setList);
  }, [orgId]);

  React.useEffect(() => {
    reload();
    clientOptionsAction(orgId).then(setClients);
    aiEnabledAction().then(setAiOn);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [orgId, reload, onClose]);

  function loadInto(p: ProposalDTO) {
    setSelectedId(p.id);
    setTitle(p.title);
    setClientId(p.clientId ?? "");
    setValidUntil(p.validUntil ? new Date(p.validUntil).toISOString().slice(0, 10) : "");
    setStatus(p.status);
    setIntro(p.intro);
    setToken(p.token);
    setItems(
      p.items.length
        ? p.items.map((i) => ({ description: i.description, value: (i.amountCents / 100).toString() }))
        : [{ description: "", value: "" }],
    );
    setAiPanel(false);
  }

  async function open(id: string) {
    const p = await getProposalAction(orgId, id);
    if (p) loadInto(p);
  }

  async function createNew() {
    const id = await createProposalAction(orgId);
    if (!id) return;
    reload();
    const p = await getProposalAction(orgId, id);
    if (p) loadInto(p);
  }

  async function save() {
    if (!selectedId || saving) return;
    setSaving(true);
    await updateProposalAction(orgId, selectedId, {
      title,
      intro,
      clientId: clientId || null,
      status,
      validUntilIso: validUntil ? new Date(validUntil).toISOString() : null,
      items: items
        .filter((i) => i.description.trim())
        .map((i) => ({ description: i.description.trim(), amountCents: toCents(i.value) })),
    }).catch(() => {});
    setSaving(false);
    reload();
  }

  async function remove() {
    if (!selectedId) return;
    await deleteProposalAction(orgId, selectedId);
    setSelectedId(null);
    reload();
  }

  function copyLink() {
    const url = `${window.location.origin}/proposta/${token}`;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function runAI() {
    if (!briefing.trim() || aiBusy) return;
    setAiBusy(true);
    const res = await draftProposalAction(orgId, briefing).catch(() => null);
    setAiBusy(false);
    if (res) {
      if (res.intro) setIntro(res.intro);
      if (res.items.length) {
        setItems(res.items.map((i) => ({ description: i.description, value: (i.amountCents / 100).toString() })));
      }
      setAiPanel(false);
    }
  }

  const totalCents = items.reduce((s, i) => s + toCents(i.value), 0);
  const decided = status === "accepted" || status === "rejected";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex h-[85vh] w-full max-w-4xl overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Lista */}
        <aside className="flex w-64 shrink-0 flex-col border-r border-border">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-display text-ui font-bold">Propostas</h2>
            <button
              type="button"
              onClick={createNew}
              aria-label="Nova proposta"
              className="flex size-7 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-foreground"
            >
              <Plus className="size-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {list === null ? (
              <p className="p-2 text-dense text-subtle">Carregando…</p>
            ) : list.length === 0 ? (
              <p className="p-2 text-dense text-subtle">Nenhuma proposta. Crie a primeira.</p>
            ) : (
              list.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => open(p.id)}
                  className={cn(
                    "mb-1 flex w-full flex-col gap-1 rounded-md px-2.5 py-2 text-left transition-colors",
                    selectedId === p.id ? "bg-brand/10" : "hover:bg-elevated",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-dense font-medium text-foreground">{p.title}</span>
                    <Badge variant={STATUS[p.status]?.variant ?? "neutral"} size="sm">
                      {STATUS[p.status]?.label ?? p.status}
                    </Badge>
                  </span>
                  <span className="flex items-center justify-between text-[11px] text-subtle">
                    <span className="truncate">{p.clientName ?? "Sem cliente"}</span>
                    <span className="tabular-nums">{brl(p.totalCents)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Editor */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <span className="flex items-center gap-2 text-dense text-subtle">
              <FileText className="size-4" />
              {selectedId ? "Editar proposta" : "Selecione ou crie uma proposta"}
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

          {!selectedId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted">
              <FileText className="size-8 text-subtle" />
              <p className="text-ui">Crie uma proposta e compartilhe o link com o cliente.</p>
              <Button onClick={createNew}>
                <Plus className="size-4" /> Nova proposta
              </Button>
            </div>
          ) : (
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-dense font-medium text-muted">Título</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <label className="text-dense font-medium text-muted">Cliente</label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="mt-1 h-9 w-full rounded-md border border-border bg-canvas px-2 text-ui text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Sem cliente</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-dense font-medium text-muted">Válida até</label>
                  <Input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Intro + IA */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-dense font-medium text-muted">Introdução</label>
                  {aiOn && (
                    <button
                      type="button"
                      onClick={() => setAiPanel((v) => !v)}
                      className="flex items-center gap-1 text-dense font-medium text-brand hover:underline"
                    >
                      <Sparkles className="size-3.5" /> Gerar com IA
                    </button>
                  )}
                </div>
                {aiPanel && (
                  <div className="mt-2 rounded-md border border-brand/30 bg-brand/5 p-2.5">
                    <textarea
                      value={briefing}
                      onChange={(e) => setBriefing(e.target.value)}
                      placeholder="Briefing curto: cliente, objetivo, serviços desejados…"
                      className="h-16 w-full resize-none rounded-md border border-border bg-surface p-2 text-dense text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <div className="mt-2 flex justify-end">
                      <Button size="sm" onClick={runAI} disabled={!briefing.trim() || aiBusy}>
                        <Sparkles className="size-3.5" />
                        {aiBusy ? "Gerando…" : "Gerar proposta"}
                      </Button>
                    </div>
                  </div>
                )}
                <textarea
                  value={intro}
                  onChange={(e) => setIntro(e.target.value)}
                  placeholder="Apresentação da proposta ao cliente…"
                  className="mt-1 h-24 w-full resize-y rounded-md border border-border bg-canvas p-2.5 text-ui text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              {/* Itens */}
              <div>
                <label className="text-dense font-medium text-muted">Itens (escopo & valores)</label>
                <div className="mt-1 space-y-2">
                  {items.map((it, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={it.description}
                        onChange={(e) =>
                          setItems((arr) => arr.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))
                        }
                        placeholder="Descrição do serviço"
                        className="flex-1"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-dense text-subtle">R$</span>
                        <Input
                          value={it.value}
                          onChange={(e) =>
                            setItems((arr) => arr.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))
                          }
                          placeholder="0,00"
                          className="w-28 text-right"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setItems((arr) => arr.filter((_, j) => j !== i))}
                        aria-label="Remover item"
                        className="flex size-8 items-center justify-center rounded-md text-subtle hover:text-danger"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setItems((arr) => [...arr, { description: "", value: "" }])}
                    className="flex items-center gap-1 text-dense font-medium text-muted hover:text-foreground"
                  >
                    <Plus className="size-3.5" /> Adicionar item
                  </button>
                  <span className="text-ui font-bold text-foreground">
                    Total: <span className="tabular-nums">{brl(totalCents)}</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Rodapé do editor */}
          {selectedId && (
            <div className="flex items-center gap-2 border-t border-border px-5 py-3">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={decided}
                className="h-9 rounded-md border border-border bg-canvas px-2 text-dense text-foreground disabled:opacity-60"
              >
                <option value="draft">Rascunho</option>
                <option value="sent">Enviada</option>
                {decided && <option value={status}>{STATUS[status]?.label}</option>}
              </select>
              <button
                type="button"
                onClick={copyLink}
                className="flex items-center gap-1.5 rounded-md border border-border bg-canvas px-2.5 h-9 text-dense font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground"
              >
                {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                {copied ? "Copiado!" : "Copiar link"}
              </button>
              <button
                type="button"
                onClick={remove}
                className="flex size-9 items-center justify-center rounded-md text-subtle hover:text-danger"
                aria-label="Excluir proposta"
              >
                <Trash2 className="size-4" />
              </button>
              <div className="ml-auto">
                <Button onClick={save} disabled={saving}>
                  {saving ? "Salvando…" : "Salvar"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
