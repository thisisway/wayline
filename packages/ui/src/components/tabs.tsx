"use client";

import * as React from "react";
import { cn } from "../lib/cn";

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
  idBase: string;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabs(): TabsContextValue {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("Tabs.* precisa estar dentro de <Tabs>");
  return ctx;
}

export interface TabsProps {
  value?: string;
  defaultValue: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

export function Tabs({ value, defaultValue, onValueChange, className, children }: TabsProps) {
  const [internal, setInternal] = React.useState(defaultValue);
  const idBase = React.useId();
  const current = value ?? internal;

  const setValue = React.useCallback(
    (next: string) => {
      if (value === undefined) setInternal(next);
      onValueChange?.(next);
    },
    [value, onValueChange],
  );

  return (
    <TabsContext.Provider value={{ value: current, setValue, idBase }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div role="tablist" className={cn("inline-flex items-center gap-1", className)}>
      {children}
    </div>
  );
}

export interface TabsTriggerProps {
  value: string;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function TabsTrigger({ value, icon, className, children }: TabsTriggerProps) {
  const { value: current, setValue, idBase } = useTabs();
  const active = current === value;
  return (
    <button
      type="button"
      role="tab"
      id={`${idBase}-tab-${value}`}
      aria-selected={active}
      aria-controls={`${idBase}-panel-${value}`}
      tabIndex={active ? 0 : -1}
      onClick={() => setValue(value)}
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-3 h-8 text-dense font-sans font-medium transition-colors",
        "[&_svg]:size-4",
        active
          ? "bg-brand/15 text-brand"
          : "text-muted hover:text-foreground hover:bg-elevated",
        className,
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { value: current, idBase } = useTabs();
  if (current !== value) return null;
  return (
    <div
      role="tabpanel"
      id={`${idBase}-panel-${value}`}
      aria-labelledby={`${idBase}-tab-${value}`}
      className={cn("animate-fade-in", className)}
    >
      {children}
    </div>
  );
}
