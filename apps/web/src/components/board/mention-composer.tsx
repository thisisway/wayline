"use client";

import * as React from "react";
import { Send } from "lucide-react";
import type { BoardMemberDTO } from "@wayline/db";
import { Avatar, Button, Input, cn } from "@wayline/ui";

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

/** IDs dos membros cujo @primeiroNome aparece no texto. */
export function resolveMentions(body: string, members: BoardMemberDTO[]): string[] {
  const lower = body.toLowerCase();
  return members
    .filter((m) => new RegExp(`@${firstName(m.name)}\\b`, "i").test(lower))
    .map((m) => m.id);
}

/** Renderiza o corpo destacando os tokens @nome que batem com membros. */
export function renderWithMentions(body: string, members: BoardMemberDTO[]): React.ReactNode {
  const names = new Set(members.map((m) => firstName(m.name).toLowerCase()));
  const parts = body.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@") && names.has(part.slice(1).toLowerCase())) {
      return (
        <span key={i} className="rounded bg-brand/10 px-0.5 font-semibold text-brand">
          {part}
        </span>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

/**
 * Campo de comentário com autocomplete de @menções.
 * Chama `onPost(texto, idsMencionados)`.
 */
export function MentionComposer({
  members,
  onPost,
  placeholder,
  disabled,
  autoFocus,
  small,
}: {
  members: BoardMemberDTO[];
  onPost: (body: string, mentionIds: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  small?: boolean;
}) {
  const [text, setText] = React.useState("");
  const [query, setQuery] = React.useState<string | null>(null); // trecho após o @ ativo
  const [highlight, setHighlight] = React.useState(0);
  const ref = React.useRef<HTMLInputElement>(null);

  const matches = React.useMemo(() => {
    if (query === null) return [];
    const q = query.toLowerCase();
    return members.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 6);
  }, [query, members]);

  function syncQuery(value: string, caret: number) {
    const upto = value.slice(0, caret);
    const at = upto.lastIndexOf("@");
    if (at === -1) return setQuery(null);
    const between = upto.slice(at + 1);
    // token de menção válido: sem espaços e colado no @
    if (/\s/.test(between) || (at > 0 && !/\s/.test(value[at - 1] ?? " "))) {
      return setQuery(null);
    }
    setQuery(between);
    setHighlight(0);
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setText(value);
    syncQuery(value, e.target.selectionStart ?? value.length);
  }

  function pick(member: BoardMemberDTO) {
    const el = ref.current;
    const caret = el?.selectionStart ?? text.length;
    const upto = text.slice(0, caret);
    const at = upto.lastIndexOf("@");
    if (at === -1) return;
    const insert = `@${firstName(member.name)} `;
    const next = text.slice(0, at) + insert + text.slice(caret);
    setText(next);
    setQuery(null);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = at + insert.length;
      el?.setSelectionRange(pos, pos);
    });
  }

  function post() {
    const body = text.trim();
    if (!body || disabled) return;
    onPost(body, resolveMentions(body, members));
    setText("");
    setQuery(null);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (query !== null && matches.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        return setHighlight((h) => (h + 1) % matches.length);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        return setHighlight((h) => (h - 1 + matches.length) % matches.length);
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        return pick(matches[highlight]!);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        return setQuery(null);
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      post();
    }
  }

  return (
    <div className="relative flex items-center gap-2">
      <div className="relative flex-1">
        <Input
          ref={ref}
          value={text}
          autoFocus={autoFocus}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onKeyUp={(e) =>
            syncQuery(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)
          }
          onClick={(e) =>
            syncQuery(e.currentTarget.value, e.currentTarget.selectionStart ?? 0)
          }
          placeholder={placeholder}
          disabled={disabled}
          className={cn(small && "h-8 text-dense")}
        />
        {query !== null && matches.length > 0 && (
          <div className="absolute bottom-full left-0 z-20 mb-1 w-56 overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-lg">
            {matches.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(m);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 h-8 text-dense",
                  i === highlight ? "bg-brand/15 text-brand" : "text-foreground hover:bg-elevated",
                )}
              >
                <Avatar name={m.name} src={m.avatarUrl ?? undefined} size="xs" />
                <span className="truncate">{m.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <Button
        type="button"
        size="icon"
        onClick={post}
        disabled={disabled || text.trim().length === 0}
        aria-label="Enviar"
      >
        <Send />
      </Button>
    </div>
  );
}
