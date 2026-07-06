"use client";

import * as React from "react";
import { Check, Copy, Globe, Trash2, X } from "lucide-react";
import { Button, cn } from "@wayline/ui";
import { createShareAction, getShareAction, revokeShareAction } from "@/actions/board-share";

export function ShareModal({
  orgId,
  listId,
  listName,
  onClose,
}: {
  orgId: string;
  listId: string;
  listName: string;
  onClose: () => void;
}) {
  const [token, setToken] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    getShareAction(orgId, listId).then((t) => {
      setToken(t);
      setLoading(false);
    });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [orgId, listId, onClose]);

  const url = token && typeof window !== "undefined" ? `${window.location.origin}/share/${token}` : "";

  async function generate() {
    setBusy(true);
    try {
      const t = await createShareAction(orgId, listId);
      if (t) setToken(t);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  }

  async function revoke() {
    setToken(null);
    await revokeShareAction(orgId, listId).catch(() => {});
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div>
            <h2 className="font-display text-h3 font-bold">Compartilhar board</h2>
            <p className="text-dense text-subtle">{listName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-7 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <div className="flex items-start gap-2.5 rounded-lg bg-elevated/60 p-3">
            <Globe className="mt-0.5 size-4 shrink-0 text-brand" />
            <p className="text-dense text-muted">
              Gere um link <strong className="text-foreground">somente leitura</strong>. Qualquer
              pessoa com o link vê este board — sem conta, sem editar.
            </p>
          </div>

          {loading ? (
            <p className="text-dense text-subtle">Carregando…</p>
          ) : token ? (
            <>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-9 flex-1 rounded-md border border-border bg-canvas px-3 text-dense text-foreground"
                />
                <Button variant="secondary" onClick={copy} className="gap-1.5">
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
              </div>
              <button
                type="button"
                onClick={revoke}
                className="flex items-center gap-1.5 text-dense text-subtle hover:text-danger"
              >
                <Trash2 className="size-3.5" /> Revogar link
              </button>
            </>
          ) : (
            <Button onClick={generate} disabled={busy} className={cn("w-full gap-1.5")}>
              <Globe className="size-4" />
              {busy ? "Gerando…" : "Gerar link público"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
