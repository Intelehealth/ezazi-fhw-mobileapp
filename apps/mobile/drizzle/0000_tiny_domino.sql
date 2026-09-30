CREATE TABLE `tbl_dr_speciality` (
	`uuid` text PRIMARY KEY NOT NULL,
	`provideruuid` text,
	`attributetypeuuid` text,
	`value` text,
	`voided` text
);
--> statement-breakpoint
CREATE TABLE `tbl_encounter` (
	`uuid` text PRIMARY KEY NOT NULL,
	`visituuid` text,
	`encounter_time` text,
	`provider_uuid` text,
	`encounter_type_uuid` text,
	`modified_date` text,
	`sync` text DEFAULT 'false' NOT NULL,
	`voided` text DEFAULT '0' NOT NULL,
	`privacynotice_value` text
);
--> statement-breakpoint
CREATE TABLE `tbl_image_records` (
	`uuid` text PRIMARY KEY NOT NULL,
	`patientuuid` text,
	`visituuid` text,
	`encounteruuid` text,
	`image_path` text,
	`obs_time_date` text,
	`image_type` text,
	`voided` text DEFAULT '0' NOT NULL,
	`sync` text DEFAULT 'false' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tbl_location` (
	`name` text,
	`locationuuid` text PRIMARY KEY NOT NULL,
	`retired` integer,
	`modified_date` text,
	`voided` text DEFAULT '0' NOT NULL,
	`sync` text DEFAULT 'false' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tbl_obs` (
	`uuid` text PRIMARY KEY NOT NULL,
	`encounteruuid` text,
	`conceptuuid` text,
	`value` text,
	`comment` text,
	`creator` text,
	`creatoruuid` text,
	`voided` text DEFAULT '0' NOT NULL,
	`obsservermodifieddate` text,
	`modified_date` text,
	`created_date` text,
	`sync` text DEFAULT 'false' NOT NULL
);
--> statement-breakpoint
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
	`voided` text DEFAULT '0' NOT NULL,
	`sync` text DEFAULT 'false' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tbl_patient_attribute` (
	`uuid` text PRIMARY KEY NOT NULL,
	`value` text,
	`person_attribute_type_uuid` text,
	`patientuuid` text,
	`modified_date` text,
	`voided` text DEFAULT '0' NOT NULL,
	`sync` text DEFAULT 'false' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tbl_patient_attribute_master` (
	`uuid` text PRIMARY KEY NOT NULL,
	`name` text,
	`modified_date` text,
	`voided` text DEFAULT '0' NOT NULL,
	`sync` text DEFAULT 'false' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tbl_provider` (
	`uuid` text PRIMARY KEY NOT NULL,
	`identifier` text,
	`given_name` text,
	`family_name` text,
	`role` text,
	`useruuid` text,
	`voided` text DEFAULT '0' NOT NULL,
	`modified_date` text,
	`sync` text DEFAULT 'false' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tbl_provider_attribute` (
	`uuid` text PRIMARY KEY NOT NULL,
	`provideruuid` text,
	`attributetypeuuid` text,
	`value` text,
	`voided` text
);
--> statement-breakpoint
CREATE TABLE `tbl_rtc_connection_log` (
	`uuid` text PRIMARY KEY NOT NULL,
	`visit_uuid` text,
	`connection_info` text
);
--> statement-breakpoint
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
	`voided` text DEFAULT '0' NOT NULL,
	`sync` text DEFAULT 'false' NOT NULL,
	`issubmitted` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tbl_visit_attribute` (
	`uuid` text PRIMARY KEY NOT NULL,
	`visit_uuid` text,
	`value` text,
	`visit_attribute_type_uuid` text,
	`voided` text,
	`sync` text
);
