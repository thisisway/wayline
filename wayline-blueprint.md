# Wayline — Blueprint de Arquitetura & Master Prompt

**Versão:** 1.0 · **Base de design:** Way Cloud Design System v1.0 · **Fontes:** Plus Jakarta Sans + Inter
**Referências:** funcionalidades do ClickUp, tela-modelo anexada, nichos de agências de marketing digital.

> Este documento é o "mapa" para construir o Wayline. Serve para (a) alinhar decisões de produto/arquitetura, e (b) ser entregue a um builder de IA (Claude Code, v0, Lovable, Cursor) ou a um time de dev. A última seção é o **Master Prompt** — o texto pronto para orientar a construção.

---

## 1. Visão e posicionamento

**Wayline** é um **sistema operacional de trabalho nativo para agências** de marketing digital (e nichos correlatos: estúdios de design, produtoras, assessorias, consultorias). O objetivo não é ter *mais* recursos que ClickUp, Trello e Notion — é ser **mais opinativo e mais rápido de gerar valor** para o fluxo específico de uma agência.

### O problema com os concorrentes
- **Notion / ClickUp** são horizontais e infinitamente configuráveis → "paralisia da tela em branco": a agência gasta semanas configurando antes de produzir.
- **Trello** é simples, mas raso: não escala para operação de agência (clientes, retainers, aprovações, faturamento).
- Todos tratam "cliente" como improviso (uma tag, uma pasta), não como entidade central.

### A aposta do Wayline (o *wedge*)
Mesma flexibilidade por baixo (campos custom, múltiplas views), mas **primitivos de agência prontos de fábrica**:
- **Clientes, Contratos/Retainers e Rentabilidade** como entidades de primeira classe.
- **Portal do cliente** (acompanhar e aprovar sem virar usuário pago).
- **Proofing / revisão de criativos** (anotar sobre imagem, vídeo, PDF).
- **Calendário de conteúdo** com aprovação embutida.
- **Time tracking → billing** ligado a horas de retainer, com margem por cliente.
- **Wayline Brain** (IA): redige briefings, gera *executive summaries*, monta relatórios de cliente e atua como agente atribuível.

**Métrica-norte:** *time-to-value* — do cadastro ao primeiro entregável aprovado pelo cliente.

---

## 2. Personas e Jobs-to-be-Done

| Persona | Job principal | Recursos-chave |
|---|---|---|
| **Dono / Head de agência** | Ver saúde da operação e rentabilidade por cliente | Dashboards, rentabilidade de retainer, portfólio |
| **Gerente de projetos / Tráfego** | Planejar campanhas e distribuir carga | Views (Board/Gantt/Workload), automações, metas |
| **Criativo / Redator / Designer** | Executar tarefas e receber feedback claro | Board pessoal, proofing, docs, briefings de IA |
| **Social / Conteúdo** | Planejar e aprovar publicações | Calendário de conteúdo, aprovações, biblioteca de assets |
| **Cliente (convidado)** | Acompanhar e aprovar sem fricção | Portal do cliente, aprovações, relatórios |
| **Financeiro** | Faturar horas e acompanhar margem | Timesheets, billing, relatórios |

---

## 3. Princípios de produto

1. **Opinativo, não genérico.** Vem configurado para agência; personalização é opcional, não obrigatória.
2. **Cliente é cidadão de primeira classe.** Toda tarefa/projeto pode se ligar a um Cliente; o portal é nativo.
3. **Uma base, muitas views.** A engine de query é única; Board/Lista/Gantt/Calendário/Tabela/Workload são renderizadores.
4. **IA embutida no trabalho**, com contexto real (RAG sobre o workspace), não um chatbot lateral.
5. **Colaboração ao vivo** por padrão (presença, cursores, comentários em tempo real).
6. **Dark mode e acessibilidade** desde o dia 1.
7. **LGPD-first** (dados no Brasil, auditoria, exportação/exclusão).

---

## 4. Escopo por fases (roadmap)

### Fase 0 — Fundação
Design tokens → biblioteca de componentes · Auth + Organizações (multi-tenant) · RLS no Postgres · Modelo de dados base · Shell da aplicação (sidebar + topbar + troca de workspace, conforme a tela-modelo).

### Fase 1 — PM core (MVP usável)
Hierarquia (Espaços/Pastas/Listas/Tarefas/Subtarefas) · Status custom por lista/espaço · Campos custom · Views **Board** e **Lista** · Comentários (threaded, atribuíveis) · Responsáveis múltiplos · Prioridades · Datas (início/prazo) · Anexos · Tags · Checklists · Dependências básicas · **Updates em tempo real** · Inbox/notificações.

