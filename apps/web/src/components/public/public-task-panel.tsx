"use client";

import * as React from "react";
import { Send, X } from "lucide-react";
import type { PublicCommentDTO } from "@wayline/db";
import { Button, Input, cn } from "@wayline/ui";
import type { TaskCard as TaskCardType } from "@/mock/types";
import { addPublicCommentAction, listPublicCommentsAction } from "@/actions/public-board";

const NAME_KEY = "wayline_guest_name";

function timeAgo(value: Date): string {
  const s = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (s < 60) return "agora";
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

export function PublicTaskPanel({
  token,
  card,
  onClose,
}: {
  token: string;
  card: TaskCardType;
  onClose: () => void;
}) {
  const [comments, setComments] = React.useState<PublicCommentDTO[] | null>(null);
  const [name, setName] = React.useState("");
  const [body, setBody] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setName(localStorage.getItem(NAME_KEY) ?? "");
    listPublicCommentsAction(token, card.id).then(setComments);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [token, card.id, onClose]);

  async function send() {
    const n = name.trim();
    const t = body.trim();
    if (!n || !t || busy) return;
    setBusy(true);
    try {
      localStorage.setItem(NAME_KEY, n);
      const created = await addPublicCommentAction(token, card.id, n, t);
      if (created) {
        setComments((c) => [...(c ?? []), created]);
        setBody("");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-3.5">
          <div className="min-w-0">
            {card.client && (
              <span className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: card.client.color }}
                />
                {card.client.name}
              </span>
            )}
            <h2 className="font-display text-h3 font-bold leading-tight">{card.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {card.description && (
            <p className="whitespace-pre-wrap text-ui text-muted">{card.description}</p>
          )}
          {(card.dueLabel || card.tags.length > 0) && (
            <div className="flex flex-wrap items-center gap-2">
              {card.dueLabel && (
                <span
                  className={cn(
                    "rounded-pill border border-border px-2 py-0.5 text-[11px]",
                    card.overdue ? "font-semibold text-danger" : "text-muted",
                  )}
                >
                  Prazo: {card.dueLabel}
                </span>
              )}
              {card.tags.map((t) => (
                <span
                  key={t.label}
                  className="rounded-pill px-2 py-0.5 text-[11px] font-semibold"
                  style={{ backgroundColor: `${t.color}22`, color: t.color }}
                >
                  {t.label}
                </span>
              ))}
            </div>
          )}

          <div className="border-t border-border pt-3">
            <span className="text-label uppercase text-subtle">Comentários</span>
            <div className="mt-2 space-y-3">
              {comments === null ? (
                <p className="text-dense text-subtle">Carregando…</p>
              ) : comments.length === 0 ? (
                <p className="text-dense text-subtle">Seja o primeiro a comentar.</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id}>
                    <div className="flex items-center gap-2">
                      <span className="text-dense font-semibold text-foreground">{c.name}</span>
                      <span className="text-[11px] text-subtle">{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-ui text-muted">{c.body}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2 border-t border-border p-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            className="h-9"
          />
          <div className="flex items-end gap-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Escreva um comentário…"
              rows={2}
              className="flex-1 resize-y rounded-md border border-border bg-surface px-3 py-2 text-ui text-foreground placeholder:text-subtle focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button
              type="button"
              size="icon"
              onClick={() => void send()}
              disabled={!name.trim() || !body.trim() || busy}
              aria-label="Enviar comentário"
            >
              <Send />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
