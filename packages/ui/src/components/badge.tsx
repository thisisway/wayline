import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-pill font-sans font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "bg-elevated text-muted border border-border",
        brand: "bg-brand/15 text-brand",
        success: "bg-success/15 text-success",
        warning: "bg-warning/15 text-[#8A6400] dark:text-warning",
        danger: "bg-danger/15 text-danger",
      },
      size: {
        sm: "h-5 px-2 text-[11px] tracking-wide",
        md: "h-6 px-2.5 text-dense",
      },
    },
    defaultVariants: {
      variant: "neutral",
      size: "sm",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, size, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export { badgeVariants };
