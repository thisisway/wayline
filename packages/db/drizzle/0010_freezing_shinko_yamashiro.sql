CREATE TABLE "task_dependencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_blocker_id_tasks_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_blocked_id_tasks_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "task_dep_unique" ON "task_dependencies" USING btree ("blocker_id","blocked_id");--> statement-breakpoint
CREATE INDEX "task_dep_blocked_idx" ON "task_dependencies" USING btree ("blocked_id");--> statement-breakpoint
CREATE INDEX "task_dep_blocker_idx" ON "task_dependencies" USING btree ("blocker_id");--> statement-breakpoint
CREATE INDEX "task_dep_org_idx" ON "task_dependencies" USING btree ("org_id");--> statement-breakpoint

-- RLS por org_id (com NULLIF)
ALTER TABLE "task_dependencies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "task_dependencies" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "task_dependencies_org_isolation" ON "task_dependencies"
  USING (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid)
  WITH CHECK (org_id = NULLIF(current_setting('app.current_org', true), '')::uuid);--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "task_dependencies" TO wayline_app;