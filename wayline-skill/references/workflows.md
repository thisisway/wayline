# Receitas (workflows)

## 1. "Mostre as tarefas em aberto do projeto X do Cliente Y"

1. `search_clients {q:"Y"}` → clientId (se >1, pergunte).
2. `list_client_projects {clientId}` → ache "X" (se ambíguo, pergunte).
3. `get_project {projectId}` → pegue os `statusId` das colunas "abertas".
4. `list_project_tasks {projectId, statusId}` → devolva a lista compacta.

## 2. "Crie as tarefas para desenvolver o site do Cliente X" (Fase 2 — escrita)

> Enquanto a escrita não estiver habilitada, faça 1–5 e **apresente o plano**
> (lista de tarefas por setor/status) para o usuário aprovar, em vez de criar.

1. `search_clients {q:"X"}` → clientId.
2. `list_client_projects {clientId}` → identifique o projeto de site
   (ex.: nome com "site"/"web"). Se houver dois plausíveis, **pergunte qual**.
3. `get_project {projectId}` → colunas de status.
4. `get_project_context {projectId}` → brief (escopo, prazos, requisitos).
5. `list_members {}` (ou por setor via tag) → responsáveis, se for atribuir.
6. Estruture as tarefas (ex.: Briefing, Wireframe, UI, Front, Back, Conteúdo,
   SEO, QA, Deploy), cada uma com **tag de setor** (Design/Dev/Conteúdo/SEO),
   prioridade e prazo quando o brief permitir.
7. **(Fase 2)** `create_tasks_bulk` no projeto correto; atribua por responsável.
8. Devolva um **resumo curto**: quantas tarefas, em qual projeto, por setor.

## 3. "Adicione essa pauta ao Social Media do Cliente X"

1. `search_clients {q:"X"}` → clientId.
2. `list_client_projects {clientId}` → ache o projeto de Social Media.
   Se não houver correspondência única, **pergunte**.
3. Estruture as tarefas da pauta com tag `Social Media`.
4. **(Fase 2)** crie e, se pedido, atribua aos responsáveis do setor.

## Regra de ouro em todas

- Confirme o **projeto certo** antes de qualquer escrita.
- Carregue contexto (`get_project_context`, `get_task`) **só** quando a decisão exigir.
- Termine com um resumo de 1–3 linhas do que foi feito ou proposto.
