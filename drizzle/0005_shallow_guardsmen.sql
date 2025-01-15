ALTER TABLE "hershpateldotcom_images" ADD COLUMN "camera_make" varchar(256);--> statement-breakpoint
ALTER TABLE "hershpateldotcom_images" ADD COLUMN "camera_model" varchar(256);--> statement-breakpoint
ALTER TABLE "hershpateldotcom_images" DROP COLUMN IF EXISTS "camera";