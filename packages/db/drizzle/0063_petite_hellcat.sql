CREATE TABLE IF NOT EXISTS "password_resets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_resets_email_unique" UNIQUE("email")
);
--> statement-breakpoint
-- Sem RLS (tabela de auth pré-sessão, como email_verifications/users).
GRANT SELECT, INSERT, UPDATE, DELETE ON "password_resets" TO wayline_app;
