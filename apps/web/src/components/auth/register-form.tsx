"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button, Input } from "@wayline/ui";
import {
  resendCodeAction,
  startRegistrationAction,
  verifyRegistrationAction,
} from "@/actions/auth";
import { safeNext } from "@/components/auth/login-form";

export function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = React.useState<"form" | "code">("form");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function authenticate() {
    const login = await signIn("credentials", { email, password, redirect: false });
    if (login?.error) {
      setError("Conta criada, mas falhou o login. Tente entrar.");
      return;
    }
    router.push(safeNext());
    router.refresh();
  }

  async function onStart(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await startRegistrationAction(name, email, password);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.verified) {
        await authenticate();
      } else {
        setStep("code");
        setInfo(`Enviamos um código de 6 dígitos para ${email}.`);
      }
    } catch {
      setError("Não foi possível continuar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await verifyRegistrationAction(email, code);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      await authenticate();
    } catch {
      setError("Não foi possível confirmar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setError(null);
    setInfo(null);
    const res = await resendCodeAction(email);
    setInfo(res.ok ? "Enviamos um novo código." : null);
    if (!res.ok) setError(res.error);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-brand font-display text-h2 font-extrabold text-white shadow-xl">
            W
          </div>
          <div>
            <h1 className="font-display text-h2 font-bold">
              {step === "form" ? "Criar conta no Wayline" : "Confirme seu email"}
            </h1>
            <p className="mt-1 text-ui text-muted">Seu work OS de agência</p>
          </div>
        </div>

        {step === "form" ? (
          <form
            onSubmit={onStart}
            className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-sm"
          >
            <div className="space-y-1.5">
              <label className="text-label uppercase text-subtle" htmlFor="name">
                Nome
              </label>
              <Input
                id="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-label uppercase text-subtle" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@agencia.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-label uppercase text-subtle" htmlFor="password">
                Senha
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>

            {error && (
              <p className="rounded-md bg-danger/10 px-3 py-2 text-dense font-medium text-danger">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Enviando…" : "Continuar"}
            </Button>

            <p className="text-center text-dense text-muted">
              Já tem conta?{" "}
              <Link href="/login" className="font-semibold text-brand hover:underline">
                Entrar
              </Link>
            </p>
          </form>
        ) : (
          <form
            onSubmit={onVerify}
            className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-sm"
          >
            {info && <p className="text-dense text-muted">{info}</p>}

            <div className="space-y-1.5">
              <label className="text-label uppercase text-subtle" htmlFor="code">
                Código de confirmação
              </label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="text-center text-h3 tracking-[0.5em]"
                required
              />
            </div>

            {error && (
              <p className="rounded-md bg-danger/10 px-3 py-2 text-dense font-medium text-danger">
                {error}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loading || code.length !== 6}
            >
              {loading ? "Confirmando…" : "Confirmar e entrar"}
            </Button>

            <div className="flex items-center justify-between text-dense">
              <button
                type="button"
                onClick={() => {
                  setStep("form");
                  setError(null);
                  setInfo(null);
                  setCode("");
                }}
                className="text-muted hover:text-foreground"
              >
                ← Voltar
              </button>
              <button
                type="button"
                onClick={resend}
                className="font-medium text-brand hover:underline"
              >
                Reenviar código
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
