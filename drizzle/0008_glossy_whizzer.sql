CREATE TABLE IF NOT EXISTS "hershpateldotcom_image_tags" (
	"image_pk" uuid NOT NULL,
	"tag_pk" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "hershpateldotcom_image_tags_image_pk_tag_pk_pk" PRIMARY KEY("image_pk","tag_pk")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hershpateldotcom_tags" (
	"pk" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" varchar(256),
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "hershpateldotcom_tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
DROP INDEX IF EXISTS "created_at_idx";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hershpateldotcom_image_tags" ADD CONSTRAINT "hershpateldotcom_image_tags_image_pk_hershpateldotcom_images_pk_fk" FOREIGN KEY ("image_pk") REFERENCES "public"."hershpateldotcom_images"("pk") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hershpateldotcom_image_tags" ADD CONSTRAINT "hershpateldotcom_image_tags_tag_pk_hershpateldotcom_tags_pk_fk" FOREIGN KEY ("tag_pk") REFERENCES "public"."hershpateldotcom_tags"("pk") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "image_tags_image_idx" ON "hershpateldotcom_image_tags" USING btree ("image_pk");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "image_tags_tag_idx" ON "hershpateldotcom_image_tags" USING btree ("tag_pk");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "original_created_at_idx" ON "hershpateldotcom_images" USING btree ("original_created_at");