"use client";

import * as React from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";

const KEY = "wl_cookie_consent";

/** Aviso de cookies essenciais (LGPD). Aparece uma vez; guarda no localStorage. */
export function CookieConsent() {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* ambientes sem storage: não mostra */
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignora */
    }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-xl sm:flex-row sm:items-center">
        <Cookie className="size-5 shrink-0 text-brand" />
        <p className="flex-1 text-dense text-muted">
          Usamos apenas cookies essenciais (login e preferências) para o funcionamento do sistema.
          Saiba mais na{" "}
          <Link href="/privacidade" className="text-brand hover:underline">
            Política de Privacidade
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={accept}
          className="shrink-0 rounded-md bg-brand px-4 h-9 text-ui font-medium text-white transition-colors hover:bg-brand-80"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
