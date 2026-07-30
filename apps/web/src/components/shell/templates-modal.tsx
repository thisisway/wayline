"use client";

import * as React from "react";
import {
  Bookmark,
  Clapperboard,
  Globe,
  Instagram,
  LayoutTemplate,
  PenLine,
  Trash2,
  TrendingUp,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button, Input, cn } from "@wayline/ui";
import type { OrgTemplateItem } from "@wayline/db";
import {
  createProjectFromTemplateAction,
  deleteOrgTemplateAction,
  listOrgTemplatesAction,
  saveBoardAsTemplateAction,
} from "@/actions/org";
import { PROJECT_TEMPLATES } from "@/lib/project-templates";

const ICONS: Record<string, LucideIcon> = {
  Instagram, TrendingUp, Clapperboard, Globe, UserPlus, PenLine,
};

export function TemplatesModal({
  orgId,
  spaces,
  activeListId,
  isAdmin,
  onClose,
}: {
  orgId: string;
  spaces: Array<{ id: string; name: string }>;
  activeListId?: string;
  isAdmin?: boolean;
  onClose: () => void;
}) {
  const [sel, setSel] = React.useState<string | null>(null);
  const [spaceId, setSpaceId] = React.useState<string>(spaces[0]?.id ?? "__new__");
  const [newSpace, setNewSpace] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [custom, setCustom] = React.useState<OrgTemplateItem[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [saveName, setSaveName] = React.useState("");

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  React.useEffect(() => {
    listOrgTemplatesAction(orgId).then(setCustom).catch(() => {});
  }, [orgId]);

  const builtin = PROJECT_TEMPLATES.find((t) => t.id === sel);
  const selName = builtin?.name ?? custom.find((c) => c.id === sel)?.name ?? "";

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
      window.location.href = "/app";
    }
  }

  async function saveCurrent() {
    if (!activeListId || !saveName.trim()) return;
    setBusy(true);
    const ok = await saveBoardAsTemplateAction(orgId, activeListId, saveName.trim()).catch(() => false);
    setBusy(false);
    if (ok) {
      setSaving(false);
      setSaveName("");
      listOrgTemplatesAction(orgId).then(setCustom).catch(() => {});
    }
  }

  async function remove(id: string) {
    setCustom((c) => c.filter((t) => t.id !== id));
    if (sel === id) setSel(null);
    await deleteOrgTemplateAction(orgId, id).catch(() => {});
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
          {isAdmin && activeListId && (
            <div className="mb-5">
              {saving ? (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-canvas p-3">
                  <Input autoFocus value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Nome do template" className="h-9 w-56"
                    onKeyDown={(e) => e.key === "Enter" && saveCurrent()} />
                  <Button className="h-9" onClick={saveCurrent} disabled={busy || !saveName.trim()}>Salvar</Button>
                  <button type="button" onClick={() => setSaving(false)} className="text-dense text-subtle hover:text-foreground">Cancelar</button>
                </div>
              ) : (
                <button type="button" onClick={() => setSaving(true)}
                  className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-dense text-muted hover:border-brand-40 hover:text-foreground">
                  <Bookmark className="size-4" /> Salvar projeto atual como template
                </button>
              )}
            </div>
          )}

          {custom.length > 0 && (
            <>
              <p className="mb-2 text-label uppercase text-subtle">Seus templates</p>
              <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {custom.map((t) => {
                  const on = sel === t.id;
                  return (
                    <div key={t.id} className={cn("group relative flex flex-col gap-2 rounded-xl border p-4 transition-all", on ? "border-brand ring-1 ring-brand" : "border-border hover:border-brand-40")}>
                      <button type="button" onClick={() => setSel(t.id)} className="flex flex-col gap-2 text-left">
                        <span className="flex size-10 items-center justify-center rounded-lg bg-brand/10 text-brand"><Bookmark className="size-5" /></span>
                        <p className="text-ui font-semibold text-foreground">{t.name}</p>
                        {t.description && <p className="text-dense text-muted">{t.description}</p>}
                        <p className="mt-1 text-[11px] text-subtle">{t.columns} colunas · {t.tasks} tarefas</p>
                      </button>
                      {isAdmin && (
                        <button type="button" onClick={() => remove(t.id)} aria-label={`Excluir ${t.name}`}
                          className="absolute right-2 top-2 flex size-6 items-center justify-center rounded text-subtle opacity-0 transition-opacity hover:bg-elevated hover:text-danger group-hover:opacity-100">
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mb-2 text-label uppercase text-subtle">Modelos prontos</p>
            </>
          )}

          {custom.length === 0 && (
            <p className="mb-4 text-dense text-muted">Escolha um modelo pronto — cria uma lista com colunas e tarefas de exemplo.</p>
          )}
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
        {sel && (
          <div className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-3">
            <span className="text-dense text-muted">Criar <strong className="text-foreground">{selName}</strong> em</span>
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
