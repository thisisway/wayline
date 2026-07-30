"use client";

import * as React from "react";
import {
  Clapperboard,
  Globe,
  Instagram,
  LayoutTemplate,
  PenLine,
  TrendingUp,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button, Input, cn } from "@wayline/ui";
import { createProjectFromTemplateAction } from "@/actions/org";
import { PROJECT_TEMPLATES } from "@/lib/project-templates";

const ICONS: Record<string, LucideIcon> = {
  Instagram, TrendingUp, Clapperboard, Globe, UserPlus, PenLine,
};

export function TemplatesModal({
  orgId,
  spaces,
  onClose,
}: {
  orgId: string;
  spaces: Array<{ id: string; name: string }>;
  onClose: () => void;
}) {
  const [sel, setSel] = React.useState<string | null>(null);
  const [spaceId, setSpaceId] = React.useState<string>(spaces[0]?.id ?? "__new__");
  const [newSpace, setNewSpace] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const template = PROJECT_TEMPLATES.find((t) => t.id === sel);

  async function create() {
    if (!sel || busy) return;
    const useNew = spaceId === "__new__";
    if (useNew && !newSpace.trim()) return;
    setBusy(true);
    const ok = await createProjectFromTemplateAction(
      orgId,
      sel,
      useNew ? null : spaceId,
      useNew ? newSpace.trim() : null,
    ).catch(() => false);
    setBusy(false);
    if (ok) {
      onClose();
      // O cookie de lista ativa foi setado; recarrega para abrir o projeto novo.
      window.location.href = "/app";
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark/60 p-4 animate-fade-in" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="flex items-center gap-2 font-display text-ui font-bold">
            <LayoutTemplate className="size-4" /> Templates de projeto
          </h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex size-7 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <p className="mb-4 text-dense text-muted">Escolha um modelo pronto — cria uma lista com colunas e tarefas de exemplo.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PROJECT_TEMPLATES.map((t) => {
              const Icon = ICONS[t.icon] ?? LayoutTemplate;
              const on = sel === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSel(t.id)}
                  className={cn("flex flex-col gap-2 rounded-xl border p-4 text-left transition-all", on ? "border-brand ring-1 ring-brand" : "border-border hover:border-brand-40")}
                >
                  <span className="flex size-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${t.color}1a`, color: t.color }}>
                    <Icon className="size-5" />
                  </span>
                  <p className="text-ui font-semibold text-foreground">{t.name}</p>
                  <p className="text-dense text-muted">{t.description}</p>
                  <p className="mt-1 text-[11px] text-subtle">{t.columns.length} colunas · {t.tasks.length} tarefas de exemplo</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Rodapé: escolher destino + criar */}
        {template && (
          <div className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-3">
            <span className="text-dense text-muted">Criar <strong className="text-foreground">{template.name}</strong> em</span>
            <select value={spaceId} onChange={(e) => setSpaceId(e.target.value)} className="h-9 rounded-md border border-border bg-canvas px-2 text-dense text-foreground">
              {spaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              <option value="__new__">＋ Novo space…</option>
            </select>
            {spaceId === "__new__" && (
              <Input value={newSpace} onChange={(e) => setNewSpace(e.target.value)} placeholder="Nome do space" className="h-9 w-40" />
            )}
            <Button className="ml-auto" onClick={create} disabled={busy || (spaceId === "__new__" && !newSpace.trim())}>
              {busy ? "Criando…" : "Criar projeto"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
