// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import {
  index,
  pgTableCreator,
  timestamp,
  varchar,
  uuid,
  pgEnum,
} from "drizzle-orm/pg-core";
import { ImageStatus } from "~/app/shh/constants";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `hershpateldotcom_${name}`);

export const imageStatusEnum = pgEnum('image_status', ['pending', 'ready', 'disabled']);

export const images = createTable(
  "images",
  {
    pk: uuid("pk").primaryKey().defaultRandom(),
    status: imageStatusEnum("status").notNull().default(ImageStatus.PENDING),
    photo_name: varchar("photo_name", { length: 256 }).notNull().unique(),
    full_key: varchar("full_key", { length: 256 }).notNull().unique(),
    thumbnail_key: varchar("thumbnail_key", { length: 256 }),
    gallery_key: varchar("gallery_key", { length: 256 }),
    camera_make: varchar("camera_make", { length: 256 }),
    camera_model: varchar("camera_model", { length: 256 }),
    original_created_at: timestamp("original_created_at", { withTimezone: true }).notNull(),
    f_number: varchar("f_number", { length: 256 }),
    iso: varchar("iso", { length: 256 }),
    focal_length: varchar("focal_length", { length: 256 }),
    exposure_time: varchar("exposure_time", { length: 256 }),
  },
  (table) => ({
    createdAtIdx: index("created_at_idx").on(table.original_created_at),
  })
);

// Update the type helper to use the enum
export type Image = typeof images.$inferSelect;
