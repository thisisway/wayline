"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button, Input } from "@wayline/ui";
import { registerAction } from "@/actions/auth";
import { safeNext } from "@/components/auth/login-form";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await registerAction(name, email, password);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Cria conta ok → autentica e entra.
      const login = await signIn("credentials", { email, password, redirect: false });
      if (login?.error) {
        setError("Conta criada, mas falhou o login. Tente entrar.");
      } else {
        router.push(safeNext());
        router.refresh();
      }
    } catch {
      setError("Não foi possível criar a conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-brand font-display text-h2 font-extrabold text-white shadow-xl">
            W
          </div>
          <div>
            <h1 className="font-display text-h2 font-bold">Criar conta no Wayline</h1>
            <p className="mt-1 text-ui text-muted">Seu work OS de agência</p>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
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
            {loading ? "Criando…" : "Criar conta"}
          </Button>

          <p className="text-center text-dense text-muted">
            Já tem conta?{" "}
            <Link href="/login" className="font-semibold text-brand hover:underline">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
