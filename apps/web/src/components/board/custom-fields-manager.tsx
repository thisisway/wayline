"use client";

import * as React from "react";
import { Plus, Trash2, X } from "lucide-react";
import type { CustomFieldDef, CustomFieldType } from "@wayline/db";
import { Button, Input, cn } from "@wayline/ui";
import {
  createFieldAction,
  deleteFieldAction,
  listFieldsAction,
} from "@/actions/custom-fields";

const TYPES: { value: CustomFieldType; label: string }[] = [
  { value: "text", label: "Texto" },
  { value: "number", label: "Número" },
  { value: "select", label: "Seleção" },
  { value: "date", label: "Data" },
  { value: "checkbox", label: "Sim/Não" },
];

const selectClass =
  "h-10 rounded-md border border-border bg-surface px-3 text-ui text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function CustomFieldsManager({
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
  const [fields, setFields] = React.useState<CustomFieldDef[] | null>(null);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<CustomFieldType>("text");
  const [optionsText, setOptionsText] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    listFieldsAction(orgId, listId).then(setFields);
  }, [orgId, listId]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function add() {
    const n = name.trim();
    if (!n || busy) return;
    const options =
      type === "select"
        ? optionsText
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean)
        : [];
    if (type === "select" && options.length === 0) return;
    setBusy(true);
    try {
      const created = await createFieldAction(orgId, listId, { name: n, type, options });
      if (created) {
        setFields((f) => [...(f ?? []), created]);
        setName("");
        setOptionsText("");
        setType("text");
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setFields((f) => (f ?? []).filter((x) => x.id !== id));
    await deleteFieldAction(orgId, id).catch(() => {});
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div>
            <h2 className="font-display text-h3 font-bold">Campos customizados</h2>
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

        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-1.5">
            {fields === null ? (
              <p className="text-dense text-subtle">Carregando…</p>
            ) : fields.length === 0 ? (
              <p className="py-2 text-dense text-subtle">Nenhum campo ainda.</p>
            ) : (
              fields.map((f) => (
                <div
                  key={f.id}
                  className="group flex items-center gap-2 rounded-md bg-elevated/60 px-3 py-2"
                >
                  <span className="flex-1 truncate text-ui text-foreground">{f.name}</span>
                  <span className="shrink-0 rounded-pill bg-surface px-2 py-0.5 text-[11px] text-subtle">
                    {TYPES.find((t) => t.value === f.type)?.label ?? f.type}
                    {f.type === "select" && f.options.length > 0 && ` · ${f.options.length}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(f.id)}
                    aria-label="Excluir campo"
                    className="text-subtle opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 space-y-2 border-t border-border pt-4">
            <span className="text-label uppercase text-subtle">Novo campo</span>
            <div className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && type !== "select") {
                    e.preventDefault();
                    void add();
                  }
                }}
                placeholder="Nome do campo"
                className="flex-1"
              />
              <select
                className={selectClass}
                value={type}
                onChange={(e) => setType(e.target.value as CustomFieldType)}
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            {type === "select" && (
              <Input
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder="Opções separadas por vírgula"
              />
            )}
            <Button
              type="button"
              onClick={() => void add()}
              disabled={!name.trim() || busy || (type === "select" && !optionsText.trim())}
              className={cn("w-full gap-1.5")}
            >
              <Plus className="size-4" />
              Adicionar campo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
