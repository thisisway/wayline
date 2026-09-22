CREATE TABLE IF NOT EXISTS "api_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text DEFAULT 'Token' NOT NULL,
	"token_hash" text NOT NULL,
	"scope" text DEFAULT 'write' NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
-- Tabela de auth (sem RLS, como users/email_verifications). Acesso do app:
GRANT SELECT, INSERT, UPDATE, DELETE ON "api_tokens" TO wayline_app;
