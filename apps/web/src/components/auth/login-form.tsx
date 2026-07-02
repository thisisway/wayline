"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button, Input } from "@wayline/ui";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        setError("Email ou senha inválidos.");
      } else {
        router.push("/app");
        router.refresh();
      }
    } catch {
      setError("Não foi possível entrar. Tente novamente.");
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
            <h1 className="font-display text-h2 font-bold">Entrar no Wayline</h1>
            <p className="mt-1 text-ui text-muted">Seu work OS de agência</p>
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-sm"
        >
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="rounded-md bg-danger/10 px-3 py-2 text-dense font-medium text-danger">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
