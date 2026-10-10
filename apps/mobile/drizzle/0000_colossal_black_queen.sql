CREATE TABLE `tbl_app_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`hydration_state` text DEFAULT 'pending' NOT NULL,
	`hydration_attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`staged_manifest` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `tbl_dr_speciality` (
	`uuid` text PRIMARY KEY NOT NULL,
	`provideruuid` text,
	`attributetypeuuid` text,
	`value` text,
	`voided` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tbl_dr_speciality_provideruuid` ON `tbl_dr_speciality` (`provideruuid`);--> statement-breakpoint
CREATE TABLE `tbl_encounter` (
	`uuid` text PRIMARY KEY NOT NULL,
	`visituuid` text,
	`encounter_time` text,
	`provider_uuid` text,
	`encounter_type_uuid` text,
	`modified_date` text,
	`sync` integer DEFAULT false NOT NULL,
	`voided` integer DEFAULT 0 NOT NULL,
	`privacynotice_value` text
);
--> statement-breakpoint
CREATE INDEX `idx_tbl_encounter_visituuid` ON `tbl_encounter` (`visituuid`);--> statement-breakpoint
CREATE INDEX `idx_tbl_encounter_sync` ON `tbl_encounter` (`sync`);--> statement-breakpoint
CREATE TABLE `tbl_image_records` (
	`uuid` text PRIMARY KEY NOT NULL,
	`patientuuid` text,
	`visituuid` text,
	`encounteruuid` text,
	`image_path` text,
	`obs_time_date` text,
	`image_type` text,
	`voided` integer DEFAULT 0 NOT NULL,
	`sync` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tbl_image_records_patientuuid` ON `tbl_image_records` (`patientuuid`);--> statement-breakpoint
CREATE INDEX `idx_tbl_image_records_visituuid` ON `tbl_image_records` (`visituuid`);--> statement-breakpoint
CREATE INDEX `idx_tbl_image_records_encounteruuid` ON `tbl_image_records` (`encounteruuid`);--> statement-breakpoint
CREATE INDEX `idx_tbl_image_records_sync` ON `tbl_image_records` (`sync`);--> statement-breakpoint
CREATE TABLE `tbl_location` (
	`name` text,
	`locationuuid` text PRIMARY KEY NOT NULL,
	`retired` integer,
	`modified_date` text,
	`voided` integer DEFAULT 0 NOT NULL,
	`sync` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tbl_location_sync` ON `tbl_location` (`sync`);--> statement-breakpoint
CREATE TABLE `tbl_obs` (
	`uuid` text PRIMARY KEY NOT NULL,
	`encounteruuid` text,
	`conceptuuid` text,
	`value` text,
	`comment` text,
	`creator` text,
	`creatoruuid` text,
	`voided` integer DEFAULT 0 NOT NULL,
	`obsservermodifieddate` text,
	`modified_date` text,
	`created_date` text,
	`sync` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tbl_obs_encounteruuid` ON `tbl_obs` (`encounteruuid`);--> statement-breakpoint
CREATE INDEX `idx_tbl_obs_conceptuuid` ON `tbl_obs` (`conceptuuid`);--> statement-breakpoint
CREATE INDEX `idx_tbl_obs_sync` ON `tbl_obs` (`sync`);--> statement-breakpoint
CREATE TABLE `tbl_patient` (
	`uuid` text PRIMARY KEY NOT NULL,
	`openmrs_id` text,
	`first_name` text,
	`middle_name` text,
	`last_name` text,
	`date_of_birth` text,
	`phone_number` text,
	`address1` text,
	`address2` text,
	`city_village` text,
	`state_province` text,
	`postal_code` text,
	`country` text,
	`gender` text,
	`sdw` text,
	`creatoruuid` text,
	`occupation` text,
	`patient_photo` text,
	`economic_status` text,
	`education_status` text,
	`caste` text,
	`dead` text,
	`dateCreated` text,
	`modified_date` text,
	`voided` integer DEFAULT 0 NOT NULL,
	`sync` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tbl_patient_sync` ON `tbl_patient` (`sync`);--> statement-breakpoint
CREATE TABLE `tbl_patient_attribute` (
	`uuid` text PRIMARY KEY NOT NULL,
	`value` text,
	`person_attribute_type_uuid` text,
	`patientuuid` text,
	`modified_date` text,
	`voided` integer DEFAULT 0 NOT NULL,
	`sync` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tbl_patient_attribute_patientuuid` ON `tbl_patient_attribute` (`patientuuid`);--> statement-breakpoint
CREATE INDEX `idx_tbl_patient_attribute_sync` ON `tbl_patient_attribute` (`sync`);--> statement-breakpoint
CREATE TABLE `tbl_patient_attribute_master` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text,
	`modified_date` text,
	`voided` integer DEFAULT 0 NOT NULL,
	`sync` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tbl_patient_attribute_master_sync` ON `tbl_patient_attribute_master` (`sync`);--> statement-breakpoint
CREATE TABLE `tbl_provider` (
	`uuid` text PRIMARY KEY NOT NULL,
	`identifier` text,
	`given_name` text,
	`family_name` text,
	`role` text,
	`useruuid` text,
	`voided` integer DEFAULT 0 NOT NULL,
	`modified_date` text,
	`sync` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tbl_provider_sync` ON `tbl_provider` (`sync`);--> statement-breakpoint
CREATE TABLE `tbl_provider_attribute` (
	`uuid` text PRIMARY KEY NOT NULL,
	`provideruuid` text,
	`attributetypeuuid` text,
	`value` text,
	`voided` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tbl_provider_attribute_provideruuid` ON `tbl_provider_attribute` (`provideruuid`);--> statement-breakpoint
CREATE TABLE `tbl_rtc_connection_log` (
	`uuid` text PRIMARY KEY NOT NULL,
	`visit_uuid` text,
	`connection_info` text
);
--> statement-breakpoint
CREATE INDEX `idx_tbl_rtc_connection_log_visit_uuid` ON `tbl_rtc_connection_log` (`visit_uuid`);--> statement-breakpoint
CREATE TABLE `tbl_user_credentials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text,
	`password` text,
	`creator_uuid_cred` text,
	`chwname` text,
	`provider_uuid_cred` text
);
--> statement-breakpoint
CREATE TABLE `tbl_uuid_dictionary` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text
);
--> statement-breakpoint
CREATE TABLE `tbl_visit` (
	`uuid` text PRIMARY KEY NOT NULL,
	`patientuuid` text,
	`startdate` text,
	`enddate` text,
	`visit_type_uuid` text,
	`locationuuid` text,
	`creator` text,
	`modified_date` text,
	`isdownloaded` text DEFAULT 'false' NOT NULL,
	`voided` integer DEFAULT 0 NOT NULL,
	`sync` integer DEFAULT false NOT NULL,
	`issubmitted` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tbl_visit_patientuuid` ON `tbl_visit` (`patientuuid`);--> statement-breakpoint
CREATE INDEX `idx_tbl_visit_locationuuid` ON `tbl_visit` (`locationuuid`);--> statement-breakpoint
CREATE INDEX `idx_tbl_visit_sync` ON `tbl_visit` (`sync`);--> statement-breakpoint
CREATE TABLE `tbl_visit_attribute` (
	`uuid` text PRIMARY KEY NOT NULL,
	`visit_uuid` text,
	`value` text,
	`visit_attribute_type_uuid` text,
	`voided` integer DEFAULT 0 NOT NULL,
	`sync` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tbl_visit_attribute_visit_uuid` ON `tbl_visit_attribute` (`visit_uuid`);--> statement-breakpoint
CREATE INDEX `idx_tbl_visit_attribute_sync` ON `tbl_visit_attribute` (`sync`);