# Segurança — invariantes de autorização (IDOR)

Modelo multi-tenant. **Nunca confie em id/identificador vindo do cliente.** Toda
request revalida no servidor que o usuário só acessa o que possui ou lhe foi
concedido. Estes invariantes são obrigatórios — PR que os viole é bloqueado.

## 1. Toda server action que recebe `orgId` valida membership ANTES de tocar dados

```ts
export async function fooAction(orgId: string, ...) {
  if (!(await assertMember(orgId))) return null;      // ou assertRole(orgId, "admin")
  // ... só aqui pode consultar/mutar
}
```

A RLS confia em `app.current_org`, setado a partir do `orgId` recebido. Sem o
`assertMember`/`assertRole`, um usuário passa o `orgId` de outra org e a RLS o
"autoriza" — cross-tenant. Ver `apps/web/src/lib/authz.ts`.

## 2. Query em tabela SEM RLS filtra por `org_id` explicitamente

Tabelas sem RLS (proposals, contracts, invoices, forms, expenses, portfolio,
integrations, project_templates, client_portals, support_*, …) **não** têm
isolamento no banco. Todo `get/update/delete` por id inclui o org:

```ts
.where(and(eq(t.id, id), eq(t.orgId, orgId)))   // nunca só eq(t.id, id)
```

Tabela COM RLS (tasks, comments, statuses, lists, clients, attachments, …): use
`withOrg(orgId, tx => …)` — a policy `*_org_isolation` filtra sozinha.

## 3. Rota pública por token resolve o escopo no servidor e revalida o recurso

Token é o segredo (aleatório, não enumerável). Nunca aceite `orgId`/`clientId`
do cliente numa rota pública — derive-os do token, e revalide que o id de
recurso pedido pertence ao escopo do token:

```ts
const ref = await resolvePortalToken(token);              // → { orgId, clientId }
if (!ref || !(await taskBelongsToClient(ref.orgId, taskId, ref.clientId))) return null;
```

Referências corretas: `resolveShareTask` (exige `t.listId === share.listId`),
`taskBelongsToClient` (exige `tasks.clientId === clientId`).

## 4. Acesso negado → resposta genérica, sem revelar existência

Actions retornam `null` / `false` / `[]` tanto para "não existe" quanto para
"existe mas você não pode" — o cliente não distingue os casos. Páginas por token
inválido/ausente renderizam um "não encontrado" genérico. Não vaze se o id
existe em outra org.

## Checklist para toda nova action/query

- [ ] Recebe `orgId`? → `assertMember`/`assertRole` na primeira linha.
- [ ] Tabela sem RLS? → `where` inclui `eq(t.orgId, orgId)`.
- [ ] Tabela com RLS? → dentro de `withOrg(orgId, …)`.
- [ ] Rota pública? → escopo derivado do token + recurso revalidado contra o escopo.
- [ ] Retorno em acesso negado é genérico (`null`/`false`/`[]`), sem vazar existência.
