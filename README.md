# Wayline

Sistema operacional de trabalho **nativo para agências** de marketing digital.
Opinativo (Clientes, portal, proofing, retainers, IA embutida), não um clone genérico
de ClickUp/Trello/Notion.

> Esta é a **Fase 0** — fundação técnica e visual. Ver [`wayline-blueprint.md`](./wayline-blueprint.md)
> para produto, arquitetura, roadmap e modelo de dados completos.

## Monorepo

```
apps/
  web/            # Next.js 15 + React 19 — shell + tela de referência (/app)
packages/
  ui/             # Way Cloud Design System (Button, Input, Badge, Card, Avatar, Tabs, SidebarItem)
  db/             # Schema Drizzle (org_id-ready) — sem conexão Postgres nesta fase
  config/         # tsconfig base, preset Tailwind (tokens Way Cloud), ESLint
```

`pnpm workspaces` + `Turborepo`.

## Requisitos

- Node ≥ 20 (testado com 24)
- pnpm ≥ 11

## Comandos

```bash
pnpm install       # instala o workspace
pnpm dev           # sobe apps/web em http://localhost:3000  (→ redireciona para /app)
pnpm build         # build de produção
pnpm typecheck     # checagem de tipos em todos os pacotes
pnpm lint          # ESLint
```

## Design System — Way Cloud

- Azul primário `#1D66FF` · Dark `#0B1023` · Success `#17C86A` · Warning `#FFB800` · Error `#FF3B30`
- Fontes: **Plus Jakarta Sans** (títulos/marca/KPIs) + **Inter** (corpo/UI densa). Nenhuma outra.
- Radius `6/8/12/16/pill` · espaçamento em escala 8pt · dark mode por classe (app é dark-first).
- Tokens no preset `@wayline/config/tailwind/preset` + CSS vars em `@wayline/ui/styles.css`.

## O que está mockado nesta fase

- Dados do board, membros e clientes (`apps/web/src/mock`).
- Presença ao vivo (cursores estáticos), Doc Brief Agent e Executive Summary (conteúdo fixo).
- Sem auth, sem Postgres, sem realtime, sem backend — todos previstos nas próximas fases.

## Tela de referência (`/app`)

Icon rail escuro · painel Home (Inbox, Replies, Assigned Comments, My Tasks, More) ·
Spaces (Marketing, Product, Quality Engineering) · topbar (workspace, busca global, ações) ·
abas de view (Chat, Board, List, Gantt, Calendar) · board Kanban (Open / In Progress / In Review) ·
painéis flutuantes (Marketing Launch Brief + Executive Summary) e presença ao vivo simulada.
