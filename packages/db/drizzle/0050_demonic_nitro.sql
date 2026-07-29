CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"client_id" uuid,
	"description" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'Geral' NOT NULL,
	"amount_cents" integer DEFAULT 0 NOT NULL,
	"due_date" timestamp with time zone,
	"paid" boolean DEFAULT false NOT NULL,
	"paid_at" timestamp with time zone,
	"recurrence" text DEFAULT 'none' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expenses_org_idx" ON "expenses" USING btree ("org_id");--> statement-breakpoint

-- Sem RLS (uso interno; org_id filtrado no app). Grant ao role da app.
GRANT SELECT, INSERT, UPDATE, DELETE ON "expenses" TO wayline_app;