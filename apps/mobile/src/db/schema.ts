import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [

    tableSchema({
      name: 'tbl_patient',
      columns: [
        { name: 'uuid',             type: 'string' },   // uuid column from Android
        { name: 'openmrs_id',       type: 'string', isOptional: true },
        { name: 'first_name',       type: 'string', isOptional: true },
        { name: 'middle_name',      type: 'string', isOptional: true },
        { name: 'last_name',        type: 'string', isOptional: true },
        { name: 'date_of_birth',    type: 'string', isOptional: true },
        { name: 'phone_number',     type: 'string', isOptional: true },
        { name: 'address1',         type: 'string', isOptional: true },
        { name: 'address2',         type: 'string', isOptional: true },
        { name: 'city_village',     type: 'string', isOptional: true },
        { name: 'state_province',   type: 'string', isOptional: true },
        { name: 'postal_code',      type: 'string', isOptional: true },
        { name: 'country',          type: 'string', isOptional: true },
        { name: 'gender',           type: 'string', isOptional: true },
        { name: 'sdw',              type: 'string', isOptional: true },
        { name: 'creatoruuid',      type: 'string', isOptional: true },
        { name: 'occupation',       type: 'string', isOptional: true },
        { name: 'patient_photo',    type: 'string', isOptional: true },
        { name: 'economic_status',  type: 'string', isOptional: true },
        { name: 'education_status', type: 'string', isOptional: true },
        { name: 'caste',            type: 'string', isOptional: true },
        { name: 'dead',             type: 'string', isOptional: true },
        { name: 'dateCreated',      type: 'string', isOptional: true },
        { name: 'modified_date',    type: 'string', isOptional: true },
        { name: 'voided',           type: 'string' },   // DEFAULT '0'
        { name: 'sync',             type: 'string' },   // DEFAULT 'false'
      ],
    }),

    tableSchema({
      name: 'tbl_patient_attribute',
      columns: [
        { name: 'uuid',                        type: 'string' },   // uuid column from Android
        { name: 'value',                       type: 'string', isOptional: true },
        { name: 'person_attribute_type_uuid',  type: 'string', isOptional: true },
        { name: 'patientuuid',                 type: 'string', isOptional: true },
        { name: 'modified_date',               type: 'string', isOptional: true },
        { name: 'voided',                      type: 'string' },
        { name: 'sync',                        type: 'string' },
      ],
    }),

    tableSchema({
      name: 'tbl_patient_attribute_master',
      columns: [
        { name: 'uuid',          type: 'string' },   // uuid column from Android
        { name: 'name',          type: 'string', isOptional: true },
        { name: 'modified_date', type: 'string', isOptional: true },
        { name: 'voided',        type: 'string' },
        { name: 'sync',          type: 'string' },
      ],
    }),

    tableSchema({
      name: 'tbl_visit',
      columns: [
        { name: 'uuid',            type: 'string' },   // uuid column from Android
        { name: 'patientuuid',     type: 'string', isOptional: true },
        { name: 'startdate',       type: 'string', isOptional: true },
        { name: 'enddate',         type: 'string', isOptional: true },
        { name: 'visit_type_uuid', type: 'string', isOptional: true },
        { name: 'locationuuid',    type: 'string', isOptional: true },
        { name: 'creator',         type: 'string', isOptional: true },
        { name: 'modified_date',   type: 'string', isOptional: true },
        { name: 'isdownloaded',    type: 'string' },   // DEFAULT 'false'
        { name: 'voided',          type: 'string' },   // DEFAULT '0'
        { name: 'sync',            type: 'string' },   // DEFAULT 'false'
        { name: 'issubmitted',     type: 'number' },   // Integer DEFAULT 0
      ],
    }),

    tableSchema({
      name: 'tbl_visit_attribute',
      columns: [
        { name: 'uuid',                      type: 'string' },   // uuid column from Android
        { name: 'visit_uuid',                type: 'string', isOptional: true },
        { name: 'value',                     type: 'string', isOptional: true },
        { name: 'visit_attribute_type_uuid', type: 'string', isOptional: true },
        { name: 'voided',                    type: 'string', isOptional: true },
        { name: 'sync',                      type: 'string', isOptional: true },
      ],
    }),

    tableSchema({
      name: 'tbl_encounter',
      columns: [
        { name: 'uuid',                type: 'string' },   // uuid column from Android
        { name: 'visituuid',           type: 'string', isOptional: true },
        { name: 'encounter_time',      type: 'string', isOptional: true },
        { name: 'provider_uuid',       type: 'string', isOptional: true },
        { name: 'encounter_type_uuid', type: 'string', isOptional: true },
        { name: 'modified_date',       type: 'string', isOptional: true },
        { name: 'sync',                type: 'string' },   // DEFAULT 'false'
        { name: 'voided',              type: 'string' },   // DEFAULT '0'
        { name: 'privacynotice_value', type: 'string', isOptional: true },
      ],
    }),

    tableSchema({
      name: 'tbl_obs',
      columns: [
        { name: 'uuid',                   type: 'string' },   // uuid column from Android
        { name: 'encounteruuid',         type: 'string', isOptional: true },
        { name: 'conceptuuid',           type: 'string', isOptional: true },
        { name: 'value',                 type: 'string', isOptional: true },
        { name: 'comment',              type: 'string', isOptional: true },
        { name: 'creator',              type: 'string', isOptional: true },
        { name: 'creatoruuid',          type: 'string', isOptional: true },
        { name: 'voided',               type: 'string' },   // DEFAULT '0'
        { name: 'obsservermodifieddate', type: 'string', isOptional: true },
        { name: 'modified_date',         type: 'string', isOptional: true },
        { name: 'created_date',          type: 'string', isOptional: true },
        { name: 'sync',                  type: 'string' },   // DEFAULT 'false'
      ],
    }),

    // All the facility locations will be added in this table, and as per the
    // location selected in the visit table, will insert the location uuid.
    tableSchema({
      name: 'tbl_location',
      columns: [
        { name: 'name',          type: 'string', isOptional: true },
        { name: 'locationuuid',  type: 'string' },   // uuid column from Android
        { name: 'retired',       type: 'number', isOptional: true },   // integer(10)
        { name: 'modified_date', type: 'string', isOptional: true },
        { name: 'voided',        type: 'string' },
        { name: 'sync',          type: 'string' },
      ],
    }),

    tableSchema({
      name: 'tbl_provider',
      columns: [
        { name: 'uuid',          type: 'string' },   // uuid column from Android
        { name: 'identifier',    type: 'string', isOptional: true },
        { name: 'given_name',    type: 'string', isOptional: true },
        { name: 'family_name',   type: 'string', isOptional: true },
        { name: 'role',          type: 'string', isOptional: true },
        { name: 'useruuid',      type: 'string', isOptional: true },
        { name: 'voided',        type: 'string' },
        { name: 'modified_date', type: 'string', isOptional: true },
        { name: 'sync',          type: 'string' },
      ],
    }),

    tableSchema({
      name: 'tbl_provider_attribute',
      columns: [
        { name: 'uuid',              type: 'string' },   // uuid column from Android
        { name: 'provideruuid',      type: 'string', isOptional: true },
        { name: 'attributetypeuuid', type: 'string', isOptional: true },
        { name: 'value',             type: 'string', isOptional: true },
        { name: 'voided',            type: 'string', isOptional: true },
      ],
    }),

    tableSchema({
      name: 'tbl_dr_speciality',
      columns: [
        { name: 'uuid',              type: 'string' },   // uuid column from Android
        { name: 'provideruuid',      type: 'string', isOptional: true },
        { name: 'attributetypeuuid', type: 'string', isOptional: true },
        { name: 'value',             type: 'string', isOptional: true },   // UNIQUE in Android
        { name: 'voided',            type: 'string', isOptional: true },
      ],
    }),

    tableSchema({
      name: 'tbl_uuid_dictionary',
      columns: [
        { name: 'uuid', type: 'string' },   // uuid column from Android
        { name: 'name', type: 'string', isOptional: true },
      ],
    }),

    tableSchema({
      name: 'tbl_image_records',
      columns: [
        { name: 'uuid',           type: 'string' },   // uuid column from Android
        { name: 'patientuuid',    type: 'string', isOptional: true },
        { name: 'visituuid',      type: 'string', isOptional: true },
        { name: 'encounteruuid',  type: 'string', isOptional: true },
        { name: 'image_path',     type: 'string', isOptional: true },
        { name: 'obs_time_date',  type: 'string', isOptional: true },
        { name: 'image_type',     type: 'string', isOptional: true },
        { name: 'voided',         type: 'string' },
        { name: 'sync',           type: 'string' },
      ],
    }),

    // No uuid PK in Android — WatermelonDB auto-generates id
    tableSchema({
      name: 'tbl_user_credentials',
      columns: [
        { name: 'username',           type: 'string', isOptional: true },
        { name: 'password',           type: 'string', isOptional: true },   // UNIQUE in Android
        { name: 'creator_uuid_cred',  type: 'string', isOptional: true },
        { name: 'chwname',            type: 'string', isOptional: true },
        { name: 'provider_uuid_cred', type: 'string', isOptional: true },
      ],
    }),

    tableSchema({
      name: 'tbl_rtc_connection_log',
      columns: [
        { name: 'uuid',            type: 'string' },   // uuid column from Android
        { name: 'visit_uuid',      type: 'string', isOptional: true },
        { name: 'connection_info', type: 'string', isOptional: true },
      ],
    }),

  ],
});
