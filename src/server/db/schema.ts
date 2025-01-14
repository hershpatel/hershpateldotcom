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

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `hershpateldotcom_${name}`);

export const imageStatusEnum = pgEnum('image_status', ['pending', 'ready', 'disabled']);

// Add the TypeScript enum
export enum ImageStatus {
  PENDING = 'pending',
  READY = 'ready',
  DISABLED = 'disabled'
}

export const images = createTable(
  "images",
  {
    pk: uuid("pk").primaryKey().defaultRandom(),
    status: imageStatusEnum("status").notNull().default(ImageStatus.PENDING),
    full_key: varchar("full_key", { length: 256 }).notNull(),
    thumbnail_key: varchar("thumbnail_key", { length: 256 }).notNull(),
    gallery_key: varchar("gallery_key", { length: 256 }).notNull(),
    camera: varchar("camera", { length: 256 }),
    original_created_at: timestamp("original_created_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    createdAtIdx: index("created_at_idx").on(table.original_created_at),
  })
);

// Update the type helper to use the enum
export type Image = typeof images.$inferSelect;
