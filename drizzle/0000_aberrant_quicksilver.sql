CREATE TABLE IF NOT EXISTS "hershpateldotcom_images" (
	"pk" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_key" varchar(256) NOT NULL,
	"thumbnail_key" varchar(256) NOT NULL,
	"gallery_key" varchar(256) NOT NULL,
	"camera" varchar(256),
	"original_created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "created_at_idx" ON "hershpateldotcom_images" USING btree ("original_created_at");