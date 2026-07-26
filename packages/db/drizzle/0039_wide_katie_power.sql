CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid,
	"user_name" text DEFAULT '' NOT NULL,
	"user_email" text DEFAULT '' NOT NULL,
	"org_name" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'support' NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "platform_settings" ADD COLUMN "support_whatsapp_url" text;--> statement-breakpoint
CREATE INDEX "support_tickets_status_idx" ON "support_tickets" USING btree ("status");--> statement-breakpoint

-- Sem RLS (gerido pelo superadmin em /admin; org_id filtrado no app). Grant ao role da app.
GRANT SELECT, INSERT, UPDATE, DELETE ON "support_tickets" TO wayline_app;