import { schema } from '../schema';

// All 15 expected tables (tbl_appointments removed)
const EXPECTED_TABLES = [
  'tbl_patient',
  'tbl_patient_attribute',
  'tbl_patient_attribute_master',
  'tbl_visit',
  'tbl_visit_attribute',
  'tbl_encounter',
  'tbl_obs',
  'tbl_location',
  'tbl_provider',
  'tbl_provider_attribute',
  'tbl_dr_speciality',
  'tbl_uuid_dictionary',
  'tbl_image_records',
  'tbl_user_credentials',
  'tbl_rtc_connection_log',
];

describe('WatermelonDB Schema', () => {
  it('is schema version 1', () => {
    expect(schema.version).toBe(1);
  });

  it('has exactly 15 tables', () => {
    expect(Object.keys(schema.tables).length).toBe(15);
  });

  it.each(EXPECTED_TABLES)('table %s exists', (tableName) => {
    expect(schema.tables[tableName]).toBeDefined();
  });

  describe('tbl_patient columns', () => {
    const cols = schema.tables['tbl_patient'].columns;
    const names = () => Object.keys(cols);

    it('has all 26 Android columns', () => {
      const expected = [
        'uuid', 'openmrs_id', 'first_name', 'middle_name', 'last_name',
        'date_of_birth', 'phone_number', 'address1', 'address2',
        'city_village', 'state_province', 'postal_code', 'country',
        'gender', 'sdw', 'creatoruuid', 'occupation', 'patient_photo',
        'economic_status', 'education_status', 'caste', 'dead',
        'dateCreated', 'modified_date', 'voided', 'sync',
      ];
      expected.forEach((col) => expect(names()).toContain(col));
    });

    it('voided and sync are non-optional strings', () => {
      expect(cols['voided'].type).toBe('string');
      expect(cols['voided'].isOptional).toBeFalsy();
      expect(cols['sync'].type).toBe('string');
      expect(cols['sync'].isOptional).toBeFalsy();
    });
  });

  describe('tbl_visit columns', () => {
    const cols = schema.tables['tbl_visit'].columns;

    it('has issubmitted as number', () => {
      expect(cols['issubmitted'].type).toBe('number');
      expect(cols['issubmitted'].isOptional).toBeFalsy();
    });

    it('has patientuuid and locationuuid', () => {
      expect(cols['patientuuid']).toBeDefined();
      expect(cols['locationuuid']).toBeDefined();
    });

    it('has isdownloaded as non-optional string', () => {
      expect(cols['isdownloaded'].type).toBe('string');
      expect(cols['isdownloaded'].isOptional).toBeFalsy();
    });
  });

  describe('tbl_encounter columns', () => {
    const cols = schema.tables['tbl_encounter'].columns;

    it('has visituuid, provider_uuid, encounter_type_uuid', () => {
      expect(cols['visituuid']).toBeDefined();
      expect(cols['provider_uuid']).toBeDefined();
      expect(cols['encounter_type_uuid']).toBeDefined();
    });

    it('has privacynotice_value', () => {
      expect(cols['privacynotice_value']).toBeDefined();
    });
  });

  describe('tbl_obs columns', () => {
    const cols = schema.tables['tbl_obs'].columns;

    it('has encounteruuid and conceptuuid', () => {
      expect(cols['encounteruuid']).toBeDefined();
      expect(cols['conceptuuid']).toBeDefined();
    });

    it('has obsservermodifieddate (exact Android spelling)', () => {
      expect(cols['obsservermodifieddate']).toBeDefined();
    });

    it('has created_date', () => {
      expect(cols['created_date']).toBeDefined();
    });
  });

  describe('tbl_location columns', () => {
    const cols = schema.tables['tbl_location'].columns;

    it('has retired as number (integer(10) in Android)', () => {
      expect(cols['retired'].type).toBe('number');
    });

    it('has a locationuuid column (Android PRIMARY KEY)', () => {
      expect(cols['locationuuid']).toBeDefined();
    });
  });

  describe('tbl_provider columns', () => {
    const cols = schema.tables['tbl_provider'].columns;

    it('has identifier, given_name, family_name, role, useruuid', () => {
      ['identifier', 'given_name', 'family_name', 'role', 'useruuid'].forEach(
        (col) => expect(cols[col]).toBeDefined(),
      );
    });
  });

  describe('tbl_uuid_dictionary columns', () => {
    const cols = schema.tables['tbl_uuid_dictionary'].columns;

    it('has uuid (Android PRIMARY KEY) and name columns', () => {
      expect(cols['name']).toBeDefined();
      expect(cols['uuid']).toBeDefined();
    });
  });

  describe('tbl_user_credentials columns', () => {
    const cols = schema.tables['tbl_user_credentials'].columns;

    it('has username, password, creator_uuid_cred, chwname, provider_uuid_cred', () => {
      ['username', 'password', 'creator_uuid_cred', 'chwname', 'provider_uuid_cred'].forEach(
        (col) => expect(cols[col]).toBeDefined(),
      );
    });
  });

  describe('tbl_image_records columns', () => {
    const cols = schema.tables['tbl_image_records'].columns;

    it('has patientuuid, visituuid, encounteruuid, image_path, obs_time_date, image_type', () => {
      ['patientuuid', 'visituuid', 'encounteruuid', 'image_path', 'obs_time_date', 'image_type'].forEach(
        (col) => expect(cols[col]).toBeDefined(),
      );
    });
  });

  describe('tbl_rtc_connection_log columns', () => {
    const cols = schema.tables['tbl_rtc_connection_log'].columns;

    it('has visit_uuid and connection_info', () => {
      expect(cols['visit_uuid']).toBeDefined();
      expect(cols['connection_info']).toBeDefined();
    });
  });
});
