CREATE TABLE `activity_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_reports_status_created` ON `activity_reports` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `import_pages` (
	`url` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`hash` text,
	`checked_at` text,
	`processed_at` text,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `import_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`status` text NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `job_locks` (
	`key` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`expires_at` integer NOT NULL
);
