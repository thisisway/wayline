"use client";

import * as React from "react";
import { Check, Copy, FileSignature, Plus, Trash2, X } from "lucide-react";
import type { ContractDTO, ContractListItem } from "@wayline/db";
import { Badge, Button, Input, cn } from "@wayline/ui";
import {
  createContractAction,
  deleteContractAction,
  getContractAction,
  listContractsAction,
  updateContractAction,
} from "@/actions/contracts";
import { clientOptionsAction } from "@/actions/proposals";

const STATUS: Record<string, { label: string; variant: "neutral" | "brand" | "success" | "danger" }> = {
  draft: { label: "Rascunho", variant: "neutral" },
  sent: { label: "Enviado", variant: "brand" },
  signed: { label: "Assinado", variant: "success" },
  canceled: { label: "Cancelado", variant: "danger" },
};
const brl = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const no = (n: number) => `CTR-${String(n).padStart(5, "0")}`;
const toCents = (v: string) => {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 100)) : 0;
};
/** cents → texto pt-BR ("1050" → "10,50") que `toCents` sabe reler. */
const toInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

export function ContractsModal({
  orgId,
  onClose,
  openId,
}: {
  orgId: string;
  onClose: () => void;
  openId?: string | null;
}) {
  const [list, setList] = React.useState<ContractListItem[] | null>(null);
  const [clients, setClients] = React.useState<Array<{ id: string; name: string }>>([]);
  const [sel, setSel] = React.useState<string | null>(null);
  const [d, setD] = React.useState<ContractDTO | null>(null);
  const [title, setTitle] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [status, setStatus] = React.useState("draft");
  const [value, setValue] = React.useState("");
  const [content, setContent] = React.useState("");
  const [token, setToken] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const reload = React.useCallback(() => listContractsAction(orgId).then(setList), [orgId]);
  React.useEffect(() => {
    reload();
    clientOptionsAction(orgId).then(setClients);
    if (openId) void open(openId);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [orgId, openId]);

  function loadInto(c: ContractDTO) {
    setD(c);
    setSel(c.id);
    setTitle(c.title);
    setClientId(c.clientId ?? "");
    setStatus(c.status);
    setValue(toInput(c.valueCents));
    setContent(c.content);
    setToken(c.token);
  }
  async function open(id: string) {
    const c = await getContractAction(orgId, id);
    if (c) loadInto(c);
  }
  async function createNew() {
    const id = await createContractAction(orgId);
    if (!id) return;
    reload();
    open(id);
  }
  async function save() {
    if (!sel || saving) return;
    setSaving(true);
    await updateContractAction(orgId, sel, {
      title,
      content,
      valueCents: toCents(value),
      clientId: clientId || null,
      status,
    }).catch(() => {});
    setSaving(false);
    reload();
  }
  async function remove() {
    if (!sel) return;
    await deleteContractAction(orgId, sel);
    setSel(null);
    setD(null);
    reload();
  }
  function copyLink() {
    navigator.clipboard?.writeText(`${window.location.origin}/contrato/${token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const signed = status === "signed";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex h-[86vh] w-full max-w-4xl overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <aside className="flex w-60 shrink-0 flex-col border-r border-border">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="flex items-center gap-2 font-display text-ui font-bold">
              <FileSignature className="size-4" /> Contratos
            </h2>
            <button
              type="button"
              onClick={createNew}
              aria-label="Novo contrato"
              className="flex size-7 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-foreground"
            >
              <Plus className="size-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {list === null ? (
              <p className="p-2 text-dense text-subtle">Carregando…</p>
            ) : list.length === 0 ? (
              <p className="p-2 text-dense text-subtle">Nenhum contrato.</p>
            ) : (
              list.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => open(c.id)}
                  className={cn(
                    "mb-1 flex w-full flex-col gap-1 rounded-md px-2.5 py-2 text-left transition-colors",
                    sel === c.id ? "bg-brand/10" : "hover:bg-elevated",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-dense font-medium text-foreground">{c.title}</span>
                    <Badge variant={STATUS[c.status]?.variant ?? "neutral"} size="sm">
                      {STATUS[c.status]?.label ?? c.status}
                    </Badge>
                  </span>
                  <span className="flex items-center justify-between text-[11px] text-subtle">
                    <span className="truncate">{no(c.number)} · {c.clientName ?? "Sem cliente"}</span>
                    <span className="tabular-nums">{brl(c.valueCents)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <span className="text-dense text-subtle">
              {sel ? `Editando ${no(d?.number ?? 0)}` : "Selecione ou crie um contrato"}
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
              <FileSignature className="size-8 text-subtle" />
              <p className="text-ui">Crie um contrato ou gere a partir de uma proposta aceita.</p>
              <Button onClick={createNew}>
                <Plus className="size-4" /> Novo contrato
              </Button>
            </div>
          ) : (
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              <div className="grid grid-cols-3 gap-3">
                <label className="col-span-2 block">
                  <span className="text-dense font-medium text-muted">Título</span>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
                </label>
                <label className="block">
                  <span className="text-dense font-medium text-muted">Valor (R$)</span>
                  <Input value={value} onChange={(e) => setValue(e.target.value)} className="mt-1 text-right" />
                </label>
                <label className="block">
                  <span className="text-dense font-medium text-muted">Cliente</span>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="mt-1 h-9 w-full rounded-md border border-border bg-canvas px-2 text-ui text-foreground"
                  >
                    <option value="">Sem cliente</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-dense font-medium text-muted">Status</span>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={signed}
                    className="mt-1 h-9 w-full rounded-md border border-border bg-canvas px-2 text-ui text-foreground disabled:opacity-60"
                  >
                    <option value="draft">Rascunho</option>
                    <option value="sent">Enviado</option>
                    <option value="canceled">Cancelado</option>
                    {signed && <option value="signed">Assinado</option>}
                  </select>
                </label>
              </div>
              <label className="block">
                <span className="text-dense font-medium text-muted">Conteúdo do contrato</span>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="mt-1 h-80 w-full resize-y rounded-md border border-border bg-canvas p-3 font-mono text-dense text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Cláusulas do contrato…"
                />
              </label>
              {signed && d?.signedByName && (
                <div className="rounded-lg border border-success/30 bg-success/5 p-3 text-dense">
                  <span className="font-semibold text-success">Assinado</span> por{" "}
                  <strong>{d.signedByName}</strong>
                  {d.signedByDoc && ` (${d.signedByDoc})`}
                  {d.signedAt && ` em ${new Date(d.signedAt).toLocaleString("pt-BR")}`}
                </div>
              )}
            </div>
          )}

          {sel && (
            <div className="flex items-center gap-2 border-t border-border px-5 py-3">
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
                aria-label="Excluir"
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