### Fase 2 — Camada de agência (diferencial)
**Clientes** · **Portal do cliente** (convidados com escopo) · **Proofing/Aprovações** (anotação em imagem/vídeo/PDF) · **Calendário de conteúdo** com fluxo de aprovação · **Time tracking** + estimativas · **Billing/Retainers** + rentabilidade · **Docs/Wikis** (blocos, colaborativos) · **Formulários** de intake que geram tarefas.

### Fase 3 — Poder
Views **Gantt/Timeline**, **Calendário**, **Tabela**, **Workload** · **Dashboards** + widgets · **Metas/Marcos** · **Automações** no-code (gatilho → condição → ação) · Templates.

### Fase 4 — Wayline Brain (IA)
Busca semântica (RAG) · Resumos e *executive summaries* automáticos · Agentes atribuíveis (Briefing, Relatório, Conteúdo, Triagem) · Comandos em linguagem natural · Geração de tarefas/docs.

### Fase 5 — Escala e enterprise
API pública (REST + OpenAPI) · Webhooks · OAuth apps · **Servidor MCP** (operar o Wayline via IA) · Integrações nativas (Slack, Google/Microsoft, **Meta Ads / Google Ads**, Figma) · SSO/SAML + SCIM · Papéis e permissões avançados · Mobile nativo · Multi-idioma.

---

## 5. Arquitetura técnica

### 5.1 Modelo de tenancy
- **Multi-tenant compartilhado** com **Row-Level Security (RLS)** do PostgreSQL: `org_id` em toda linha; políticas RLS garantem isolamento no banco (defesa em profundidade, não só na aplicação).
- **Convidados/clientes** são um tipo de acesso com escopo restrito (só veem itens compartilhados no portal).
- Caminho de evolução: tenants enterprise grandes podem ser isolados (schema/DB dedicado ou shard) sem reescrever o app.

### 5.2 Stack recomendada (TypeScript ponta a ponta)

**Frontend**
- **Next.js 15 (App Router) + React 19 + TypeScript** — site institucional/auth com SSR + app altamente interativo.
- **Tailwind CSS** com tokens Way Cloud (ver §6) · **Radix UI** (primitivos acessíveis) no padrão shadcn/ui, tematizado.
- **dnd-kit** (drag & drop de cards/listas) · **TipTap (ProseMirror) + Yjs** (docs colaborativos por CRDT).
- **TanStack Query** (cache de servidor) + **Zustand/Jotai** (estado de UI) · **TanStack Virtual** (listas/tabelas grandes).
- **Recharts / visx** (dashboards) · **FullCalendar** ou custom (calendário) · Gantt/Timeline virtualizado (custom).

**Backend**
- **Node (NestJS ou Fastify) + TypeScript**.
- **tRPC** para o app interno (tipos ponta a ponta) + **REST público versionado (OpenAPI)** para API/integrações/webhooks.
- **Inngest** ou **Temporal** para automações e workflows duráveis (retries, agendamento).

**Dados**
- **PostgreSQL** — RLS (tenancy) + **JSONB** (campos custom, com índices GIN) + **pgvector** (embeddings de IA).
- **Drizzle ORM** (SQL-first, leve, ótimo TS).
- **Redis** — cache, sessões, rate limit, pub/sub para fan-out do realtime, filas (BullMQ).
- **Meilisearch** (ou Typesense) — busca full-text e "enterprise search" sobre tarefas/docs/comentários.
- **Cloudflare R2** (ou S3) — anexos e assets, com CDN; processamento de imagem/thumbnails (imgproxy) para o proofing.

**Realtime & colaboração**
- **WebSocket** (Socket.IO/ws) para presença, cursores e updates ao vivo de tarefas/board; **SSE** como fallback.
- **CRDT (Yjs)** com servidor **Hocuspocus** para edição colaborativa de docs/whiteboards.
- *Recomendação de início:* usar serviço gerenciado (**Liveblocks/PartyKit/Ably**) para presença/CRDT e evitar reinventar a parte mais difícil.

