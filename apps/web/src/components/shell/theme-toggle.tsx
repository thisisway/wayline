"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { THEME_COOKIE } from "@/lib/constants";

export function ThemeToggle() {
  const [dark, setDark] = React.useState(true);

  React.useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    document.cookie = `${THEME_COOKIE}=${next ? "dark" : "light"}; path=/; max-age=${
      60 * 60 * 24 * 365
    }; samesite=lax`;
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Tema claro" : "Tema escuro"}
      title={dark ? "Tema claro" : "Tema escuro"}
      className="flex size-9 items-center justify-center rounded-md text-muted hover:bg-elevated hover:text-foreground"
    >
      {dark ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
    </button>
  );
}
