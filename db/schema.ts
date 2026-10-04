import { sqliteTable, text, index, integer } from "drizzle-orm/sqlite-core";
export const events = sqliteTable("events", { id: text("id").primaryKey(), status: text("status").notNull(), startAt: text("start_at").notNull(), endAt: text("end_at").notNull(), data: text("data").notNull(), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull() }, t => [index("idx_events_status_end").on(t.status, t.endAt)]);
export const rateLimits = sqliteTable("rate_limits", { key: text("key").primaryKey(), count: integer("count").notNull(), resetAt: integer("reset_at").notNull() });
export const seedVersions = sqliteTable("seed_versions", { id: text("id").primaryKey() });
export const appSettings = sqliteTable("app_settings", { key: text("key").primaryKey(), data: text("data").notNull() });
export const importPages = sqliteTable("import_pages", { url: text("url").primaryKey(), sourceId: text("source_id").notNull(), hash: text("hash"), checkedAt: text("checked_at"), processedAt: text("processed_at"), data: text("data").notNull() });
export const importRuns = sqliteTable("import_runs", { id: text("id").primaryKey(), startedAt: text("started_at").notNull(), finishedAt: text("finished_at"), status: text("status").notNull(), data: text("data").notNull() });
export const jobLocks = sqliteTable("job_locks", { key: text("key").primaryKey(), owner: text("owner").notNull(), expiresAt: integer("expires_at").notNull() });
export const activityReports = sqliteTable("activity_reports", { id: text("id").primaryKey(), eventId: text("event_id").notNull(), status: text("status").notNull(), createdAt: text("created_at").notNull(), data: text("data").notNull() }, t => [index("idx_reports_status_created").on(t.status,t.createdAt)]);
