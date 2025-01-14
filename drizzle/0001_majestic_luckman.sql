DO $$ BEGIN
 CREATE TYPE "public"."image_status" AS ENUM('pending', 'ready', 'disabled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "hershpateldotcom_images" ADD COLUMN "status" "image_status" DEFAULT 'pending' NOT NULL;