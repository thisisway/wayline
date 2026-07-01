import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

const avatarVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-sans font-semibold uppercase text-white select-none ring-2 ring-canvas",
  {
    variants: {
      size: {
        xs: "size-5 text-[9px]",
        sm: "size-6 text-[10px]",
        md: "size-8 text-[11px]",
        lg: "size-10 text-dense",
        xl: "size-12 text-ui",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

// Paleta determinística para avatares sem imagem.
const PALETTE = ["#1D66FF", "#17C86A", "#FFB800", "#FF3B30", "#7C5CFF", "#0EA5E9"];

function colorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length] ?? PALETTE[0]!;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

export interface AvatarProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof avatarVariants> {
  name: string;
  src?: string;
}

export function Avatar({ className, size, name, src, style, ...props }: AvatarProps) {
  return (
    <span
      className={cn(avatarVariants({ size }), className)}
      style={{ backgroundColor: src ? undefined : colorFromName(name), ...style }}
      title={name}
      {...props}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  max?: number;
  size?: AvatarProps["size"];
  people: Array<{ name: string; src?: string }>;
}

export function AvatarGroup({ people, max = 4, size = "sm", className, ...props }: AvatarGroupProps) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className={cn("flex items-center -space-x-2", className)} {...props}>
      {shown.map((p, i) => (
        <Avatar key={`${p.name}-${i}`} name={p.name} src={p.src} size={size} />
      ))}
      {rest > 0 && (
        <span
          className={cn(
            avatarVariants({ size }),
            "bg-elevated text-muted ring-canvas",
          )}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}

export { avatarVariants };
