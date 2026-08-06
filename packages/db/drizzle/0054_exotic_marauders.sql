ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "space_id" uuid;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "folder_id" uuid;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pages_space_idx" ON "pages" USING btree ("space_id");