**IA — Wayline Brain**
- **Anthropic Claude (endpoint Messages)** — forte em PT-BR e em uso de ferramentas (tool use).
- **RAG:** embeddar tarefas/docs/comentários → **pgvector** → recuperar → responder/gerar com Claude. Isolamento por tenant nos embeddings.
- **Agentes atribuíveis** com tool use (criar/mover tarefas, gerar docs, montar relatórios) — o "Doc Brief Agent" da tela-modelo.
- Respostas em streaming, guardrails, e um **Wayline Brain service** dedicado.

**Infra / DevOps**
- **Região Brasil (GRU / sa-east-1)** por LGPD e latência.
- Início em **Fly.io/Railway + Vercel/Cloudflare**; evoluir para **Kubernetes (EKS/GKE)** conforme escala.
- **OpenTelemetry + Sentry + Grafana/Prometheus** (observabilidade) · **GitHub Actions** (CI/CD, previews) · **Terraform/Pulumi** (IaC).
- **Auth:** Clerk/WorkOS (orgs + SSO/SAML/SCIM) para acelerar; ou self-hosted (Lucia/NextAuth).

### 5.3 Modelo de dados (esboço)

> Todas as tabelas de conteúdo carregam `org_id` (RLS). IDs são UUID. Timestamps `created_at`/`updated_at`. Soft delete onde fizer sentido.

**Núcleo**
- `organizations` — id, nome, plano, região.
- `users` — id, nome, email, avatar.
- `memberships` — user_id, org_id, role (owner/admin/member/guest).
- `clients` — org_id, nome, contato, status, cor. *(dimensão transversal)*
- `spaces` — org_id, nome, ícone, cor.
- `folders` — space_id (opcional), nome. *(agrupamento: por cliente/campanha)*
- `lists` — folder_id/space_id, nome, client_id (opcional).
- `statuses` — escopo (list/space), nome, cor, ordem, tipo (open/active/done).
- `tasks` — list_id, título, descrição, status_id, priority, start_date, due_date, parent_id (subtarefas), client_id, `custom` (JSONB).
- `task_assignees` — task_id, user_id.
- `task_tags` / `tags` — categorização.
- `checklists` / `checklist_items` — subitens.
- `task_relationships` — task_id, related_task_id, tipo (blocks/blocked_by/relates).

**Campos custom**
- `custom_fields` — escopo, nome, tipo (text/number/select/date/currency/user/url…), config (JSONB).
- Valores em `tasks.custom` (JSONB) — híbrido: colunas tipadas para campos quentes (status, prioridade, datas, responsável) + JSONB para o resto.

**Views & organização**
- `views` — escopo (list/space/folder), tipo (board/list/table/gantt/calendar/timeline/workload), config (JSONB: filtros, sort, group-by, campos visíveis).

**Colaboração & conhecimento**
- `comments` — entity_type, entity_id, autor, corpo (rich), parent_id (thread), assigned_to.
- `docs` / `doc_pages` — blocos (JSON), colaborativo (Yjs), ligado a tarefas.
- `notifications` / `inbox_items`.

**Tempo, metas, formulários**
- `time_entries` — task_id, user_id, duração, billable, rate.
- `goals` / `targets` / `milestones`.
- `forms` — schema (JSONB), destino (list), mapeamento de campos.

**Automações & IA**
- `automations` — trigger (JSONB), conditions (JSONB), actions (JSONB), enabled.
- `automation_runs` — log de execução (duráveis).
- `ai_agents` — tipo, nome, prompt/persona, ferramentas habilitadas.
- `ai_artifacts` — resumos, conteúdos gerados, com origem.
- `embeddings` (pgvector) — entity_type, entity_id, vetor, chunk.

**Agência (diferencial)**
- `client_portal_access` — client_id, permissões, itens compartilhados.
- `approvals` / `proofing_sessions` — asset, status, aprovador.
- `annotations` — proofing_session_id, coords (x/y/timestamp p/ vídeo), comentário.
- `assets` — biblioteca de marca (logos, cores, arquivos), versões.
- `contracts` / `retainers` — client_id, horas/valor, período; `billing_records`.

**Enterprise**
- `roles` / `permissions` (RBAC custom) · `audit_logs` · `api_keys` / `webhooks` / `oauth_apps`.

### 5.4 Engine de views
Uma **camada de query** única traduz `views.config` (filtros + sort + group-by + campos visíveis) em uma consulta sobre `tasks`. Vários **renderizadores** consomem o mesmo resultado: Board (colunas por status/campo), Lista, Tabela, Gantt (por datas + dependências), Calendário, Timeline, Workload (capacidade × tempo). **Construa a camada de filtro/agrupamento uma vez.**

