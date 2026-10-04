CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`start_at` text NOT NULL,
	`end_at` text NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_events_status_end` ON `events` (`status`,`end_at`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`reset_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `seed_versions` (
	`id` text PRIMARY KEY NOT NULL
);
