ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "calendar_token" text;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "users" ADD CONSTRAINT "users_calendar_token_unique" UNIQUE("calendar_token");
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;
