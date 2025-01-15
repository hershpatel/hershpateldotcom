ALTER TABLE "hershpateldotcom_images" ADD COLUMN "photo_name" varchar(256) NOT NULL;--> statement-breakpoint
ALTER TABLE "hershpateldotcom_images" ADD CONSTRAINT "hershpateldotcom_images_photo_name_unique" UNIQUE("photo_name");--> statement-breakpoint
ALTER TABLE "hershpateldotcom_images" ADD CONSTRAINT "hershpateldotcom_images_full_key_unique" UNIQUE("full_key");