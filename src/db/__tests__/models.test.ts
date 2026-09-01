import Patient             from '../models/Patient';
import PatientAttribute    from '../models/PatientAttribute';
import PatientAttributeMaster from '../models/PatientAttributeMaster';
import Visit               from '../models/Visit';
import VisitAttribute      from '../models/VisitAttribute';
import Encounter           from '../models/Encounter';
import Obs                 from '../models/Obs';
import Location            from '../models/Location';
import Provider            from '../models/Provider';
import ProviderAttribute   from '../models/ProviderAttribute';
import DrSpeciality        from '../models/DrSpeciality';
import UuidDictionary      from '../models/UuidDictionary';
import ImageRecord         from '../models/ImageRecord';
import UserCredentials     from '../models/UserCredentials';
import RtcConnectionLog    from '../models/RtcConnectionLog';
import { modelClasses }    from '../models';

describe('WatermelonDB Model Classes', () => {
  describe('modelClasses barrel', () => {
    it('exports exactly 15 model classes', () => {
      expect(modelClasses).toHaveLength(15);
    });

    it('contains all expected model classes', () => {
      const tables = modelClasses.map((m) => m.table);
      const expected = [
        'tbl_patient', 'tbl_patient_attribute', 'tbl_patient_attribute_master',
        'tbl_visit', 'tbl_visit_attribute', 'tbl_encounter', 'tbl_obs',
        'tbl_location', 'tbl_provider', 'tbl_provider_attribute',
        'tbl_dr_speciality', 'tbl_uuid_dictionary', 'tbl_image_records',
        'tbl_user_credentials', 'tbl_rtc_connection_log',
      ];
      expected.forEach((t) => expect(tables).toContain(t));
    });
  });

  describe('Patient', () => {
    it('maps to tbl_patient', () => {
      expect(Patient.table).toBe('tbl_patient');
    });

    it('has has_many associations for attribute, visit, imageRecords', () => {
      expect(Patient.associations['tbl_patient_attribute'].type).toBe('has_many');
      expect(Patient.associations['tbl_patient_attribute'].foreignKey).toBe('patientuuid');
      expect(Patient.associations['tbl_visit'].type).toBe('has_many');
      expect(Patient.associations['tbl_visit'].foreignKey).toBe('patientuuid');
      expect(Patient.associations['tbl_image_records'].type).toBe('has_many');
      expect(Patient.associations['tbl_image_records'].foreignKey).toBe('patientuuid');
    });
  });

  describe('PatientAttribute', () => {
    it('maps to tbl_patient_attribute', () => {
      expect(PatientAttribute.table).toBe('tbl_patient_attribute');
    });

    it('belongs_to Patient via patientuuid', () => {
      expect(PatientAttribute.associations['tbl_patient'].type).toBe('belongs_to');
      expect(PatientAttribute.associations['tbl_patient'].key).toBe('patientuuid');
    });
  });

  describe('PatientAttributeMaster', () => {
    it('maps to tbl_patient_attribute_master', () => {
      expect(PatientAttributeMaster.table).toBe('tbl_patient_attribute_master');
    });

    it('has no associations (standalone)', () => {
      expect(PatientAttributeMaster.associations).toEqual({});
    });
  });

  describe('Visit', () => {
    it('maps to tbl_visit', () => {
      expect(Visit.table).toBe('tbl_visit');
    });

    it('belongs_to Patient via patientuuid', () => {
      expect(Visit.associations['tbl_patient'].type).toBe('belongs_to');
      expect(Visit.associations['tbl_patient'].key).toBe('patientuuid');
    });

    it('belongs_to Location via locationuuid', () => {
      expect(Visit.associations['tbl_location'].type).toBe('belongs_to');
      expect(Visit.associations['tbl_location'].key).toBe('locationuuid');
    });

    it('has_many VisitAttribute via visit_uuid', () => {
      expect(Visit.associations['tbl_visit_attribute'].type).toBe('has_many');
      expect(Visit.associations['tbl_visit_attribute'].foreignKey).toBe('visit_uuid');
    });

    it('has_many Encounter via visituuid', () => {
      expect(Visit.associations['tbl_encounter'].type).toBe('has_many');
      expect(Visit.associations['tbl_encounter'].foreignKey).toBe('visituuid');
    });
  });

  describe('VisitAttribute', () => {
    it('maps to tbl_visit_attribute', () => {
      expect(VisitAttribute.table).toBe('tbl_visit_attribute');
    });

    it('belongs_to Visit via visit_uuid', () => {
      expect(VisitAttribute.associations['tbl_visit'].type).toBe('belongs_to');
      expect(VisitAttribute.associations['tbl_visit'].key).toBe('visit_uuid');
    });
  });

  describe('Encounter', () => {
    it('maps to tbl_encounter', () => {
      expect(Encounter.table).toBe('tbl_encounter');
    });

    it('belongs_to Visit via visituuid', () => {
      expect(Encounter.associations['tbl_visit'].type).toBe('belongs_to');
      expect(Encounter.associations['tbl_visit'].key).toBe('visituuid');
    });

    it('has_many Obs via encounteruuid', () => {
      expect(Encounter.associations['tbl_obs'].type).toBe('has_many');
      expect(Encounter.associations['tbl_obs'].foreignKey).toBe('encounteruuid');
    });
  });

  describe('Obs', () => {
    it('maps to tbl_obs', () => {
      expect(Obs.table).toBe('tbl_obs');
    });

    it('belongs_to Encounter via encounteruuid', () => {
      expect(Obs.associations['tbl_encounter'].type).toBe('belongs_to');
      expect(Obs.associations['tbl_encounter'].key).toBe('encounteruuid');
    });
  });

  describe('Location', () => {
    it('maps to tbl_location', () => {
      expect(Location.table).toBe('tbl_location');
    });

    it('has no associations (standalone)', () => {
      expect(Location.associations).toEqual({});
    });
  });

  describe('Provider', () => {
    it('maps to tbl_provider', () => {
      expect(Provider.table).toBe('tbl_provider');
    });

    it('has_many ProviderAttribute via provideruuid', () => {
      expect(Provider.associations['tbl_provider_attribute'].type).toBe('has_many');
      expect(Provider.associations['tbl_provider_attribute'].foreignKey).toBe('provideruuid');
    });

    it('has_many DrSpeciality via provideruuid', () => {
      expect(Provider.associations['tbl_dr_speciality'].type).toBe('has_many');
      expect(Provider.associations['tbl_dr_speciality'].foreignKey).toBe('provideruuid');
    });
  });

  describe('ProviderAttribute', () => {
    it('maps to tbl_provider_attribute', () => {
      expect(ProviderAttribute.table).toBe('tbl_provider_attribute');
    });

    it('belongs_to Provider via provideruuid', () => {
      expect(ProviderAttribute.associations['tbl_provider'].type).toBe('belongs_to');
      expect(ProviderAttribute.associations['tbl_provider'].key).toBe('provideruuid');
    });
  });

  describe('DrSpeciality', () => {
    it('maps to tbl_dr_speciality', () => {
      expect(DrSpeciality.table).toBe('tbl_dr_speciality');
    });

    it('belongs_to Provider via provideruuid', () => {
      expect(DrSpeciality.associations['tbl_provider'].type).toBe('belongs_to');
      expect(DrSpeciality.associations['tbl_provider'].key).toBe('provideruuid');
    });
  });

  describe('UuidDictionary', () => {
    it('maps to tbl_uuid_dictionary', () => {
      expect(UuidDictionary.table).toBe('tbl_uuid_dictionary');
    });

    it('has no associations (standalone seed table)', () => {
      expect(UuidDictionary.associations).toEqual({});
    });
  });

  describe('ImageRecord', () => {
    it('maps to tbl_image_records', () => {
      expect(ImageRecord.table).toBe('tbl_image_records');
    });

    it('belongs_to Patient via patientuuid', () => {
      expect(ImageRecord.associations['tbl_patient'].type).toBe('belongs_to');
      expect(ImageRecord.associations['tbl_patient'].key).toBe('patientuuid');
    });
  });

  describe('UserCredentials', () => {
    it('maps to tbl_user_credentials', () => {
      expect(UserCredentials.table).toBe('tbl_user_credentials');
    });

    it('has no associations (standalone local table)', () => {
      expect(UserCredentials.associations).toEqual({});
    });
  });

  describe('RtcConnectionLog', () => {
    it('maps to tbl_rtc_connection_log', () => {
      expect(RtcConnectionLog.table).toBe('tbl_rtc_connection_log');
    });

    it('has no associations (standalone local table)', () => {
      expect(RtcConnectionLog.associations).toEqual({});
    });
  });
});
