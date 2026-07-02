/**
 * Seed inicial (Fase 1.1) — popula uma org de demonstração espelhando o mock
 * do board, agora a partir do Postgres.
 *
 * Idempotente: apaga a org pelo slug (cascade) e recria do zero.
 * Rodar: DATABASE_URL="..." pnpm --filter @wayline/db db:seed
 */
import { eq } from "drizzle-orm";
import { closeDb, getDb, withOrg } from "./client";
import {
  clients,
  lists,
  memberships,
  organizations,
  spaces,
  statuses,
  taskAssignees,
  tasks,
  users,
} from "./schema";

const ORG_SLUG = "wayline-studio";

async function main() {
  const db = getDb();

  // --- Reset idempotente (delete escopado por org p/ passar pela RLS) -------
  const existing = await db.query.organizations.findFirst({
    where: eq(organizations.slug, ORG_SLUG),
  });
  if (existing) {
    await withOrg(existing.id, async (tx) => {
      await tx.delete(organizations).where(eq(organizations.id, existing.id));
    });
    console.log(`org existente '${ORG_SLUG}' removida (cascade).`);
  }

  // --- Org (organizations não tem RLS) -------------------------------------
  const [org] = await db
    .insert(organizations)
    .values({ name: "Wayline Studio", slug: ORG_SLUG, plan: "growth" })
    .returning();
  if (!org) throw new Error("falha ao criar org");
  const orgId = org.id;

  // Tudo que carrega org_id roda com app.current_org setado (RLS).
  await withOrg(orgId, async (db) => {
  // --- Users ---------------------------------------------------------------
  const people = [
    { key: "ana", name: "Ana Rocha", email: "ana@wayline.studio" },
    { key: "bruno", name: "Bruno Lima", email: "bruno@wayline.studio" },
    { key: "carla", name: "Carla Nunes", email: "carla@wayline.studio" },
    { key: "diego", name: "Diego Farias", email: "diego@wayline.studio" },
    { key: "eva", name: "Eva Prado", email: "eva@wayline.studio" },
    { key: "felipe", name: "Felipe Souza", email: "felipe@wayline.studio" },
  ] as const;

  const insertedUsers = await db
    .insert(users)
    .values(people.map((p) => ({ name: p.name, email: p.email })))
    .onConflictDoNothing()
    .returning();

  // Garante que temos os ids mesmo se algum email já existia de um seed anterior.
  const allUsers = await db.query.users.findMany();
  const u = (key: (typeof people)[number]["key"]) => {
    const email = people.find((p) => p.key === key)!.email;
    const found = allUsers.find((x) => x.email === email);
    if (!found) throw new Error(`user ${key} não encontrado`);
    return found.id;
  };
  void insertedUsers;

  await db
    .insert(memberships)
    .values([
      { orgId, userId: u("ana"), role: "owner" },
      { orgId, userId: u("bruno"), role: "member" },
      { orgId, userId: u("carla"), role: "member" },
      { orgId, userId: u("diego"), role: "member" },
      { orgId, userId: u("eva"), role: "member" },
      { orgId, userId: u("felipe"), role: "member" },
    ])
    .onConflictDoNothing();

  // --- Clientes ------------------------------------------------------------
  const [acme, lumen, novva] = await db
    .insert(clients)
    .values([
      { orgId, name: "Acme Co.", color: "#1D66FF", status: "active" },
      { orgId, name: "Lumen Foods", color: "#FFB800", status: "active" },
      { orgId, name: "Novva Bank", color: "#17C86A", status: "active" },
    ])
    .returning();
  if (!acme || !lumen || !novva) throw new Error("falha ao criar clientes");

  // --- Space + List --------------------------------------------------------
  const [marketing] = await db
    .insert(spaces)
    .values({ orgId, name: "Marketing", color: "#1D66FF", icon: "M" })
    .returning();
  if (!marketing) throw new Error("falha ao criar space");

  const [list] = await db
    .insert(lists)
    .values({ orgId, spaceId: marketing.id, clientId: acme.id, name: "Launch Campaign" })
    .returning();
  if (!list) throw new Error("falha ao criar lista");

  // --- Statuses (colunas) --------------------------------------------------
  const [open, inProgress, inReview] = await db
    .insert(statuses)
    .values([
      { orgId, listId: list.id, name: "Open", kind: "open", color: "#94A3B8", position: 0 },
      { orgId, listId: list.id, name: "In Progress", kind: "active", color: "#1D66FF", position: 1 },
      { orgId, listId: list.id, name: "In Review", kind: "active", color: "#FFB800", position: 2 },
    ])
    .returning();
  if (!open || !inProgress || !inReview) throw new Error("falha ao criar statuses");

  // --- Tasks (data-base: 2026-07-01) --------------------------------------
  const d = (iso: string) => new Date(iso);
  const seedTasks = [
    {
      title: "Definir posicionamento da campanha de lançamento",
      statusId: open.id,
      clientId: acme.id,
      priority: "high" as const,
      dueDate: d("2026-07-03"),
      position: 0,
      tags: [{ label: "Estratégia", color: "#1D66FF" }],
      assignees: [u("bruno"), u("carla")],
    },
    {
      title: "Briefing de criativos para social",
      statusId: open.id,
      clientId: lumen.id,
      priority: "normal" as const,
      dueDate: d("2026-07-05"),
      position: 1,
      tags: [{ label: "Conteúdo", color: "#FFB800" }],
      assignees: [u("diego")],
    },
    {
      title: "Mapear personas e canais de aquisição",
      statusId: open.id,
      clientId: novva.id,
      priority: "low" as const,
      dueDate: d("2026-07-09"),
      position: 2,
      tags: [{ label: "Pesquisa", color: "#7C5CFF" }],
      assignees: [u("eva"), u("felipe")],
    },
    {
      title: "Marketing Launch Brief — redação do documento mestre",
      statusId: inProgress.id,
      clientId: acme.id,
      priority: "urgent" as const,
      dueDate: d("2026-07-01"),
      position: 0,
      tags: [
        { label: "Doc", color: "#1D66FF" },
        { label: "IA", color: "#7C5CFF" },
      ],
      assignees: [u("ana"), u("bruno")],
    },
    {
      title: "Produzir 6 variações de anúncio para Meta Ads",
      statusId: inProgress.id,
      clientId: lumen.id,
      priority: "high" as const,
      dueDate: d("2026-06-30"), // vencida
      position: 1,
      tags: [{ label: "Paid", color: "#FFB800" }],
      assignees: [u("diego"), u("carla")],
    },
    {
      title: "Landing page — revisão de copy e QA",
      statusId: inReview.id,
      clientId: novva.id,
      priority: "normal" as const,
      dueDate: d("2026-07-04"),
      position: 0,
      tags: [{ label: "Web", color: "#17C86A" }],
      assignees: [u("felipe")],
    },
    {
      title: "Aprovar calendário de conteúdo — Julho",
      statusId: inReview.id,
      clientId: acme.id,
      priority: "high" as const,
      dueDate: d("2026-07-02"),
      position: 1,
      tags: [{ label: "Aprovação", color: "#1D66FF" }],
      assignees: [u("ana")],
    },
  ];

  for (const t of seedTasks) {
    const { assignees, ...taskData } = t;
    const [created] = await db
      .insert(tasks)
      .values({ orgId, listId: list.id, ...taskData })
      .returning();
    if (!created) throw new Error(`falha ao criar task '${t.title}'`);
    await db
      .insert(taskAssignees)
      .values(assignees.map((userId) => ({ orgId, taskId: created.id, userId })));
  }

  console.log(
    `seed ok: org=${orgId} · ${seedTasks.length} tasks em ${list.name} (3 colunas).`,
  );
  }); // withOrg

  await closeDb();
}

main().catch(async (err) => {
  console.error(err);
  await closeDb();
  process.exit(1);
});