### 5.5 Engine de automações
`Gatilho` (mudança de status, data atingida, campo alterado, nova tarefa, formulário enviado) → `Condições` → `Ações` (atribuir, mudar status, notificar, criar tarefa, chamar webhook, **rodar IA**). Execução **durável** (Inngest/Temporal). Exposta como builder no-code. É a mesma engine que dispara o Brain (ex.: "ao entrar em *Em Revisão*, gerar resumo para o cliente").

### 5.6 Wayline Brain (IA)
- **Busca/RAG:** pergunta → recupera contexto via pgvector → responde com Claude, citando fontes.
- **Geração:** briefings, *executive summaries* (como na tela-modelo), relatórios de cliente, rascunhos de conteúdo.
- **Agentes:** @mencionáveis e atribuíveis a tarefas; usam tool use para agir no workspace. Tipos iniciais: **Briefing**, **Relatório**, **Conteúdo**, **Triagem**.
- **Guardrails:** isolamento por tenant, limites de custo, revisão humana onde crítico.

### 5.7 API pública, webhooks, integrações
- **REST versionada (OpenAPI)** + **Webhooks** + **OAuth apps** + **Servidor MCP** (para IA operar o Wayline).
- **Integrações nativas** relevantes para agência: Slack, Google/Microsoft, **Meta Ads / Google Ads**, Figma, Zapier/Make.

---

## 6. Design System → implementação

### 6.1 Tokens CSS (Way Cloud)
```css
:root {
  /* Cores — Way Blue */
  --wc-blue: #1D66FF;
  --wc-blue-10: #E8F0FF;
  --wc-blue-20: #C2D5FF;
  --wc-blue-40: #7FABFF;
  --wc-blue-80: #1349C0;
  /* Dark Way */
  --wc-dark: #0B1023;
  /* Semânticas */
  --wc-success: #17C86A;
  --wc-warning: #FFB800;
  --wc-error:   #FF3B30;

  /* Border radius */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-pill: 999px;

  /* Sombras */
  --shadow-xs: 0 1px 3px rgba(11,16,35,.08);
  --shadow-sm: 0 2px 8px rgba(11,16,35,.10);
  --shadow-md: 0 4px 16px rgba(11,16,35,.12);
  --shadow-lg: 0 8px 32px rgba(11,16,35,.15);
  --shadow-xl: 0 16px 48px rgba(29,102,255,.20); /* blue glow */

  /* Espaçamento (escala 8pt) */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
  --space-5: 20px; --space-6: 24px; --space-8: 32px; --space-10: 40px; --space-12: 48px;

  /* Tipografia */
  --font-display: 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-ui: 'Inter', system-ui, sans-serif;
}
```

### 6.2 Escala tipográfica
| Papel | Fonte | Tamanho / peso / tracking |
|---|---|---|
| Display | Plus Jakarta Sans | 48px · 800 · -0.03em |
| H1 | Plus Jakarta Sans | 32px · 800 · -0.02em |
| H2 | Plus Jakarta Sans | 24px · 700 · -0.01em |
| H3 | Plus Jakarta Sans | 18px · 700 |
| Body | Inter | 15px · 400 · 1.6 |
| UI / dense | Inter | 13–14px · 400/500 |
| Label | Inter | 12px · 700 · uppercase · 0.06em |
| Code | mono | 13px |

**Regra:** Plus Jakarta Sans para títulos, marca e números grandes (KPIs). **Inter** para corpo, tabelas, campos e toda UI densa (melhor legibilidade em telas cheias de dados — o caso do PM).

### 6.3 Tema Tailwind (trecho)
```js
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#1D66FF', 10:'#E8F0FF',20:'#C2D5FF',40:'#7FABFF',80:'#1349C0' },
        dark: '#0B1023',
        success: '#17C86A', warning: '#FFB800', danger: '#FF3B30',
      },
      borderRadius: { sm:'6px', md:'8px', lg:'12px', xl:'16px', pill:'999px' },
      boxShadow: {
        xs:'0 1px 3px rgba(11,16,35,.08)', sm:'0 2px 8px rgba(11,16,35,.10)',
        md:'0 4px 16px rgba(11,16,35,.12)', lg:'0 8px 32px rgba(11,16,35,.15)',
        xl:'0 16px 48px rgba(29,102,255,.20)',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"','system-ui','sans-serif'],
        sans: ['Inter','system-ui','sans-serif'],
      },
    },
  },
}
```

