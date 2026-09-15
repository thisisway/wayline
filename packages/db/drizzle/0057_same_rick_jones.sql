ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "icon" text;--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN IF NOT EXISTS "icon" text;
