"use client";

import { CalendarDays, CheckSquare, MessageSquare, Paperclip } from "lucide-react";
import { AvatarGroup, Card, cn } from "@wayline/ui";
import type { Priority, TaskCard as TaskCardType } from "@/mock/types";

const priorityMeta: Record<Priority, { label: string; color: string }> = {
  urgent: { label: "Urgente", color: "#FF3B30" },
  high: { label: "Alta", color: "#FFB800" },
  normal: { label: "Normal", color: "#1D66FF" },
  low: { label: "Baixa", color: "#94A3B8" },
};

export function TaskCard({ card }: { card: TaskCardType }) {
  const prio = priorityMeta[card.priority];

  return (
    <Card
      variant="elevated"
      interactive
      className="group flex flex-col gap-3 p-3 animate-fade-in"
    >
      {/* Cliente + prioridade */}
      <div className="flex items-center justify-between">
        {card.client ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted">
            <span className="size-2 rounded-full" style={{ backgroundColor: card.client.color }} />
            {card.client.name}
          </span>
        ) : (
          <span />
        )}
        <span
          className="inline-flex items-center gap-1 text-[11px] font-semibold"
          style={{ color: prio.color }}
          title={`Prioridade: ${prio.label}`}
        >
          <span className="size-1.5 rounded-full" style={{ backgroundColor: prio.color }} />
          {prio.label}
        </span>
      </div>

      {/* Título */}
      <p className="text-dense font-medium leading-snug text-foreground">{card.title}</p>

      {/* Tags */}
      {card.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.tags.map((tag) => (
            <span
              key={tag.label}
              className="inline-flex items-center rounded-pill px-2 h-5 text-[11px] font-semibold"
              style={{ backgroundColor: `${tag.color}22`, color: tag.color }}
            >
              {tag.label}
            </span>
          ))}
        </div>
      )}

      {/* Rodapé */}
      <div className="flex items-center justify-between pt-0.5">
        <div className="flex items-center gap-3 text-[11px] text-muted">
          {card.dueLabel && (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                card.overdue && "font-semibold text-danger",
              )}
            >
              <CalendarDays className="size-3.5" />
              {card.dueLabel}
            </span>
          )}
          {card.subtasks && (
            <span className="inline-flex items-center gap-1">
              <CheckSquare className="size-3.5" />
              {card.subtasks.done}/{card.subtasks.total}
            </span>
          )}
          {card.attachments > 0 && (
            <span className="inline-flex items-center gap-1">
              <Paperclip className="size-3.5" />
              {card.attachments}
            </span>
          )}
          {card.comments > 0 && (
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="size-3.5" />
              {card.comments}
            </span>
          )}
        </div>

        <AvatarGroup people={card.assignees} size="xs" max={3} />
      </div>
    </Card>
  );
}

export { priorityMeta };