### 6.4 Componentes base (do design system)
Botões (Primary/Secondary/Dark/Ghost/Danger · P/M/G · com ícone) · Inputs (default/foco/erro/desabilitado) · Badges/Tags · Alertas (info/sucesso/atenção/erro) · Cards (Light/Dark/Blue) · Avatares (5 tamanhos) · Progress bars · Toggles · Navbar (dark) · Tabs · Tabela (com badges) · **Dark mode**. Construir a biblioteca do app sobre estes, com Radix por baixo.

---

## 7. Requisitos não-funcionais

- **LGPD:** dados no Brasil, base legal, consentimento, exportação e exclusão sob demanda, `audit_logs`.
- **Segurança:** RLS por tenant, RBAC, criptografia em trânsito e repouso, rate limiting, secrets gerenciados; caminho para **SOC 2 / ISO 27001** no enterprise.
- **Performance:** virtualização de listas grandes, updates otimistas, índices (GIN em JSONB), paginação por cursor, CDN para assets.
- **Realtime:** presença e updates sub-segundo; reconciliação servidor-autoritativa; CRDT nos docs.
- **Acessibilidade:** WCAG AA, navegação por teclado, contraste (checar tokens no dark).
- **Internacionalização:** PT-BR primeiro, arquitetura pronta para EN/ES.
- **Confiabilidade:** automações com retries idempotentes; backups; observabilidade (traces/metrics/logs).

---

## 8. Organização de código (monorepo)

```
wayline/
  apps/
    web/            # Next.js (app + institucional)
    api/            # NestJS/Fastify (tRPC + REST público)
    realtime/       # WebSocket + Hocuspocus (Yjs)
    brain/          # serviço de IA (RAG + agentes)
  packages/
    ui/             # biblioteca de componentes (Way Cloud tokens)
    db/             # schema Drizzle + migrações + RLS
    core/           # domínio: hierarquia, views engine, automações
    config/         # tsconfig, eslint, tailwind preset
  infra/            # Terraform/Pulumi, docker, CI
```
Ferramentas: **pnpm workspaces + Turborepo**, tipos compartilhados entre app e API.

---

## 9. Master Prompt (para builder de IA / time de dev)

> Cole o texto abaixo como instrução principal ao construir o Wayline. Ajuste as "Decisões" conforme suas respostas.

