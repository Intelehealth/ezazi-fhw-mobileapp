ALTER TABLE `tbl_app_state` ADD `last_successful_pull_time` text DEFAULT '2006-08-22 22:21:48 ' NOT NULL;--> statement-breakpoint
ALTER TABLE `tbl_app_state` DROP COLUMN `staged_manifest`;--> statement-breakpoint
ALTER TABLE `tbl_app_state` DROP COLUMN `updated_at`;