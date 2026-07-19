"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  LayoutDashboard,
  Palette,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@wayline/ui";
import { BrandLogo, hasBrandLogo } from "@/components/shell/brand-logo";

const NAV = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard, exact: true },
  { href: "/admin/receita", label: "Receita", icon: TrendingUp },
  { href: "/admin/workspaces", label: "Workspaces", icon: Building2 },
  { href: "/admin/usuarios", label: "Usuários", icon: Users },
  { href: "/admin/marca", label: "Marca", icon: Palette },
  { href: "/admin/config", label: "Configurações", icon: Settings },
];

export function AdminShell({
  adminEmail,
  logoLight,
  logoDark,
  children,
}: {
  adminEmail: string;
  logoLight?: string | null;
  logoDark?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-foreground">
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-surface px-6">
        {hasBrandLogo(logoLight, logoDark) ? (
          <span className="flex h-8 items-center justify-center overflow-hidden">
            <BrandLogo light={logoLight} dark={logoDark} className="h-8 w-auto max-w-[150px]" />
          </span>
        ) : (
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand font-display text-h3 font-extrabold text-white">
            W
          </span>
        )}
        <div className="flex-1">
          <h1 className="font-display text-ui font-bold leading-none">Admin da Plataforma</h1>
          <p className="text-[11px] text-subtle">{adminEmail}</p>
        </div>
        <Link
          href="/app"
          className="flex items-center gap-1.5 rounded-md border border-border px-3 h-9 text-dense font-medium text-muted transition-colors hover:bg-elevated hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Voltar ao app
        </Link>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav className="w-56 shrink-0 border-r border-border bg-surface p-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 h-9 text-ui font-medium transition-colors",
                  active
                    ? "bg-brand/10 text-brand"
                    : "text-muted hover:bg-elevated hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