```
Você vai construir o "Wayline", um sistema operacional de trabalho NATIVO PARA AGÊNCIAS de
marketing digital — um concorrente de ClickUp/Trello/Notion, porém opinativo e otimizado para
o fluxo de agências (não um clone genérico). O diferencial é ter Clientes, Portal do Cliente,
Proofing/Aprovações, Calendário de Conteúdo, Time Tracking→Billing com rentabilidade, e uma
IA embutida (Wayline Brain) como entidades de primeira classe.

STACK:
- Front: Next.js 15 (App Router) + React 19 + TypeScript, Tailwind (tokens Way Cloud), Radix UI
  (padrão shadcn), dnd-kit, TipTap+Yjs (docs colaborativos), TanStack Query/Virtual.
- Back: Node (NestJS/Fastify) + TypeScript, tRPC (app) + REST OpenAPI (público), Inngest/Temporal
  (automações duráveis).
- Dados: PostgreSQL (RLS multi-tenant + JSONB p/ campos custom + pgvector p/ IA), Drizzle ORM,
  Redis (cache/pub-sub/filas), Meilisearch (busca), Cloudflare R2/S3 (arquivos), CDN.
- Realtime: WebSocket (presença/updates) + Yjs/Hocuspocus (CRDT). Pode usar Liveblocks/PartyKit.
- IA: Anthropic Claude (Messages) para RAG (pgvector) + agentes com tool use.
- Infra: região Brasil (LGPD), Fly.io/Railway + Vercel no início; OpenTelemetry+Sentry.

DESIGN SYSTEM (Way Cloud):
- Primária #1D66FF; dark #0B1023; success #17C86A; warning #FFB800; error #FF3B30.
- Ramps azul: 10 #E8F0FF, 20 #C2D5FF, 40 #7FABFF, 80 #1349C0.
- Radius: sm 6 / md 8 / lg 12 / xl 16 / pill 999. Sombras xs→xl (xl = blue glow).
- Espaçamento em escala 8pt. Dark mode obrigatório.
- Tipografia: Plus Jakarta Sans (títulos/marca/números grandes, pesos 400–800),
  Inter (corpo, tabelas, UI densa). Nada de fonte fora dessas duas.

MODELO DE DADOS (multi-tenant, org_id + RLS em toda linha):
organizations, users, memberships(role owner/admin/member/guest), clients (transversal),
spaces, folders, lists, statuses (custom), tasks (com parent_id p/ subtarefas, client_id,
custom JSONB), task_assignees, tags, checklists, task_relationships (dependências),
custom_fields, views (config JSONB: filtros/sort/group-by/campos), comments (threaded,
assignáveis), docs/doc_pages (Yjs), notifications, time_entries (billable/rate), goals/
milestones, forms, automations/automation_runs, ai_agents/ai_artifacts/embeddings(pgvector),
client_portal_access, approvals/proofing_sessions/annotations, assets, contracts/retainers/
billing_records, roles/permissions, audit_logs, api_keys/webhooks/oauth_apps.

ENGINE DE VIEWS: uma camada de query única (filtros+sort+group-by+campos) sobre tasks, com
renderizadores Board, Lista, Tabela, Gantt, Calendário, Timeline, Workload.
ENGINE DE AUTOMAÇÕES: gatilho→condição→ação, execução durável; a mesma engine dispara a IA.
WAYLINE BRAIN: RAG sobre o workspace; gera briefings, executive summaries e relatórios;
agentes @mencionáveis e atribuíveis (Briefing, Relatório, Conteúdo, Triagem) com tool use.

TELA DE REFERÊNCIA (recriar primeiro): app com barra lateral escura de ícones + painel "Home"
(Inbox, Replies, Assigned Comments, My Tasks, More) + Spaces (Marketing, Product, Quality
Engineering) + topbar com troca de workspace, busca global e abas de view (Chat, Board, List,
Gantt, Calendar). Área central em Board (Kanban) com colunas Open/In Progress/In Review;
cards com responsáveis, datas, prioridade, anexos, contagem de comentários. Painéis flutuantes:
um Doc ("Marketing Launch Brief") com agente de IA, e um "Executive Summary" gerado por IA.
Presença ao vivo (cursores nomeados). Aplicar rigorosamente os tokens Way Cloud e as fontes.

ORDEM DE CONSTRUÇÃO (fases):
0) Fundação: tokens→componentes, auth/orgs, RLS, modelo base, shell (sidebar+topbar).
1) PM core: hierarquia, status/campos custom, Board+Lista, comentários, responsáveis,
   prioridades, datas, anexos, tags, checklists, dependências, realtime, inbox.
2) Camada de agência: Clientes, Portal do Cliente, Proofing/Aprovações, Calendário de
   Conteúdo, Time Tracking, Billing/Retainers, Docs, Formulários.
3) Poder: Gantt/Calendário/Tabela/Workload, Dashboards, Metas/Marcos, Automações no-code.
4) Wayline Brain: busca RAG, resumos/executive summaries, agentes, comandos em linguagem natural.
5) Escala: API pública, webhooks, MCP, integrações (Slack, Meta/Google Ads, Figma), SSO/SCIM,
   mobile, i18n.

NÃO-FUNCIONAIS: LGPD (dados no Brasil, auditoria, exportação/exclusão), segurança (RLS+RBAC,
cripto, rate limit), performance (virtualização, updates otimistas, índices GIN, paginação por
cursor), acessibilidade WCAG AA, i18n (PT-BR primeiro). Entregue código organizado em monorepo
(pnpm + Turborepo): apps/{web,api,realtime,brain} e packages/{ui,db,core,config}.
```

---

## 10. Decisões em aberto (confirmar antes de codar)

1. **Comprar vs construir o "difícil"** (auth/SSO, realtime/CRDT, automações). *Recomendação: comprar o indiferenciado no início; ser dono do diferencial (agência + IA).*
2. **Hospedagem no Brasil (LGPD)?** *Recomendação: sim (GRU/sa-east-1).*
3. **IA na Fase 1/2 ou só na 4?** A tela-modelo aposta pesado em IA — pode ser antecipada como diferencial de vendas.
4. **Escala inicial** (nº de agências/usuários) — define se K8s é necessário agora (provavelmente não).
5. **Modelo de cobrança** (por assento? por cliente?) — afeta billing e tenancy.
6. **Mobile:** responsivo/PWA primeiro ou nativo (React Native/Expo)?
7. **Próximo passo:** (a) refinar este blueprint, (b) protótipo clicável da tela-modelo, ou (c) código da Fase 1.
```
