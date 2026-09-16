"use client";

import * as React from "react";
import { Button, Input } from "@wayline/ui";
import { requestPasswordResetAction, resetPasswordAction } from "@/actions/auth";

/** Fluxo de recuperação de senha (código por email → nova senha). */
export function ForgotPasswordForm({
  initialEmail = "",
  onBack,
}: {
  initialEmail?: string;
  onBack: () => void;
}) {
  const [step, setStep] = React.useState<"email" | "code" | "done">("email");
  const [email, setEmail] = React.useState(initialEmail);
  const [code, setCode] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function request(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await requestPasswordResetAction(email);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setInfo("Se houver uma conta com esse email, enviamos um código de 6 dígitos.");
      setStep("code");
    } finally {
      setLoading(false);
    }
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await resetPasswordAction(email, code, password);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setStep("done");
    } finally {
      setLoading(false);
    }
  }

  if (step === "done") {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-sm text-center">
        <p className="text-ui font-semibold text-foreground">Senha redefinida ✅</p>
        <p className="text-dense text-muted">Agora você já pode entrar com a nova senha.</p>
        <Button size="lg" className="w-full" onClick={onBack}>
          Voltar ao login
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={step === "email" ? request : reset}
      className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-sm"
    >
      <div>
        <h2 className="text-ui font-semibold text-foreground">Recuperar senha</h2>
        <p className="mt-0.5 text-dense text-muted">
          {step === "email"
            ? "Informe seu email e enviaremos um código para redefinir a senha."
            : "Digite o código que enviamos e escolha uma nova senha."}
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-label uppercase text-subtle" htmlFor="fp-email">
          Email
        </label>
        <Input
          id="fp-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@agencia.com"
          disabled={step === "code"}
          required
        />
      </div>

      {step === "code" && (
        <>
          <div className="space-y-1.5">
            <label className="text-label uppercase text-subtle" htmlFor="fp-code">
              Código
            </label>
            <Input
              id="fp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-label uppercase text-subtle" htmlFor="fp-pass">
              Nova senha
            </label>
            <Input
              id="fp-pass"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>
        </>
      )}

      {info && (
        <p className="rounded-md bg-brand/10 px-3 py-2 text-dense font-medium text-brand">{info}</p>
      )}
      {error && (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-dense font-medium text-danger">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading
          ? "Aguarde…"
          : step === "email"
            ? "Enviar código"
            : "Redefinir senha"}
      </Button>

      <button
        type="button"
        onClick={onBack}
        className="block w-full text-center text-dense text-muted hover:text-foreground"
      >
        Voltar ao login
      </button>
    </form>
  );
}
