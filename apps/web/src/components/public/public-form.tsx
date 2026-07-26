"use client";

import * as React from "react";
import { CheckCircle2, Lock } from "lucide-react";
import type { PublicForm } from "@wayline/db";
import { Button, Input } from "@wayline/ui";
import { submitFormResponseAction } from "@/actions/public-form";

export function PublicFormView({
  form,
  token,
  brandName,
}: {
  form: PublicForm;
  token: string;
  brandName: string;
  logoLight?: string | null;
  logoDark?: string | null;
}) {
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [sending, setSending] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const set = (id: string, v: string) => setValues((s) => ({ ...s, [id]: v }));

  async function submit() {
    setError(null);
    const missing = form.fields.find((f) => f.required && !(values[f.id] ?? "").trim());
    if (missing) {
      setError(`Preencha: ${missing.label}`);
      return;
    }
    setSending(true);
    const ok = await submitFormResponseAction(token, values).catch(() => false);
    setSending(false);
    if (ok) setDone(true);
    else setError("Não foi possível enviar. Tente novamente.");
  }

  return (
    <div className="min-h-dvh bg-canvas px-4 py-10 text-foreground">
      <div className="mx-auto w-full max-w-xl">
        <p className="mb-4 text-center text-dense font-semibold uppercase tracking-wide text-subtle">
          {brandName}
        </p>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="h-2 bg-brand" />

          {done ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <CheckCircle2 className="size-12 text-success" />
              <h1 className="font-display text-h2 font-bold">{form.thankYou}</h1>
            </div>
          ) : form.closed ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <Lock className="size-10 text-subtle" />
              <h1 className="font-display text-h3 font-bold">Formulário indisponível</h1>
              <p className="text-ui text-muted">Este formulário não está aceitando respostas no momento.</p>
            </div>
          ) : (
            <div className="p-6 sm:p-8">
              <h1 className="font-display text-h2 font-bold">{form.title}</h1>
              {form.description && (
                <p className="mt-1.5 whitespace-pre-wrap text-ui text-muted">{form.description}</p>
              )}

              <div className="mt-6 space-y-4">
                {form.fields.map((f) => (
                  <label key={f.id} className="block">
                    <span className="text-dense font-medium text-foreground">
                      {f.label}
                      {f.required && <span className="text-danger"> *</span>}
                    </span>
                    <div className="mt-1">
                      {f.type === "textarea" ? (
                        <textarea
                          value={values[f.id] ?? ""}
                          onChange={(e) => set(f.id, e.target.value)}
                          placeholder={f.placeholder}
                          className="h-28 w-full resize-y rounded-md border border-border bg-canvas p-2.5 text-ui text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                      ) : f.type === "select" ? (
                        <select
                          value={values[f.id] ?? ""}
                          onChange={(e) => set(f.id, e.target.value)}
                          className="h-10 w-full rounded-md border border-border bg-canvas px-2.5 text-ui text-foreground"
                        >
                          <option value="">Selecione…</option>
                          {f.options.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          type={f.type === "email" ? "email" : f.type === "number" ? "number" : f.type === "phone" ? "tel" : "text"}
                          value={values[f.id] ?? ""}
                          onChange={(e) => set(f.id, e.target.value)}
                          placeholder={f.placeholder}
                        />
                      )}
                    </div>
                  </label>
                ))}
              </div>

              {error && <p className="mt-3 text-dense font-medium text-danger">{error}</p>}

              <Button onClick={submit} disabled={sending} className="mt-6 w-full">
                {sending ? "Enviando…" : "Enviar"}
              </Button>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-[11px] text-subtle">Feito com {brandName}</p>
      </div>
    </div>
  );
}
