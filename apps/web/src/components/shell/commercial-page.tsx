"use client";

import * as React from "react";
import {
  Briefcase,
  ChevronRight,
  FileSignature,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  Package,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@wayline/ui";

interface Area {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  onOpen?: () => void;
  salesOnly?: boolean;
}

export function CommercialPage({
  salesEnabled,
  onOpenOverview,
  onOpenClients,
  onOpenProposals,
  onOpenServices,
  onOpenPortfolio,
  onOpenContracts,
}: {
  salesEnabled: boolean;
  onOpenOverview: () => void;
  onOpenClients: () => void;
  onOpenProposals: () => void;
  onOpenServices: () => void;
  onOpenPortfolio: () => void;
  onOpenContracts: () => void;
}) {
  const areas: Area[] = [
    {
      id: "overview",
      label: "Visão geral",
      description: "Funil de propostas, valores e conversão.",
      icon: LayoutDashboard,
      color: "#14B8A6",
      onOpen: onOpenOverview,
      salesOnly: true,
    },
    {
      id: "clients",
      label: "Clientes",
      description: "Cadastro e histórico dos seus clientes.",
      icon: Briefcase,
      color: "#3B82F6",
      onOpen: onOpenClients,
    },
    {
      id: "proposals",
      label: "Propostas",
      description: "Crie, envie e acompanhe propostas.",
      icon: FileText,
      color: "#6366F1",
      onOpen: onOpenProposals,
      salesOnly: true,
    },
    {
      id: "services",
      label: "Catálogo",
      description: "Serviços e preços que alimentam as propostas.",
      icon: Package,
      color: "#8B5CF6",
      onOpen: onOpenServices,
      salesOnly: true,
    },
    {
      id: "portfolio",
      label: "Portfólio",
      description: "Cases para impressionar no link público.",
      icon: ImageIcon,
      color: "#EC4899",
      onOpen: onOpenPortfolio,
      salesOnly: true,
    },
    {
      id: "contracts",
      label: "Contratos",
      description: "Gere e colete assinaturas de contratos.",
      icon: FileSignature,
      color: "#F59E0B",
      onOpen: onOpenContracts,
      salesOnly: true,
    },
  ];

  const visible = areas.filter((a) => !a.salesOnly || salesEnabled);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <Briefcase className="size-6" />
          </span>
          <div>
            <h1 className="font-display text-h2 font-bold">Comercial</h1>
            <p className="text-ui text-muted">
              Tudo da área comercial em um só lugar — clientes, propostas, catálogo e contratos.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {visible.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.id}
                type="button"
                onClick={a.onOpen}
                className={cn(
                  "group flex items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left transition-all hover:border-brand-40 hover:shadow-sm",
                )}
              >
                <span
                  className="flex size-11 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${a.color}1a`, color: a.color }}
                >
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-ui font-semibold text-foreground">{a.label}</p>
                  <p className="truncate text-dense text-muted">{a.description}</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
              </button>
            );
          })}
        </div>

        {!salesEnabled && (
          <p className="mt-4 rounded-lg border border-dashed border-border p-3 text-center text-dense text-subtle">
            Ative o módulo <strong>Vendas</strong> em /admin → Módulos para liberar propostas,
            catálogo, portfólio e contratos.
          </p>
        )}
      </div>
    </div>
  );
}
