"use client";

import * as React from "react";
import { signOut } from "next-auth/react";
import { AlertTriangle, Download, Trash2 } from "lucide-react";
import { Button, Input } from "@wayline/ui";
import { deleteAccountAction, exportMyDataAction } from "@/actions/account";

/** Seção "Privacidade e dados" (LGPD): exportar dados e excluir conta. */
export function AccountDataSection({ userEmail }: { userEmail: string }) {
  const [exporting, setExporting] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function exportData() {
    setExporting(true);
    const data = await exportMyDataAction().catch(() => null);
    setExporting(false);
    if (!data) {
      setError("Não foi possível exportar agora.");
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "meus-dados-wayline.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function del() {
    if (email.trim().toLowerCase() !== userEmail.toLowerCase() || deleting) return;
    setDeleting(true);
    setError(null);
    const res = await deleteAccountAction(email).catch(() => ({ ok: false }) as const);
    if (res.ok) {
      await signOut({ redirectTo: "/login" });
      return;
    }
    setDeleting(false);
    if ("blocked" in res && res.blocked && res.blocked.length) {
      setError(
        `Você é o dono de: ${res.blocked.join(", ")}. Transfira ou remova os outros membros antes de excluir a conta.`,
      );
    } else {
      setError("E-mail não confere ou houve um erro. Tente novamente.");
    }
  }

  return (
    <div className="py-4">
      <h3 className="mb-3 text-label uppercase text-subtle">Privacidade e dados</h3>

      <button
        type="button"
        onClick={exportData}
        disabled={exporting}
        className="flex w-full items-center gap-2 rounded-md border border-border bg-canvas px-3 h-9 text-ui font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground disabled:opacity-60"
      >
        <Download className="size-4" /> {exporting ? "Preparando…" : "Baixar meus dados (JSON)"}
      </button>

      <div className="mt-3 rounded-lg border border-danger/30 bg-danger/5 p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
          <div className="min-w-0 flex-1">
            <p className="text-dense font-semibold text-foreground">Excluir minha conta</p>
            <p className="mt-0.5 text-[12px] text-muted">
              Remove seus dados pessoais e seus vínculos. Workspaces em que você é o único membro
              são arquivados. Esta ação não pode ser desfeita.
            </p>

            {!confirm ? (
              <button
                type="button"
                onClick={() => setConfirm(true)}
                className="mt-2 flex items-center gap-1.5 rounded-md border border-danger/40 px-2.5 h-8 text-dense font-medium text-danger transition-colors hover:bg-danger/10"
              >
                <Trash2 className="size-3.5" /> Quero excluir
              </button>
            ) : (
              <div className="mt-2 space-y-2">
                <p className="text-[12px] text-muted">
                  Digite seu e-mail (<strong>{userEmail}</strong>) para confirmar:
                </p>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={userEmail}
                  className="h-9"
                />
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setConfirm(false);
                      setEmail("");
                      setError(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={del}
                    disabled={deleting || email.trim().toLowerCase() !== userEmail.toLowerCase()}
                  >
                    {deleting ? "Excluindo…" : "Excluir definitivamente"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && <p className="mt-2 text-dense font-medium text-danger">{error}</p>}
    </div>
  );
}
