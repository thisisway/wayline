ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint

-- No login ainda não há org no contexto. Permite o usuário ler as PRÓPRIAS
-- memberships (qualquer org) via app.current_user, além da regra por org.
DROP POLICY IF EXISTS "memberships_org_isolation" ON "memberships";--> statement-breakpoint
CREATE POLICY "memberships_org_isolation" ON "memberships"
  USING (
    org_id = current_setting('app.current_org', true)::uuid
    OR user_id = current_setting('app.current_user', true)::uuid
  )
  WITH CHECK (org_id = current_setting('app.current_org', true)::uuid);