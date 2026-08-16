"use client";

import * as React from "react";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  KeyRound,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button, cn } from "@wayline/ui";
import type { AccessEntryDTO } from "@wayline/db";
import {
  createAccessEntryAction,
  deleteAccessEntryAction,
  listAccessEntriesAction,
  reorderAccessEntriesAction,
  updateAccessEntryAction,
} from "@/actions/access";

const editInput =
  "w-full min-w-0 rounded-md border border-border bg-surface px-2 py-1.5 text-ui text-foreground placeholder:text-subtle/60 focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AccessVault({
  orgId,
  spaceId,
  spaceName,
  isAdmin,
}: {
  orgId: string;
  spaceId: string;
  spaceName: string;
  isAdmin: boolean;
}) {
  const [rows, setRows] = React.useState<AccessEntryDTO[] | null>(null);
  const [reveal, setReveal] = React.useState<Record<string, boolean>>({});
  const [copied, setCopied] = React.useState<string | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    listAccessEntriesAction(orgId, spaceId)
      .then(setRows)
      .catch(() => setRows([]));
  }, [orgId, spaceId]);

  function patch(id: string, field: keyof AccessEntryDTO, value: string) {
    setRows((rs) => rs?.map((r) => (r.id === id ? { ...r, [field]: value } : r)) ?? rs);
  }
  function save(id: string, field: string, value: string) {
    if (!isAdmin) return;
    void updateAccessEntryAction(orgId, id, { [field]: value }).catch(() => {});
  }
  async function addRow() {
    if (busy) return;
    setBusy(true);
    const dto = await createAccessEntryAction(orgId, spaceId, {}).catch(() => null);
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
  function copy(text: string, key: string) {
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1200);
    });
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

  const cols = isAdmin ? 7 : 5;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="w-full px-6 py-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <KeyRound className="size-5" />
          </span>
          <div>
            <h1 className="font-display text-h2 font-bold text-foreground">Central de Acessos</h1>
            <p className="text-dense text-muted">{spaceName}</p>
          </div>
        </div>

        {rows === null ? (
          <p className="py-10 text-center text-dense text-subtle">Carregando…</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[820px] border-collapse text-ui">
              <thead>
                <tr className="border-b border-border bg-canvas text-left text-label uppercase text-subtle">
                  {isAdmin && <th className="w-8" />}
                  <th className="px-3 py-2.5 font-medium">Nome</th>
                  <th className="px-3 py-2.5 font-medium">URL</th>
                  <th className="px-3 py-2.5 font-medium">E-mail / Acesso</th>
                  <th className="px-3 py-2.5 font-medium">Senha</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  {isAdmin && <th className="w-20 px-2 py-2.5 text-right font-medium">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const editing = editingId === r.id;
                  const shown = reveal[r.id];
                  const draggable = isAdmin && !editing;
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
                            className="inline-flex cursor-grab text-subtle active:cursor-grabbing"
                            title="Arraste para reordenar"
                          >
                            <GripVertical className="size-4" />
                          </span>
                        </td>
                      )}

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
                            value={r.secret}
                            placeholder="••••••"
                            autoComplete="off"
                            onChange={(e) => patch(r.id, "secret", e.target.value)}
                            onBlur={(e) => save(r.id, "secret", e.target.value)}
                          />
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="font-mono text-foreground">
                              {r.secret ? (shown ? r.secret : "••••••••") : "—"}
                            </span>
                            {r.secret && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setReveal((s) => ({ ...s, [r.id]: !s[r.id] }))}
                                  title={shown ? "Ocultar" : "Mostrar"}
                                  className="text-subtle hover:text-foreground"
                                >
                                  {shown ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => copy(r.secret, `secret:${r.id}`)}
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
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={cols} className="px-3 py-8 text-center text-dense text-subtle">
                      Nenhum acesso ainda.
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
          Admin edita; membros veem e copiam. As senhas são cifradas em repouso quando a chave de
          criptografia está configurada.
        </p>
      </div>
    </div>
  );
}
