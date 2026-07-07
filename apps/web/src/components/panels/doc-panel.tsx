"use client";

import * as React from "react";
import { FileText, Pencil, Sparkles, X } from "lucide-react";
import type { DocDTO } from "@wayline/db";
import { Button, cn } from "@wayline/ui";
import { getDocAction, generateBriefAction, saveDocAction } from "@/actions/documents";
import { aiEnabledAction } from "@/actions/ai";

function timeAgo(value: Date): string {
  const s = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (s < 60) return "agora";
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

export function DocPanel({
  orgId,
  listId,
  listName,
}: {
  orgId: string;
  listId: string;
  listName: string;
}) {
  const [open, setOpen] = React.useState(true);
  const [doc, setDoc] = React.useState<DocDTO | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    getDocAction(orgId, listId).then((d) => {
      if (!alive) return;
      setDoc(d);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [orgId, listId]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-dense font-medium text-muted shadow-lg transition-colors hover:text-foreground"
      >
        <FileText className="size-3.5" /> Brief
      </button>
    );
  }

  return (
    <>
      <div className="pointer-events-auto w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-lg animate-fade-in">
        <div className="flex items-center gap-2 border-b border-border px-3.5 py-3">
          <span className="flex size-7 items-center justify-center rounded-md bg-brand/15 text-brand">
            <FileText className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-dense font-semibold text-foreground">
              {doc?.title ?? "Brief do projeto"}
            </p>
            <p className="truncate text-[11px] text-subtle">
              {listName}
              {doc ? ` · ${timeAgo(doc.updatedAt)}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Editar"
            className="flex size-6 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fechar"
            className="flex size-6 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto px-3.5 py-3">
          {loading ? (
            <p className="text-dense text-subtle">Carregando…</p>
          ) : doc && doc.content.trim() ? (
            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-muted">
              {doc.content}
            </p>
          ) : (
            <div className="py-2 text-center">
              <p className="text-dense text-subtle">Nenhum brief ainda.</p>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="mt-1 text-dense font-medium text-brand hover:underline"
              >
                Criar brief
              </button>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <DocModal
          orgId={orgId}
          listId={listId}
          listName={listName}
          initial={doc}
          onClose={() => setEditing(false)}
          onSaved={(d) => {
            setDoc(d);
            setEditing(false);
          }}
        />
      )}
    </>
  );
}

function DocModal({
  orgId,
  listId,
  listName,
  initial,
  onClose,
  onSaved,
}: {
  orgId: string;
  listId: string;
  listName: string;
  initial: DocDTO | null;
  onClose: () => void;
  onSaved: (doc: DocDTO) => void;
}) {
  const [title, setTitle] = React.useState(initial?.title ?? "Brief do projeto");
  const [content, setContent] = React.useState(initial?.content ?? "");
  const [ai, setAi] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);

  React.useEffect(() => {
    aiEnabledAction().then(setAi);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function generate() {
    if (generating) return;
    setGenerating(true);
    try {
      const text = await generateBriefAction(orgId, listId);
      if (text) setContent(text);
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const doc = await saveDocAction(orgId, listId, title, content);
      if (doc) onSaved(doc);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-dark/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="min-w-0 flex-1 bg-transparent font-display text-h3 font-bold text-foreground focus:outline-none"
            placeholder="Título do brief"
          />
          <div className="flex items-center gap-2">
            {ai && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void generate()}
                disabled={generating}
                className="gap-1.5"
              >
                <Sparkles className="size-4 text-brand" />
                {generating ? "Gerando…" : "Gerar com IA"}
              </Button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="flex size-7 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <p className="mb-2 text-[11px] text-subtle">{listName}</p>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva o brief do projeto… ou gere com IA."
            className={cn(
              "min-h-[300px] w-full resize-y rounded-md border border-border bg-surface px-3 py-2",
              "text-ui leading-relaxed text-foreground placeholder:text-subtle",
              "focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3.5">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
