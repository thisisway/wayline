"use client";

import * as React from "react";
import { Keyboard, LogOut, Moon, Sun, X } from "lucide-react";
import { signOut } from "next-auth/react";
import { Avatar, cn } from "@wayline/ui";
import { THEME_COOKIE } from "@/lib/constants";

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-ui font-medium text-foreground">{label}</p>
        {hint && <p className="text-dense text-subtle">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export function SettingsModal({
  userName,
  orgName,
  onOpenShortcuts,
  onClose,
}: {
  userName: string;
  orgName: string;
  onOpenShortcuts: () => void;
  onClose: () => void;
}) {
  const [dark, setDark] = React.useState(true);

  React.useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function setTheme(next: boolean) {
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    document.cookie = `${THEME_COOKIE}=${next ? "dark" : "light"}; path=/; max-age=${
      60 * 60 * 24 * 365
    }; samesite=lax`;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/60 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="font-display text-h3 font-bold">Configurações</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-7 items-center justify-center rounded-md text-subtle hover:bg-elevated hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-5 py-2">
          {/* Conta */}
          <div className="flex items-center gap-3 py-3">
            <Avatar name={userName} size="md" />
            <div className="min-w-0">
              <p className="truncate text-ui font-semibold text-foreground">{userName}</p>
              <p className="truncate text-dense text-subtle">{orgName}</p>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Aparência */}
          <Row label="Aparência" hint="Tema claro ou escuro">
            <div className="flex rounded-lg border border-border bg-canvas p-0.5">
              <button
                type="button"
                onClick={() => setTheme(false)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 h-8 text-dense font-medium transition-colors",
                  !dark ? "bg-brand text-white" : "text-muted hover:text-foreground",
                )}
              >
                <Sun className="size-4" /> Claro
              </button>
              <button
                type="button"
                onClick={() => setTheme(true)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 h-8 text-dense font-medium transition-colors",
                  dark ? "bg-brand text-white" : "text-muted hover:text-foreground",
                )}
              >
                <Moon className="size-4" /> Escuro
              </button>
            </div>
          </Row>

          <div className="h-px bg-border" />

          {/* Atalhos */}
          <Row label="Atalhos de teclado" hint="Ver a lista completa">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenShortcuts();
              }}
              className="flex items-center gap-1.5 rounded-md border border-border bg-canvas px-3 h-8 text-dense font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground"
            >
              <Keyboard className="size-4" /> Abrir
            </button>
          </Row>
        </div>

        <div className="border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={() => signOut({ redirectTo: "/login" })}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-border px-3 h-9 text-ui font-medium text-danger transition-colors hover:bg-danger/10"
          >
            <LogOut className="size-4" /> Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
}
