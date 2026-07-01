import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

const cardVariants = cva("rounded-lg border transition-colors", {
  variants: {
    variant: {
      light: "bg-surface border-border text-foreground shadow-xs",
      elevated: "bg-elevated border-border text-foreground shadow-sm",
      dark: "bg-dark border-white/10 text-white shadow-md",
      blue: "bg-brand border-brand-80 text-white shadow-xl",
    },
    interactive: {
      true: "cursor-pointer hover:shadow-md hover:border-brand-40",
      false: "",
    },
  },
  defaultVariants: {
    variant: "light",
    interactive: false,
  },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, interactive }), className)}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-4", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("font-display text-h3 tracking-tight", className)} {...props} />
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 pt-0", className)} {...props} />;
}

export { cardVariants };
