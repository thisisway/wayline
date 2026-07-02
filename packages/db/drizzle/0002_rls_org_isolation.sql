-- RLS por org_id (Fase 1.4) — isolamento multi-tenant no banco.
--
-- FORCE é necessário porque o app conecta como DONO das tabelas, e o dono
-- ignora RLS por padrão. A org corrente vem de `app.current_org`, setada por
-- transação via set_config (ver helper withOrg). `current_setting(..., true)`
-- retorna NULL se não setada → nenhuma linha casa (default-deny).

-- memberships
ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "memberships" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "memberships_org_isolation" ON "memberships"
  USING (org_id = current_setting('app.current_org', true)::uuid)
  WITH CHECK (org_id = current_setting('app.current_org', true)::uuid);--> statement-breakpoint

-- clients
ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clients" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "clients_org_isolation" ON "clients"
  USING (org_id = current_setting('app.current_org', true)::uuid)
  WITH CHECK (org_id = current_setting('app.current_org', true)::uuid);--> statement-breakpoint

-- spaces
ALTER TABLE "spaces" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "spaces" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "spaces_org_isolation" ON "spaces"
  USING (org_id = current_setting('app.current_org', true)::uuid)
  WITH CHECK (org_id = current_setting('app.current_org', true)::uuid);--> statement-breakpoint

-- folders
ALTER TABLE "folders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "folders" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "folders_org_isolation" ON "folders"
  USING (org_id = current_setting('app.current_org', true)::uuid)
  WITH CHECK (org_id = current_setting('app.current_org', true)::uuid);--> statement-breakpoint

-- lists
ALTER TABLE "lists" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "lists" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "lists_org_isolation" ON "lists"
  USING (org_id = current_setting('app.current_org', true)::uuid)
  WITH CHECK (org_id = current_setting('app.current_org', true)::uuid);--> statement-breakpoint

-- statuses
ALTER TABLE "statuses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "statuses" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "statuses_org_isolation" ON "statuses"
  USING (org_id = current_setting('app.current_org', true)::uuid)
  WITH CHECK (org_id = current_setting('app.current_org', true)::uuid);--> statement-breakpoint

-- tasks
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tasks" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tasks_org_isolation" ON "tasks"
  USING (org_id = current_setting('app.current_org', true)::uuid)
  WITH CHECK (org_id = current_setting('app.current_org', true)::uuid);--> statement-breakpoint

-- task_assignees
ALTER TABLE "task_assignees" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "task_assignees" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "task_assignees_org_isolation" ON "task_assignees"
  USING (org_id = current_setting('app.current_org', true)::uuid)
  WITH CHECK (org_id = current_setting('app.current_org', true)::uuid);
