"use client";

import {
  AlertTriangle,
  Ban,
  CalendarDays,
  Check,
  CheckSquare,
  Clock,
  MessageSquare,
  Paperclip,
  Repeat,
} from "lucide-react";
import { AvatarGroup, Card, cn } from "@wayline/ui";
import type { Priority, TaskCard as TaskCardType } from "@/mock/types";
import { fmtDuration } from "./time-tracking-section";

function fmtFieldValue(type: string, value: string): string | null {
  if (type === "checkbox") return value === "1" ? "✓" : null;
  if (type === "date") {
    const d = new Date(value);
    return isNaN(d.getTime())
      ? value
      : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }
  return value;
}

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

      {/* Aprovação do cliente */}
      {card.approvalStatus === "approved" ? (
        <span className="inline-flex w-fit items-center gap-1 rounded-pill bg-success/10 px-2 h-5 text-[11px] font-semibold text-success">
          <Check className="size-3" /> Aprovado
        </span>
      ) : card.approvalStatus === "changes" ? (
        <span className="inline-flex w-fit items-center gap-1 rounded-pill bg-warning/10 px-2 h-5 text-[11px] font-semibold text-warning">
          <AlertTriangle className="size-3" /> Ajustes pedidos
        </span>
      ) : null}

      {/* Bloqueio */}
      {card.blocked && (
        <span
          className="inline-flex w-fit items-center gap-1 rounded-pill bg-danger/10 px-2 h-5 text-[11px] font-semibold text-danger"
          title="Bloqueada por outra tarefa não concluída"
        >
          <Ban className="size-3" />
          Bloqueada
        </span>
      )}

      {/* Título */}
      <p className="text-dense font-medium leading-snug text-foreground">{card.title}</p>

      {/* Campos customizados preenchidos */}
      {card.customFields && card.customFields.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.customFields.map((f) => {
            const val = fmtFieldValue(f.type, f.value);
            if (val === null) return null;
            return (
              <span
                key={f.name}
                className="inline-flex items-center gap-1 rounded-md bg-elevated px-1.5 h-5 text-[11px] text-muted"
                title={f.name}
              >
                <span className="text-subtle">{f.name}:</span>
                <span className="font-medium text-foreground">{val}</span>
              </span>
            );
          })}
        </div>
      )}

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
          {card.recurrence && (
            <span className="inline-flex items-center" title="Tarefa recorrente">
              <Repeat className="size-3.5" />
            </span>
          )}
          {(() => {
            const tracked = card.trackedSeconds ?? 0;
            const est = card.estimateMinutes ?? 0;
            if (est <= 0 && tracked < 60) return null;
            const over = est > 0 && tracked > est * 60;
            return (
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  over && "font-semibold text-danger",
                )}
                title="Tempo rastreado / estimativa"
              >
                <Clock className="size-3.5" />
                {tracked >= 60 ? fmtDuration(tracked) : "0m"}
                {est > 0 && ` / ${fmtDuration(est * 60)}`}
              </span>
            );
          })()}
        </div>

        <AvatarGroup people={card.assignees} size="xs" max={3} />
      </div>
    </Card>
  );
}

export { priorityMeta };
