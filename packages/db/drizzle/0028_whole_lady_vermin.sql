CREATE TABLE "platform_settings" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"logo_url" text,
	"brand_color" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Config global (sem RLS). Só o superadmin escreve, via app (guardado na action).
GRANT SELECT, INSERT, UPDATE, DELETE ON "platform_settings" TO wayline_app;
