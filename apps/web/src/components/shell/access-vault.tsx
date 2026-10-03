"use client";

import * as React from "react";
import {
  Check,
  Copy,
  Database,
  Eye,
  EyeOff,
  GripVertical,
  HardDrive,
  KeyRound,
  Mail,
  Pencil,
  Plus,
  Search,
  Server,
  Trash2,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import { Button, Input, cn } from "@wayline/ui";
import type { AccessEntryDTO } from "@wayline/db";
import {
  createAccessEntryAction,
  deleteAccessEntryAction,
  listAccessEntriesAction,
  reorderAccessEntriesAction,
  revealAccessSecretAction,
  updateAccessEntryAction,
} from "@/actions/access";

const editInput =
  "w-full min-w-0 rounded-md border border-border bg-surface px-2 py-1.5 text-ui text-foreground placeholder:text-subtle/60 focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

// Espelha ACCESS_KINDS de @wayline/db (não pode importar valor em runtime —
// puxaria o client do banco pro bundle do browser).
const KIND_META = {
  ftp: { label: "FTP", icon: HardDrive },
  smtp: { label: "SMTP", icon: Mail },
  database: { label: "Banco de dados", icon: Database },
  api: { label: "API", icon: Webhook },
  hosting: { label: "Hospedagem", icon: Server },
  other: { label: "Outro", icon: KeyRound },
} satisfies Record<string, { label: string; icon: LucideIcon }>;
const ACCESS_KIND_KEYS = Object.keys(KIND_META) as (keyof typeof KIND_META)[];

function kindMeta(kind: string) {
  return KIND_META[kind as keyof typeof KIND_META] ?? KIND_META.other;
}

/** Botão com ícone que abre um popover pra trocar o tipo — substitui o <select> nativo. */
function KindPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (kind: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const meta = kindMeta(value);
  const Icon = meta.icon;

  React.useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  if (disabled) {
    return (
      <span title={meta.label} className="flex size-8 items-center justify-center text-muted">
        <Icon className="size-4" />
      </span>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={meta.label}
        className="flex size-8 items-center justify-center rounded-md border border-border text-muted hover:border-brand-40 hover:text-foreground"
      >
        <Icon className="size-4" />
      </button>
      {open && (
        <div className="absolute left-0 top-9 z-20 w-44 rounded-lg border border-border bg-surface p-1 shadow-lg">
          {ACCESS_KIND_KEYS.map((k) => {
            const KIcon = KIND_META[k].icon;
            return (
              <button
                key={k}
                type="button"
                onClick={() => {
                  onChange(k);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-dense hover:bg-elevated",
                  k === value ? "font-medium text-brand" : "text-foreground",
                )}
              >
                <KIcon className="size-3.5" />
                {KIND_META[k].label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AccessVault({
  orgId,
  tableId,
  name,
  isAdmin,
}: {
  orgId: string;
  tableId: string;
  name: string;
  isAdmin: boolean;
}) {
  const [rows, setRows] = React.useState<AccessEntryDTO[] | null>(null);
  const [reveal, setReveal] = React.useState<Record<string, boolean>>({});
  // Senhas só existem aqui depois de reveladas sob demanda — nunca vêm na
  // listagem inicial (ver revealAccessSecretAction).
  const [revealed, setRevealed] = React.useState<Record<string, string>>({});
  const [revealing, setRevealing] = React.useState<Record<string, boolean>>({});
  const [copied, setCopied] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const [search, setSearch] = React.useState("");
  const [kindFilter, setKindFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">("all");

  React.useEffect(() => {
    listAccessEntriesAction(orgId, tableId)
      .then(setRows)
      .catch(() => setRows([]));
    setRevealed({});
    setReveal({});
    setSearch("");
    setKindFilter("all");
    setStatusFilter("all");
  }, [orgId, tableId]);

  function patch(id: string, field: keyof AccessEntryDTO, value: string) {
    setRows((rs) => rs?.map((r) => (r.id === id ? { ...r, [field]: value } : r)) ?? rs);
  }
  function save(id: string, field: string, value: string) {
    if (!isAdmin) return;
    void updateAccessEntryAction(orgId, id, { [field]: value }).catch(() => {});
  }
  function saveKind(id: string, kind: string) {
    patch(id, "kind", kind);
    save(id, "kind", kind);
  }
  /** Busca a senha decifrada uma vez e guarda localmente; reusa se já revelada. */
  async function ensureRevealed(id: string): Promise<string | null> {
    if (revealed[id] !== undefined) return revealed[id]!;
    setRevealing((s) => ({ ...s, [id]: true }));
    const secret = await revealAccessSecretAction(orgId, id).catch(() => null);
    setRevealing((s) => ({ ...s, [id]: false }));
    if (secret !== null) setRevealed((s) => ({ ...s, [id]: secret }));
    return secret;
  }
  async function toggleReveal(id: string) {
    if (!reveal[id]) await ensureRevealed(id);
    setReveal((s) => ({ ...s, [id]: !s[id] }));
  }
  async function addRow() {
    if (busy) return;
    setBusy(true);
    const dto = await createAccessEntryAction(orgId, tableId, {}).catch(() => null);
    setBusy(false);
    if (dto) {
      setRows((rs) => [...(rs ?? []), dto]);
      setEditingId(dto.id); // já abre em edição
    }
  }
  function removeRow(id: string) {
    setRows((rs) => rs?.filter((r) => r.id !== id) ?? rs);
    if (editingId === id) setEditingId(null);
    void deleteAccessEntryAction(orgId, id).catch(() => {});
  }
  function toggleStatus(r: AccessEntryDTO) {
    if (!isAdmin) return;
    const next = r.status === "active" ? "inactive" : "active";
    patch(r.id, "status", next);
    save(r.id, "status", next);
  }
  function togglePwd(r: AccessEntryDTO) {
    if (!isAdmin) return;
    const next = !r.pwdChanged;
    setRows((rs) => rs?.map((x) => (x.id === r.id ? { ...x, pwdChanged: next } : x)) ?? rs);
    void updateAccessEntryAction(orgId, r.id, { pwdChanged: next }).catch(() => {});
  }
  function copy(text: string, key: string) {
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1200);
    });
  }
  async function copySecret(r: AccessEntryDTO) {
    const secret = await ensureRevealed(r.id);
    if (secret) copy(secret, `secret:${r.id}`);
  }
  /** Só salva se o admin digitou algo — em branco não apaga a senha por engano. */
  function saveSecret(id: string, value: string) {
    if (!isAdmin || !value) return;
    setRevealed((s) => ({ ...s, [id]: value }));
    void updateAccessEntryAction(orgId, id, { secret: value }).catch(() => {});
  }
  function onDropRow(targetId: string) {
    if (!dragId || dragId === targetId || !rows) return setDragId(null);
    const from = rows.findIndex((r) => r.id === dragId);
    const to = rows.findIndex((r) => r.id === targetId);
    if (from < 0 || to < 0) return setDragId(null);
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    setRows(next);
    setDragId(null);
    void reorderAccessEntriesAction(orgId, next.map((r) => r.id)).catch(() => {});
  }

  const cols = isAdmin ? 11 : 9;
  const filtersActive = kindFilter !== "all" || statusFilter !== "all" || search.trim() !== "";
  const visibleRows = React.useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (kindFilter !== "all" && r.kind !== kindFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (q) {
        const hay = `${r.name} ${r.url} ${r.login} ${r.note}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, kindFilter, statusFilter]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="w-full px-6 py-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <KeyRound className="size-5" />
          </span>
          <div>
            <h1 className="font-display text-h2 font-bold text-foreground">Central de Acessos</h1>
            <p className="text-dense text-muted">{name}</p>
          </div>
        </div>

        {rows !== null && rows.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative w-56 shrink-0">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar…"
                className="h-8 pl-8"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setKindFilter("all")}
                className={cn(
                  "rounded-pill px-2.5 py-1 text-[11px] font-medium",
                  kindFilter === "all" ? "bg-brand/15 text-brand" : "text-subtle hover:bg-elevated",
                )}
              >
                Todos os tipos
              </button>
              {ACCESS_KIND_KEYS.map((k) => {
                const Icon = KIND_META[k].icon;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKindFilter((f) => (f === k ? "all" : k))}
                    title={KIND_META[k].label}
                    className={cn(
                      "flex items-center gap-1 rounded-pill px-2.5 py-1 text-[11px] font-medium",
                      kindFilter === k ? "bg-brand/15 text-brand" : "text-subtle hover:bg-elevated",
                    )}
                  >
                    <Icon className="size-3" />
                    {KIND_META[k].label}
                  </button>
                );
              })}
            </div>

            <div className="ml-auto flex items-center gap-0.5 rounded-pill border border-border p-0.5">
              {(["all", "active", "inactive"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "rounded-pill px-2.5 py-1 text-[11px] font-medium",
                    statusFilter === s ? "bg-brand/15 text-brand" : "text-subtle hover:bg-elevated",
                  )}
                >
                  {s === "all" ? "Todas" : s === "active" ? "Ativa" : "Inativa"}
                </button>
              ))}
            </div>
          </div>
        )}

        {rows === null ? (
          <p className="py-10 text-center text-dense text-subtle">Carregando…</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[980px] border-collapse text-ui">
              <thead>
                <tr className="border-b border-border bg-canvas text-left text-label uppercase text-subtle">
                  {isAdmin && <th className="w-8" />}
                  <th className="w-10 px-3 py-2.5 font-medium">Tipo</th>
                  <th className="px-3 py-2.5 font-medium">Nome</th>
                  <th className="px-3 py-2.5 font-medium">URL</th>
                  <th className="w-20 px-3 py-2.5 font-medium">Porta</th>
                  <th className="px-3 py-2.5 font-medium">E-mail / Acesso</th>
                  <th className="px-3 py-2.5 font-medium">Senha</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Alteração de senha</th>
                  <th className="px-3 py-2.5 font-medium">Observação</th>
                  {isAdmin && <th className="w-20 px-2 py-2.5 text-right font-medium">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((r) => {
                  const editing = editingId === r.id;
                  const shown = reveal[r.id];
                  const draggable = isAdmin && !editing && !filtersActive;
                  return (
                    <tr
                      key={r.id}
                      draggable={draggable}
                      onDragStart={(e) => {
                        if (!draggable) return;
                        setDragId(r.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => draggable && e.preventDefault()}
                      onDrop={() => onDropRow(r.id)}
                      className={cn(
                        "border-b border-border last:border-0 hover:bg-elevated/40",
                        dragId === r.id && "opacity-40",
                      )}
                    >
                      {isAdmin && (
                        <td className="align-middle text-center">
                          <span
                            className={cn(
                              "inline-flex text-subtle",
                              draggable ? "cursor-grab active:cursor-grabbing" : "opacity-30",
                            )}
                            title={filtersActive ? "Limpe os filtros pra reordenar" : "Arraste para reordenar"}
                          >
                            <GripVertical className="size-4" />
                          </span>
                        </td>
                      )}

                      {/* Tipo */}
                      <td className="px-3 py-2 align-middle">
                        <KindPicker
                          value={r.kind}
                          onChange={(k) => saveKind(r.id, k)}
                          disabled={!isAdmin}
                        />
                      </td>

                      {/* Nome */}
                      <td className="px-3 py-2 align-middle">
                        {editing ? (
                          <input
                            className={editInput}
                            value={r.name}
                            placeholder="Nome"
                            onChange={(e) => patch(r.id, "name", e.target.value)}
                            onBlur={(e) => save(r.id, "name", e.target.value)}
                          />
                        ) : (
                          <span className="font-medium text-foreground">{r.name || "—"}</span>
                        )}
                      </td>

                      {/* URL */}
                      <td className="px-3 py-2 align-middle">
                        {editing ? (
                          <input
                            className={editInput}
                            value={r.url}
                            placeholder="https://…"
                            onChange={(e) => patch(r.id, "url", e.target.value)}
                            onBlur={(e) => save(r.id, "url", e.target.value)}
                          />
                        ) : r.url ? (
                          <a
                            href={/^https?:\/\//i.test(r.url) ? r.url : `https://${r.url}`}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="truncate text-brand hover:underline"
                          >
                            {r.url}
                          </a>
                        ) : (
                          <span className="text-subtle">—</span>
                        )}
                      </td>

                      {/* Porta */}
                      <td className="px-3 py-2 align-middle">
                        {editing ? (
                          <input
                            className={editInput}
                            value={r.port}
                            placeholder="587"
                            inputMode="numeric"
                            onChange={(e) => patch(r.id, "port", e.target.value)}
                            onBlur={(e) => save(r.id, "port", e.target.value)}
                          />
                        ) : (
                          <span className="text-foreground">{r.port || "—"}</span>
                        )}
                      </td>

                      {/* E-mail / Acesso */}
                      <td className="px-3 py-2 align-middle">
                        {editing ? (
                          <input
                            className={editInput}
                            value={r.login}
                            placeholder="e-mail / usuário"
                            onChange={(e) => patch(r.id, "login", e.target.value)}
                            onBlur={(e) => save(r.id, "login", e.target.value)}
                          />
                        ) : (
                          <span className="group/cell inline-flex items-center gap-1.5">
                            <span className="text-foreground">{r.login || "—"}</span>
                            {r.login && (
                              <button
                                type="button"
                                onClick={() => copy(r.login, `login:${r.id}`)}
                                title="Copiar"
                                className="text-subtle opacity-0 transition-opacity hover:text-brand group-hover/cell:opacity-100"
                              >
                                {copied === `login:${r.id}` ? (
                                  <Check className="size-3.5 text-success" />
                                ) : (
                                  <Copy className="size-3.5" />
                                )}
                              </button>
                            )}
                          </span>
                        )}
                      </td>

                      {/* Senha */}
                      <td className="px-3 py-2 align-middle">
                        {editing ? (
                          <input
                            className={cn(editInput, "font-mono")}
                            type={shown ? "text" : "password"}
                            value={revealed[r.id] ?? ""}
                            placeholder={r.hasSecret ? "•••••• (deixe em branco p/ manter)" : "••••••"}
                            autoComplete="off"
                            onChange={(e) =>
                              setRevealed((s) => ({ ...s, [r.id]: e.target.value }))
                            }
                            onBlur={(e) => saveSecret(r.id, e.target.value)}
                          />
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="font-mono text-foreground">
                              {!r.hasSecret
                                ? "—"
                                : shown
                                  ? (revealed[r.id] ?? "…")
                                  : "••••••••"}
                            </span>
                            {r.hasSecret && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void toggleReveal(r.id)}
                                  disabled={revealing[r.id]}
                                  title={shown ? "Ocultar" : "Mostrar"}
                                  className="text-subtle hover:text-foreground disabled:opacity-50"
                                >
                                  {shown ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void copySecret(r)}
                                  title="Copiar senha"
                                  className="text-subtle hover:text-brand"
                                >
                                  {copied === `secret:${r.id}` ? (
                                    <Check className="size-3.5 text-success" />
                                  ) : (
                                    <Copy className="size-3.5" />
                                  )}
                                </button>
                              </>
                            )}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2 align-middle">
                        <button
                          type="button"
                          onClick={() => toggleStatus(r)}
                          disabled={!isAdmin}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11px] font-semibold",
                            r.status === "active"
                              ? "bg-success/15 text-success"
                              : "bg-elevated text-subtle",
                            isAdmin && "cursor-pointer",
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              r.status === "active" ? "bg-success" : "bg-subtle",
                            )}
                          />
                          {r.status === "active" ? "Ativa" : "Inativa"}
                        </button>
                      </td>

                      {/* Alteração de senha */}
                      <td className="px-3 py-2 align-middle">
                        <button
                          type="button"
                          onClick={() => togglePwd(r)}
                          disabled={!isAdmin}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11px] font-semibold",
                            r.pwdChanged
                              ? "bg-success/15 text-success"
                              : "bg-warning/15 text-warning",
                            isAdmin && "cursor-pointer",
                          )}
                          title={r.pwdChanged ? "Senha já alterada" : "Alteração pendente"}
                        >
                          {r.pwdChanged ? (
                            <Check className="size-3" />
                          ) : (
                            <span className="size-1.5 rounded-full bg-warning" />
                          )}
                          {r.pwdChanged ? "Feita" : "Pendente"}
                        </button>
                      </td>

                      {/* Observação */}
                      <td className="px-3 py-2 align-middle">
                        {editing ? (
                          <input
                            className={editInput}
                            value={r.note}
                            placeholder="Observação"
                            onChange={(e) => patch(r.id, "note", e.target.value)}
                            onBlur={(e) => save(r.id, "note", e.target.value)}
                          />
                        ) : (
                          <span className="block max-w-[220px] truncate text-muted" title={r.note}>
                            {r.note || "—"}
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      {isAdmin && (
                        <td className="px-2 py-2 align-middle">
                          <div className="flex items-center justify-end gap-0.5">
                            <button
                              type="button"
                              onClick={() => setEditingId(editing ? null : r.id)}
                              aria-label={editing ? "Concluir edição" : "Editar"}
                              title={editing ? "Concluir" : "Editar"}
                              className={cn(
                                "flex size-7 items-center justify-center rounded hover:bg-elevated",
                                editing ? "text-success" : "text-subtle hover:text-foreground",
                              )}
                            >
                              {editing ? <Check className="size-4" /> : <Pencil className="size-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeRow(r.id)}
                              aria-label="Excluir acesso"
                              className="flex size-7 items-center justify-center rounded text-subtle hover:bg-elevated hover:text-danger"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {visibleRows.length === 0 && (
                  <tr>
                    <td colSpan={cols} className="px-3 py-8 text-center text-dense text-subtle">
                      {rows.length === 0 ? "Nenhum acesso ainda." : "Nada encontrado com esses filtros."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {isAdmin && rows !== null && (
          <Button variant="secondary" className="mt-3" onClick={addRow} disabled={busy}>
            <Plus className="size-4" /> {busy ? "Adicionando…" : "Adicionar acesso"}
          </Button>
        )}

        <p className="mt-6 text-[11px] text-subtle">
          Admin edita; membros veem e copiam. As senhas só saem do banco quando alguém clica em
          "mostrar" ou "copiar" — nunca vão na listagem. São cifradas em repouso quando a chave de
          criptografia está configurada.
        </p>
      </div>
    </div>
  );
}
