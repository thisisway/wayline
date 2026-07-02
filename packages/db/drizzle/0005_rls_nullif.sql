-- Correção RLS: GUC pode voltar como '' (string vazia) após uma transação
-- que o setou, e ''::uuid dá erro. NULLIF(..., '') trata '' como NULL.
-- Recria todas as policies por org com NULLIF (idempotente via DROP IF EXISTS).

-- Tabelas com isolamento simples por org.
DROP POLICY IF EXISTS "clients_org_isolation" ON "clients";--> statement-breakpoint
CREATE POLICY "clients_org_isolation" ON "clients"
  USING (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint

DROP POLICY IF EXISTS "spaces_org_isolation" ON "spaces";--> statement-breakpoint
CREATE POLICY "spaces_org_isolation" ON "spaces"
  USING (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint

DROP POLICY IF EXISTS "folders_org_isolation" ON "folders";--> statement-breakpoint
CREATE POLICY "folders_org_isolation" ON "folders"
  USING (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint

DROP POLICY IF EXISTS "lists_org_isolation" ON "lists";--> statement-breakpoint
CREATE POLICY "lists_org_isolation" ON "lists"
  USING (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint

DROP POLICY IF EXISTS "statuses_org_isolation" ON "statuses";--> statement-breakpoint
CREATE POLICY "statuses_org_isolation" ON "statuses"
  USING (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint

DROP POLICY IF EXISTS "tasks_org_isolation" ON "tasks";--> statement-breakpoint
CREATE POLICY "tasks_org_isolation" ON "tasks"
  USING (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint

DROP POLICY IF EXISTS "task_assignees_org_isolation" ON "task_assignees";--> statement-breakpoint
CREATE POLICY "task_assignees_org_isolation" ON "task_assignees"
  USING (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint

DROP POLICY IF EXISTS "comments_org_isolation" ON "comments";--> statement-breakpoint
CREATE POLICY "comments_org_isolation" ON "comments"
  USING (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint

-- memberships: org OU o próprio usuário (login).
DROP POLICY IF EXISTS "memberships_org_isolation" ON "memberships";--> statement-breakpoint
CREATE POLICY "memberships_org_isolation" ON "memberships"
  USING (
    org_id = NULLIF(current_setting('app.current_org', true), '')::uuid
    OR user_id = NULLIF(current_setting('app.current_user', true), '')::uuid
  )
  WITH CHECK (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid);