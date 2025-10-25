import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./user";

export const generation = pgTable("generation", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  audioUrl: text("audio_url").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: text("file_size").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type GenerationType = typeof generation.$inferSelect;

