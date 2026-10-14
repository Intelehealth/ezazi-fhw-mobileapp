import { eq } from 'drizzle-orm';

import {
  createPatient,
  getAttributeTypeUuid,
  getAttributeValue,
  getPatientHeader,
  listAttributes,
  listDirtyPatients,
  markPatientSynced,
  setPatientAttribute,
  updatePatient,
  updatePatientPhoto,
  upsertAttributeTypes,
  upsertPatientAttributes,
  upsertPatientAttributesFromServer,
  upsertPatients,
} from '../../repositories/patient';
import { patient, patientAttribute } from '../../schema';
import { SYNC_CLEAN, SYNC_DIRTY } from '../../syncFlags';
import { transact, type DbHandle } from '../../tx';
import { createTestDb, type TestDb } from '../helpers/testDb';

/**
 * Behaviour the legacy got wrong, or got right for non-obvious reasons. The
 * plain getters are not here — they are one `eq` each and a test of them only
 * restates the query.
 */

describe('patient repository', () => {
  let ctx: TestDb;
  let db: DbHandle;

  beforeEach(async () => {
    ctx = await createTestDb();
    db = ctx.db;
  });

  afterEach(() => ctx.close());

  const row = (uuid: string) =>
    ctx.db.select().from(patient).where(eq(patient.uuid, uuid)).get();
  const attributeRows = () => ctx.db.select().from(patientAttribute).all();

  describe('createPatient', () => {
    it('writes the patient row dirty, so the next push sends it', () => {
      createPatient('p1', { first_name: 'Asha', last_name: 'Devi' }, db);

      expect(row('p1')).toMatchObject({ first_name: 'Asha', sync: SYNC_DIRTY });
    });

    it('writes no attribute rows — they are a separate call', () => {
      // The legacy hid an attribute write inside this path via the DTO.
      createPatient('p1', { first_name: 'Asha' }, db);

      expect(attributeRows()).toEqual([]);
    });

    it('hardcodes gender, a write-side constant of this path', () => {
      createPatient('p1', { first_name: 'Asha' }, db);

      expect(row('p1')?.gender).toBe('F');
    });
  });

  describe('updatePatient', () => {
    it('forces dead to 0, unlike createPatient which honours the input', () => {
      // A real difference between the legacy create and edit paths.
      createPatient('p1', { first_name: 'Asha', dead: '1' }, db);
      updatePatient('p1', { first_name: 'Asha' }, db);

      expect(row('p1')?.dead).toBe('0');
    });

    it('marks the row dirty again', () => {
      createPatient('p1', { first_name: 'Asha' }, db);
      markPatientSynced('p1', 'EZ-1', SYNC_CLEAN, db);
      updatePatient('p1', { first_name: 'Asha Kumari' }, db);

      expect(row('p1')).toMatchObject({ first_name: 'Asha Kumari', sync: SYNC_DIRTY });
    });
  });

  describe('upsertPatients (pull path)', () => {
    it('does not reset columns the server omitted', () => {
      // SQLite REPLACE is DELETE+INSERT, so an omitted column would revert to
      // its DDL default. That is how the legacy silently un-voids a visit.
      upsertPatients([{ uuid: 'p1', first_name: 'Asha', voided: 1 }], db);
      upsertPatients([{ uuid: 'p1', first_name: 'Asha Kumari' }], db);

      expect(row('p1')).toMatchObject({ first_name: 'Asha Kumari', voided: 1 });
    });

    it('stamps modified_date when WE write the row, not from the server', () => {
      // Arpan, 2026-10-12. All three pull writers in this file agree now; this
      // one kept the server's value until the inconsistency was spotted.
      upsertPatients([{ uuid: 'p1', modified_date: '2020-01-01' }], db);

      expect(row('p1')?.modified_date).not.toBe('2020-01-01');
      expect(row('p1')?.modified_date).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{4}$/,
      );
    });

    it('writes pulled rows clean, so they are not pushed straight back', () => {
      upsertPatients([{ uuid: 'p1', first_name: 'Asha' }], db);

      expect(row('p1')?.sync).toBe(SYNC_CLEAN);
    });
  });

  describe('attribute writes', () => {
    const attr = { uuid: 'a1', patientuuid: 'p1', person_attribute_type_uuid: 't1', value: 'x' };

    it('marks locally edited attributes dirty', () => {
      upsertPatientAttributes([attr], db);

      expect(attributeRows()[0]).toMatchObject({ sync: SYNC_DIRTY });
    });

    it('marks pulled attributes clean', () => {
      // The only difference between the two writers; collapsing them would
      // either push server data back or never push local edits.
      upsertPatientAttributesFromServer([attr], db);

      expect(attributeRows()[0]).toMatchObject({ sync: SYNC_CLEAN });
    });
  });

  describe('setPatientAttribute', () => {
    it('reuses the existing row, so editing twice does not duplicate', () => {
      // The upsert keys on the row uuid, not on (patient, type) — minting a
      // fresh uuid each edit is how the legacy grew duplicate attribute rows.
      setPatientAttribute('p1', 't1', 'first', db);
      setPatientAttribute('p1', 't1', 'second', db);

      const rows = attributeRows();
      expect(rows).toHaveLength(1);
      expect(rows[0].value).toBe('second');
    });

    it('keeps different attribute types apart', () => {
      setPatientAttribute('p1', 't1', 'one', db);
      setPatientAttribute('p1', 't2', 'two', db);

      expect(attributeRows()).toHaveLength(2);
    });
  });

  describe('markPatientSynced', () => {
    it('applies the server id and clears the dirty flag', () => {
      createPatient('p1', { first_name: 'Asha' }, db);
      markPatientSynced('p1', 'EZ-10517', SYNC_CLEAN, db);

      expect(row('p1')).toMatchObject({ openmrs_id: 'EZ-10517', sync: SYNC_CLEAN });
    });
  });

  describe('updatePatientPhoto', () => {
    it('does NOT mark the row dirty — legacy behaviour, kept deliberately', () => {
      // Consequence: a photo change alone is never pushed. Documented, not fixed.
      createPatient('p1', { first_name: 'Asha' }, db);
      markPatientSynced('p1', 'EZ-1', SYNC_CLEAN, db);
      updatePatientPhoto('p1', '/images/p1.jpg', db);

      expect(row('p1')).toMatchObject({ patient_photo: '/images/p1.jpg', sync: SYNC_CLEAN });
    });
  });

  describe('reads', () => {
    it('lists only dirty patients', () => {
      createPatient('dirty', { first_name: 'A' }, db);
      upsertPatients([{ uuid: 'clean', first_name: 'B' }], db);

      expect(listDirtyPatients(db).map((p) => p.uuid)).toEqual(['dirty']);
    });

    it('resolves an attribute type by name, ignoring case', () => {
      // The legacy matched COLLATE NOCASE; callers pass inconsistent casing.
      upsertAttributeTypes([{ uuid: 't1', name: 'Bed Number' }], db);

      expect(getAttributeTypeUuid('bed number', db)).toBe('t1');
      expect(getAttributeTypeUuid('BED NUMBER', db)).toBe('t1');
    });

    it('returns null for an unknown attribute name rather than an empty uuid', () => {
      // Legacy returned "", which wrote attribute rows with a blank type uuid.
      expect(getAttributeTypeUuid('nope', db)).toBeNull();
      expect(getAttributeValue('p1', 'nope', db)).toBeNull();
    });

    it('reads an attribute value through its type name', () => {
      upsertAttributeTypes([{ uuid: 't1', name: 'Bed Number' }], db);
      setPatientAttribute('p1', 't1', '12B', db);

      expect(getAttributeValue('p1', 'Bed Number', db)).toBe('12B');
    });

    it('returns every attribute row, voided included, as the push expects', () => {
      upsertPatientAttributes(
        [
          { uuid: 'a1', patientuuid: 'p1', person_attribute_type_uuid: 't1', value: 'x' },
          { uuid: 'a2', patientuuid: 'p2', person_attribute_type_uuid: 't1', value: 'y' },
        ],
        db,
      );

      expect(listAttributes('p1', db).map((a) => a.uuid)).toEqual(['a1']);
    });

    it('omits bed number from the header — this app stores it as an obs', () => {
      createPatient('p1', { first_name: 'Asha', last_name: 'Devi' }, db);

      expect(Object.keys(getPatientHeader('p1', db) ?? {}).sort()).toEqual([
        'first_name',
        'last_name',
        'middle_name',
        'openmrs_id',
      ]);
    });

    it('returns null rather than throwing for a patient that is not there', () => {
      expect(getPatientHeader('ghost', db)).toBeNull();
    });
  });

  describe('composed in one transaction', () => {
    it('writes the patient and its attributes together', () => {
      transact((tx) => {
        createPatient('p1', { first_name: 'Asha' }, tx);
        setPatientAttribute('p1', 't1', '12B', tx);
      }, db);

      expect(row('p1')).toBeDefined();
      expect(attributeRows()).toHaveLength(1);
    });

    it('rolls the patient back when the attribute write fails', () => {
      // The reason these are separate functions rather than one: the caller
      // owns the boundary, and a half-written patient must not survive.
      expect(() =>
        transact((tx) => {
          createPatient('p1', { first_name: 'Asha' }, tx);
          setPatientAttribute('p1', 't1', '12B', tx);
          throw new Error('later step failed');
        }, db),
      ).toThrow('later step failed');

      expect(row('p1')).toBeUndefined();
      expect(attributeRows()).toEqual([]);
    });
  });
});
