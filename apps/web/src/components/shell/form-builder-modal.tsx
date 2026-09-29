"use client";

import * as React from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  GripVertical,
  Inbox,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { FormDTO, FormFieldSchema, FormResponseDTO } from "@wayline/db";
import { Badge, Button, Input, cn } from "@wayline/ui";
import {
  deleteFormAction,
  getFormAction,
  listFormResponsesAction,
  listListOptionsAction,
  updateFormAction,
} from "@/actions/forms";

const TYPES: Array<{ value: FormFieldSchema["type"]; label: string }> = [
  { value: "text", label: "Texto curto" },
  { value: "textarea", label: "Texto longo" },
  { value: "email", label: "E-mail" },
  { value: "number", label: "Número" },
  { value: "phone", label: "Telefone" },
  { value: "select", label: "Lista suspensa" },
];

function uid(): string {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    /* contexto sem crypto seguro */
  }
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function newField(): FormFieldSchema {
  return {
    id: uid(),
    type: "text",
    label: "Nova pergunta",
    placeholder: "",
    required: false,
    options: [],
  };
}

function csvEscape(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function FormBuilderModal({
  orgId,
  formId,
  onClose,
  onSaved,
}: {
  orgId: string;
  formId: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [loaded, setLoaded] = React.useState<FormDTO | null>(null);
  const [tab, setTab] = React.useState<"build" | "responses">("build");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [thankYou, setThankYou] = React.useState("");
  const [fields, setFields] = React.useState<FormFieldSchema[]>([]);
  const [published, setPublished] = React.useState(false);
  const [target, setTarget] = React.useState<"list" | "funnel">("list");
  const [targetListId, setTargetListId] = React.useState("");
  const [lists, setLists] = React.useState<Array<{ id: string; name: string }>>([]);
  const [saving, setSaving] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [responses, setResponses] = React.useState<FormResponseDTO[] | null>(null);

  // Carrega o formulário UMA vez por (org, form). Não depende de onClose —
  // senão um re-render do pai (ex.: refresh ao vivo) refazia o fetch e apagava
  // os campos ainda não salvos.
  React.useEffect(() => {
    getFormAction(orgId, formId).then((f) => {
      if (!f) return;
      setLoaded(f);
      setTitle(f.title);
      setDescription(f.description);
      setThankYou(f.thankYou);
      setFields(f.fields);
      setPublished(f.status === "published");
      setTarget(f.target === "funnel" ? "funnel" : "list");
      setTargetListId(f.targetListId ?? "");
    });
    listListOptionsAction(orgId).then(setLists);
  }, [orgId, formId]);

  // Fechar com Esc (efeito separado: re-vincular não recarrega o formulário).
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  React.useEffect(() => {
    if (tab === "responses" && responses === null) {
      listFormResponsesAction(orgId, formId).then(setResponses);
    }
  }, [tab, responses, orgId, formId]);

  const setField = (i: number, patch: Partial<FormFieldSchema>) =>
    setFields((arr) => arr.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, dir: -1 | 1) =>
    setFields((arr) => {
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      const copy = arr.slice();
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
      return copy;
    });

  async function save(nextPublished = published) {
    if (saving) return;
    setSaving(true);
    await updateFormAction(orgId, formId, {
      title,
      description,
      thankYou,
      fields,
      status: nextPublished ? "published" : "draft",
      target,
      targetListId: target === "list" ? targetListId || null : null,
    }).catch(() => {});
    setSaving(false);
    setPublished(nextPublished);
    onSaved?.();
  }

  async function remove() {
    await deleteFormAction(orgId, formId);
    onSaved?.();
    onClose();
  }

  function copyLink() {
    if (!loaded) return;
    navigator.clipboard?.writeText(`${window.location.origin}/form/${loaded.token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function exportCsv() {
    if (!responses || !responses.length) return;
    const header = ["Data", ...fields.map((f) => f.label)];
    const lines = responses.map((r) => [
      new Date(r.createdAt).toLocaleString("pt-BR"),
      ...fields.map((f) => r.answers[f.id] ?? ""),
    ]);
    const csv = [header, ...lines].map((row) => row.map((c) => csvEscape(String(c))).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.trim().toLowerCase().replace(/\s+/g, "-") || "formulario"}-respostas.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in flex-col bg-surface">
      <div role="dialog" aria-modal="true" className="flex h-full w-full flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Badge variant={published ? "success" : "neutral"} size="sm">
              {published ? "Publicado" : "Rascunho"}
            </Badge>
            <div className="flex rounded-md border border-border p-0.5">
              {(["build", "responses"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    "rounded px-2.5 h-7 text-dense font-medium transition-colors",
                    tab === t ? "bg-brand/10 text-brand" : "text-muted hover:text-foreground",
                  )}
                >
                  {t === "build" ? "Construir" : "Respostas"}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={copyLink}
            className="flex items-center gap-1.5 rounded-md border border-border bg-canvas px-2.5 h-8 text-dense font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground"
          >
            {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
            {copied ? "Copiado!" : "Copiar link"}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-8 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {!loaded ? (
          <p className="p-8 text-center text-dense text-subtle">Carregando…</p>
        ) : tab === "build" ? (
          <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 overflow-y-auto p-5">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título do formulário"
              className="text-ui font-semibold"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição (opcional) — aparece no topo do formulário"
              className="h-16 w-full resize-y rounded-md border border-border bg-canvas p-2.5 text-ui text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />

            {/* Campos */}
            <div className="space-y-3">
              {fields.map((fld, i) => (
                <div key={fld.id} className="rounded-lg border border-border bg-canvas p-3">
                  <div className="flex items-center gap-2">
                    <GripVertical className="size-4 shrink-0 text-subtle" />
                    <Input
                      value={fld.label}
                      onChange={(e) => setField(i, { label: e.target.value })}
                      placeholder="Pergunta"
                      className="flex-1"
                    />
                    <select
                      value={fld.type}
                      onChange={(e) => setField(i, { type: e.target.value as FormFieldSchema["type"] })}
                      className="h-9 shrink-0 rounded-md border border-border bg-surface px-2 text-dense text-foreground"
                    >
                      {TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {fld.type === "select" && (
                    <div className="mt-2 pl-6">
                      <Input
                        value={fld.options.join(", ")}
                        onChange={(e) =>
                          setField(i, {
                            options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                          })
                        }
                        placeholder="Opções separadas por vírgula (ex.: Sim, Não, Talvez)"
                        className="text-dense"
                      />
                    </div>
                  )}

                  <div className="mt-2 flex items-center gap-3 pl-6">
                    <label className="flex items-center gap-1.5 text-dense text-muted">
                      <input
                        type="checkbox"
                        checked={fld.required}
                        onChange={(e) => setField(i, { required: e.target.checked })}
                        className="size-3.5 accent-brand"
                      />
                      Obrigatório
                    </label>
                    <div className="ml-auto flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => move(i, -1)}
                        aria-label="Mover para cima"
                        className="flex size-7 items-center justify-center rounded text-subtle hover:bg-elevated hover:text-foreground"
                      >
                        <ChevronUp className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(i, 1)}
                        aria-label="Mover para baixo"
                        className="flex size-7 items-center justify-center rounded text-subtle hover:bg-elevated hover:text-foreground"
                      >
                        <ChevronDown className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFields((arr) => arr.filter((_, j) => j !== i))}
                        aria-label="Excluir campo"
                        className="flex size-7 items-center justify-center rounded text-subtle hover:text-danger"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setFields((arr) => [...arr, newField()])}
              className="flex items-center gap-1.5 text-dense font-medium text-brand hover:underline"
            >
              <Plus className="size-4" /> Adicionar campo
            </button>

            <label className="block pt-2">
              <span className="text-dense font-medium text-muted">Mensagem de agradecimento</span>
              <Input value={thankYou} onChange={(e) => setThankYou(e.target.value)} className="mt-1" />
            </label>

            <label className="block">
              <span className="text-dense font-medium text-muted">Destino de cada resposta</span>
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value as "list" | "funnel")}
                className="mt-1 h-9 w-full rounded-md border border-border bg-canvas px-2 text-ui text-foreground"
              >
                <option value="list">Board — criar tarefa numa lista</option>
                <option value="funnel">Funil comercial — criar lead (oportunidade)</option>
              </select>
            </label>

            {target === "list" ? (
              <label className="block">
                <span className="text-dense font-medium text-muted">Criar tarefa em</span>
                <select
                  value={targetListId}
                  onChange={(e) => setTargetListId(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-border bg-canvas px-2 text-ui text-foreground"
                >
                  <option value="">Não criar tarefa</option>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-[11px] text-subtle">
                  Cada envio vira um card na 1ª coluna da lista (título = 1º campo preenchido).
                </span>
              </label>
            ) : (
              <span className="block text-[11px] text-subtle">
                Cada envio cria uma oportunidade na etapa <strong>Lead</strong> do funil de vendas
                (Comercial → Funil), com as respostas nas notas internas.
              </span>
            )}

            {loaded && (
              <div className="rounded-lg border border-border bg-canvas p-3">
                <span className="text-dense font-medium text-muted">
                  Conectar landing page / sistema (API)
                </span>
                <p className="mt-0.5 text-[11px] text-subtle">
                  Publique o formulário e faça sua página enviar um POST para o endpoint abaixo.
                  Cada envio cria o lead no destino escolhido acima.
                </p>
                <input
                  readOnly
                  value={
                    typeof window !== "undefined"
                      ? `${window.location.origin}/api/forms/${loaded.token}`
                      : ""
                  }
                  onFocus={(e) => e.currentTarget.select()}
                  className="mt-2 h-9 w-full rounded-md border border-border bg-surface px-2 font-mono text-[11px] text-foreground"
                />
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] font-medium text-brand">
                    Ver exemplo de código
                  </summary>
                  <pre className="mt-1 overflow-x-auto rounded-md bg-surface p-2 text-[10px] leading-relaxed text-muted">
{`<!-- Form HTML nativo (redireciona após enviar) -->
<form method="POST" action="${typeof window !== "undefined" ? window.location.origin : ""}/api/forms/${loaded.token}">
  <input name="name" placeholder="Nome" required />
  <input name="email" type="email" placeholder="E-mail" />
  <input name="phone" placeholder="Telefone" />
  <textarea name="message" placeholder="Mensagem"></textarea>
  <input type="text" name="_hp" style="display:none" tabindex="-1" />
  <input type="hidden" name="_redirect" value="https://seusite.com/obrigado" />
  <button type="submit">Enviar</button>
</form>

// Ou via JavaScript (fetch)
fetch("${typeof window !== "undefined" ? window.location.origin : ""}/api/forms/${loaded.token}", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ name, email, phone, message }),
});`}
                  </pre>
                  <p className="mt-1 text-[10px] text-subtle">
                    Campo oculto <code>_hp</code> = anti-spam (honeypot). <code>_redirect</code> =
                    para onde o visitante vai após enviar (opcional).
                  </p>
                </details>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5">
            {responses === null ? (
              <p className="p-4 text-center text-dense text-subtle">Carregando…</p>
            ) : responses.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted">
                <Inbox className="size-8 text-subtle" />
                <p className="text-ui">Nenhuma resposta ainda.</p>
                <p className="text-dense text-subtle">Compartilhe o link para começar a receber.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-dense text-muted">
                    {responses.length} resposta{responses.length === 1 ? "" : "s"}
                  </span>
                  <Button variant="secondary" size="sm" onClick={exportCsv}>
                    <Download className="size-4" /> Exportar CSV
                  </Button>
                </div>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-dense">
                    <thead>
                      <tr className="border-b border-border bg-canvas text-left">
                        <th className="whitespace-nowrap px-3 py-2 font-semibold text-muted">Data</th>
                        {fields.map((f) => (
                          <th key={f.id} className="whitespace-nowrap px-3 py-2 font-semibold text-muted">
                            {f.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {responses.map((r) => (
                        <tr key={r.id} className="border-b border-border last:border-0">
                          <td className="whitespace-nowrap px-3 py-2 text-subtle">
                            {new Date(r.createdAt).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          {fields.map((f) => (
                            <td key={f.id} className="px-3 py-2 text-foreground">
                              {r.answers[f.id] || "—"}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        {loaded && tab === "build" && (
          <div className="flex items-center gap-2 border-t border-border px-5 py-3">
            <button
              type="button"
              onClick={remove}
              className="flex size-9 items-center justify-center rounded-md text-subtle hover:text-danger"
              aria-label="Excluir formulário"
            >
              <Trash2 className="size-4" />
            </button>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="secondary" onClick={() => save(false)} disabled={saving}>
                {saving ? "Salvando…" : "Salvar rascunho"}
              </Button>
              <Button onClick={() => save(true)} disabled={saving}>
                {published ? "Salvar e publicado" : "Publicar"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
