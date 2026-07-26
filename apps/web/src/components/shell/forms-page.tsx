"use client";

import * as React from "react";
import {
  Briefcase,
  ClipboardList,
  FileText,
  FolderPlus,
  MessageSquareHeart,
  Plus,
  ShoppingCart,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { FormFieldSchema, FormListItem } from "@wayline/db";
import { Badge, cn } from "@wayline/ui";
import { createFormAction, listFormsAction } from "@/actions/forms";
import { BLANK_TEMPLATE, FORM_TEMPLATES, type FormTemplate } from "@/lib/form-templates";
import { FormBuilderModal } from "@/components/shell/form-builder-modal";

const ICONS: Record<string, LucideIcon> = {
  MessageSquareHeart,
  FolderPlus,
  ShoppingCart,
  Briefcase,
  Wrench,
  Plus,
};

const withIds = (fields: Array<Omit<FormFieldSchema, "id">>): FormFieldSchema[] =>
  fields.map((f) => ({ ...f, id: crypto.randomUUID() }));

export function FormsPage({ orgId, isAdmin }: { orgId: string; isAdmin: boolean }) {
  const [list, setList] = React.useState<FormListItem[] | null>(null);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);

  const reload = React.useCallback(() => listFormsAction(orgId).then(setList), [orgId]);
  React.useEffect(() => {
    reload();
  }, [reload]);

  async function fromTemplate(t: FormTemplate) {
    if (creating || !isAdmin) return;
    setCreating(true);
    const id = await createFormAction(orgId, {
      title: t.title,
      description: t.formDescription,
      fields: withIds(t.fields),
    }).catch(() => null);
    setCreating(false);
    if (id) {
      await reload();
      setOpenId(id);
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <ClipboardList className="size-6" />
          </span>
          <div>
            <h1 className="font-display text-h2 font-bold">Formulários</h1>
            <p className="text-ui text-muted">
              Crie formulários para iniciar projetos, coletar opiniões e receber pedidos.
            </p>
          </div>
        </div>

        {/* Seus formulários */}
        {list && list.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-2 text-label uppercase text-subtle">Seus formulários</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {list.map((fm) => (
                <button
                  key={fm.id}
                  type="button"
                  onClick={() => setOpenId(fm.id)}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-all hover:border-brand-40 hover:shadow-sm"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <FileText className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-ui font-semibold text-foreground">{fm.title}</p>
                    <p className="text-dense text-muted">
                      {fm.fieldCount} campo{fm.fieldCount === 1 ? "" : "s"} ·{" "}
                      {fm.responseCount} resposta{fm.responseCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Badge variant={fm.status === "published" ? "success" : "neutral"} size="sm">
                    {fm.status === "published" ? "Publicado" : "Rascunho"}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Galeria de modelos */}
        {isAdmin ? (
          <>
            <div className="mb-1 text-center">
              <h2 className="font-display text-h3 font-bold">Escolha um modelo de formulário</h2>
              <p className="mt-1 text-ui text-muted">
                Comece de um modelo pronto ou monte o seu do zero.
              </p>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FORM_TEMPLATES.map((t) => {
                const Icon = ICONS[t.icon] ?? FileText;
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={creating}
                    onClick={() => fromTemplate(t)}
                    className={cn(
                      "flex flex-col gap-3 rounded-xl border border-border bg-surface p-5 text-left transition-all hover:border-brand-40 hover:shadow-sm disabled:opacity-60",
                    )}
                  >
                    <span
                      className="flex size-11 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${t.color}1a`, color: t.color }}
                    >
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <p className="text-ui font-semibold text-foreground">{t.name}</p>
                      <p className="mt-0.5 text-dense text-muted">{t.description}</p>
                    </div>
                  </button>
                );
              })}

              {/* Começar do zero */}
              <button
                type="button"
                disabled={creating}
                onClick={() => fromTemplate(BLANK_TEMPLATE)}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-5 text-center text-muted transition-colors hover:border-brand-40 hover:text-foreground disabled:opacity-60"
              >
                <span className="flex size-11 items-center justify-center rounded-lg bg-elevated">
                  <Plus className="size-5" />
                </span>
                <p className="text-ui font-semibold">Começar do zero</p>
              </button>
            </div>
          </>
        ) : (
          list &&
          list.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-dense text-subtle">
              Nenhum formulário ainda.
            </div>
          )
        )}
      </div>

      {openId && (
        <FormBuilderModal
          orgId={orgId}
          formId={openId}
          onClose={() => setOpenId(null)}
          onSaved={reload}
        />
      )}
    </div>
  );
}
