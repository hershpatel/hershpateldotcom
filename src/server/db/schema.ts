// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import {
  index,
  pgTableCreator,
  timestamp,
  text,
  uuid,
  primaryKey,
} from "drizzle-orm/pg-core";
import { ImageStatus } from "~/app/shh/constants";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `hershpateldotcom_${name}`);

export const images = createTable(
  "images",
  {
    pk: uuid("pk").primaryKey().defaultRandom(),
    status: text("status").notNull().default(ImageStatus.PENDING.toString()),
    photo_name: text("photo_name").notNull().unique(),
    full_key: text("full_key").notNull().unique(),
    thumbnail_key: text("thumbnail_key"),
    gallery_key: text("gallery_key"),
    camera_make: text("camera_make"),
    camera_model: text("camera_model"),
    original_created_at: timestamp("original_created_at", { withTimezone: true }).notNull(),
    f_number: text("f_number"),
    iso: text("iso"),
    focal_length: text("focal_length"),
    exposure_time: text("exposure_time"),
  },
  (table) => ({
    original_created_at_idx: index("original_created_at_idx").on(table.original_created_at),
    status_idx: index("status_idx").on(table.status),
  })
);

export const tags = createTable(
  "tags",
  {
    pk: uuid("pk").primaryKey().defaultRandom(),
    name: text("name").notNull().unique(),
    description: text("description"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  }
);

export const imageTags = createTable(
  "image_tags",
  {
    image_pk: uuid("image_pk")
      .notNull()
      .references(() => images.pk, { onDelete: "cascade" }),
    tag_pk: uuid("tag_pk")
      .notNull()
      .references(() => tags.pk, { onDelete: "cascade" }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.image_pk, table.tag_pk] }),
    image_idx: index("image_tags_image_idx").on(table.image_pk),
    tag_idx: index("image_tags_tag_idx").on(table.tag_pk),
  })
);

// Update the type helper to use the enum
export type Image = typeof images.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type ImageTag = typeof imageTags.$inferSelect;
