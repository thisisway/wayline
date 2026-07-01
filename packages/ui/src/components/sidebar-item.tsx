import * as React from "react";
import { cn } from "../lib/cn";
import { Badge } from "./badge";

export interface SidebarItemProps extends React.HTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
  count?: number;
  indent?: boolean;
  trailing?: React.ReactNode;
}

/**
 * Item de navegação do painel lateral (Home / Spaces).
 * Renderiza como <button> por padrão; troque via `asChild` no futuro se precisar de <a>.
 */
export const SidebarItem = React.forwardRef<HTMLButtonElement, SidebarItemProps>(
  ({ className, icon, label, active, count, indent, trailing, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex w-full items-center gap-2.5 rounded-md px-2.5 h-8 text-dense font-sans transition-colors",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        indent && "pl-8",
        active
          ? "bg-brand/15 text-brand font-semibold"
          : "text-muted hover:bg-elevated hover:text-foreground font-medium",
        className,
      )}
      {...props}
    >
      {icon && (
        <span className={cn(active ? "text-brand" : "text-subtle group-hover:text-foreground")}>
          {icon}
        </span>
      )}
      <span className="flex-1 truncate text-left">{label}</span>
      {typeof count === "number" && count > 0 && (
        <Badge variant={active ? "brand" : "neutral"} size="sm">
          {count}
        </Badge>
      )}
      {trailing}
    </button>
  ),
);
SidebarItem.displayName = "SidebarItem";
