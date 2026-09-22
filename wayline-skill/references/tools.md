# Ferramentas do MCP da Wayline

Todas retornam JSON compacto. `orgId` é opcional em todas — se omitido, usa a
primeira org do usuário; passe-o explicitamente quando o usuário tiver várias.

## Descoberta / leitura (Fase 1)

| Ferramenta | Quando usar | Devolve |
|---|---|---|
| `whoami` | Início de tudo; descobrir `orgId`. | usuário, escopo, orgs (id+nome) |
| `search_clients {q?, limit?}` | Achar um cliente pelo nome. | clientes (id+nome) |
| `list_client_projects {clientId}` | Ver os projetos de um cliente. | projetos (id+nome) |
| `search_projects {q?, limit?}` | Achar um projeto pelo nome (com cliente). | projetos (id, nome, client) |
| `get_project {projectId}` | Cliente, **colunas de status** e total de tarefas. | resumo do projeto |
| `list_project_tasks {projectId, statusId?, assigneeId?, priority?, limit?, offset?}` | Ver tarefas (filtradas/paginadas). | linhas compactas |
| `get_task {taskId}` | Detalhe de uma tarefa específica. | descrição, responsáveis, prazo, tags, subtarefas |
| `list_task_comments {taskId}` | Só quando precisar do histórico. | autor + texto |
| `list_members {q?}` | Achar um responsável pelo nome. | membros (id, nome, email) |
| `get_project_context {projectId}` | Entender o projeto (brief) antes de agir. | texto do brief (compacto) |

## Dicas

- Para saber os **statusIds** de um projeto, chame `get_project` — ele traz as colunas.
- Para atribuir/filtrar por responsável, pegue o `id` em `list_members`.
- `priority` ∈ `urgent | high | normal | low`. `dueDate` vem como `YYYY-MM-DD`.

## Escrita (requer token com escopo "Leitura + escrita")

| Ferramenta | O que faz | Notas |
|---|---|---|
| `create_task {projectId, title, description?, priority?, dueDate?, assigneeIds?, tags?, statusId?}` | Cria 1 tarefa. | `statusId` default = 1ª coluna. `tags` = setores. `dueDate`=YYYY-MM-DD. |
| `create_tasks_bulk {projectId, tasks[], statusId?}` | Cria várias (máx. 50). | Ideal para montar um plano inteiro de uma vez. |
| `update_task {taskId, ...campos}` | Atualiza parcial. | Só os campos enviados mudam. |
| `assign_task {taskId, assigneeIds}` | Define responsáveis (substitui). | Pegue ids em `list_members`. |
| `add_comment {taskId, body}` | Comenta na tarefa. | |
| `add_project_context {projectId, note}` | Anexa nota ao brief. | |
| `delete_task {taskId, confirm:true}` | **Exclui** (soft). | **Destrutivo**: peça confirmação ao usuário antes; só então `confirm:true`. |

## Subtarefas e lote (escrita)

| Ferramenta | O que faz |
|---|---|
| `list_subtasks {taskId}` | Subtarefas (id, título, concluída). Leitura. |
| `create_subtask {taskId, title}` | Cria uma subtarefa. |
| `set_subtask_done {subtaskId, done?, title?}` | Conclui/reabre (e renomeia). |
| `bulk_set_status {taskIds[], statusId, projectId?}` | Move várias tarefas de status. |
| `bulk_set_priority {taskIds[], priority, projectId?}` | Prioridade de várias tarefas. |

Para lote, junte primeiro os `taskIds` com `list_project_tasks` (filtrando por
status/responsável). Passe `projectId` nos bulk para o board atualizar ao vivo.

## Dependências entre tarefas

| Ferramenta | O que faz |
|---|---|
| `list_dependencies {taskId}` | `blockedBy` (o que bloqueia esta) e `blocks` (o que ela bloqueia). |
| `add_dependency {taskId, dependsOnId}` | `taskId` passa a **depender de** `dependsOnId` (ordena etapas). |
| `remove_dependency {depId}` | Remove uma dependência (o `depId` vem de `list_dependencies`). |

Ex.: ao montar o site, faça "Front" depender de "UI", e "Deploy" depender de
"QA": `add_dependency {taskId: Front, dependsOnId: UI}`. Ciclos são recusados.

Toda ação de escrita é registrada na auditoria da tarefa como **"IA · <token>"**.
Antes de criar/alterar, **confirme o projeto certo** (ver `safety.md`). Após agir,
devolva um resumo curto.
