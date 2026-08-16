"use client";

import * as React from "react";
import { Eye, EyeOff, KeyRound, Plus, Trash2 } from "lucide-react";
import { Button, cn } from "@wayline/ui";
import type { AccessEntryDTO } from "@wayline/db";
import {
  createAccessEntryAction,
  deleteAccessEntryAction,
  listAccessEntriesAction,
  updateAccessEntryAction,
} from "@/actions/access";

const cellInput =
  "w-full min-w-0 rounded bg-transparent px-2 py-1.5 text-ui text-foreground placeholder:text-subtle/60 focus:bg-elevated focus:outline-none read-only:cursor-default";

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
    if (dto) setRows((rs) => [...(rs ?? []), dto]);
  }
  function removeRow(id: string) {
    setRows((rs) => rs?.filter((r) => r.id !== id) ?? rs);
    void deleteAccessEntryAction(orgId, id).catch(() => {});
  }
  function toggleStatus(r: AccessEntryDTO) {
    const next = r.status === "active" ? "inactive" : "active";
    patch(r.id, "status", next);
    save(r.id, "status", next);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
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
            <table className="w-full min-w-[720px] border-collapse text-ui">
              <thead>
                <tr className="border-b border-border bg-canvas text-left text-label uppercase text-subtle">
                  <th className="px-3 py-2 font-medium">Nome</th>
                  <th className="px-3 py-2 font-medium">URL</th>
                  <th className="px-3 py-2 font-medium">E-mail / Acesso</th>
                  <th className="px-3 py-2 font-medium">Senha</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  {isAdmin && <th className="w-10 px-2 py-2" />}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-elevated/40">
                    <td className="align-middle">
                      <input
                        className={cn(cellInput, "font-medium")}
                        readOnly={!isAdmin}
                        value={r.name}
                        placeholder="Nome"
                        onChange={(e) => patch(r.id, "name", e.target.value)}
                        onBlur={(e) => save(r.id, "name", e.target.value)}
                      />
                    </td>
                    <td className="align-middle">
                      <div className="flex items-center gap-1">
                        <input
                          className={cn(cellInput, "text-brand")}
                          readOnly={!isAdmin}
                          value={r.url}
                          placeholder="https://…"
                          onChange={(e) => patch(r.id, "url", e.target.value)}
                          onBlur={(e) => save(r.id, "url", e.target.value)}
                        />
                        {r.url && (
                          <a
                            href={/^https?:\/\//i.test(r.url) ? r.url : `https://${r.url}`}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="shrink-0 pr-2 text-subtle hover:text-brand"
                            title="Abrir"
                          >
                            ↗
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="align-middle">
                      <input
                        className={cellInput}
                        readOnly={!isAdmin}
                        value={r.login}
                        placeholder="e-mail / usuário"
                        onChange={(e) => patch(r.id, "login", e.target.value)}
                        onBlur={(e) => save(r.id, "login", e.target.value)}
                      />
                    </td>
                    <td className="align-middle">
                      <div className="flex items-center gap-1">
                        <input
                          className={cn(cellInput, "font-mono")}
                          readOnly={!isAdmin}
                          type={reveal[r.id] ? "text" : "password"}
                          value={r.secret}
                          placeholder="••••••"
                          autoComplete="off"
                          onChange={(e) => patch(r.id, "secret", e.target.value)}
                          onBlur={(e) => save(r.id, "secret", e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setReveal((s) => ({ ...s, [r.id]: !s[r.id] }))}
                          className="shrink-0 pr-2 text-subtle hover:text-foreground"
                          title={reveal[r.id] ? "Ocultar" : "Mostrar"}
                        >
                          {reveal[r.id] ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-3 align-middle">
                      <button
                        type="button"
                        onClick={() => isAdmin && toggleStatus(r)}
                        disabled={!isAdmin}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11px] font-semibold",
                          r.status === "active"
                            ? "bg-success/15 text-success"
                            : "bg-elevated text-subtle",
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
                    {isAdmin && (
                      <td className="px-2 align-middle">
                        <button
                          type="button"
                          onClick={() => removeRow(r.id)}
                          aria-label="Excluir acesso"
                          className="flex size-7 items-center justify-center rounded text-subtle hover:bg-elevated hover:text-danger"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="px-3 py-8 text-center text-dense text-subtle">
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
          As senhas ficam guardadas no seu banco (como no Notion) e mascaradas aqui. Visível para
          membros do workspace.
        </p>
      </div>
    </div>
  );
}
