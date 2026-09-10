CREATE TABLE `tbl_app_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`hydration_state` text DEFAULT 'pending' NOT NULL,
	`hydration_attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`staged_manifest` text,
	`updated_at` text
);
