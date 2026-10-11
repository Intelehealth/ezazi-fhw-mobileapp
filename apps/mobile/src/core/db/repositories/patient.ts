import { and, eq, sql } from 'drizzle-orm';

import { localIsoTimestamp } from '@/core/utils/datetime';

import { getDb } from '../index';
import { patient, patientAttribute, patientAttributeMaster } from '../schema';
import type { Patient, PatientAttribute } from '../schema';
import { SYNC_CLEAN, SYNC_DIRTY } from '../syncFlags';
import type { DbHandle } from '../tx';
import { newUuid } from '../uuid';

/**
 * `tbl_patient`, `tbl_patient_attribute` and `tbl_patient_attribute_master`.
 * Every function is synchronous and takes an optional handle, so it runs alone
 * or joins a caller's transaction — see `tx.ts`. Returns rows, never payload
 * shapes: push/pull field names belong to the sync mapper, not here.
 * The 15 admission values are NOT attributes in this app; see `repositories/obs`.
 */

/** Columns a caller supplies. The repository owns uuid, sync and modified_date. */
export type PatientInput = Omit<typeof patient.$inferInsert, 'uuid' | 'sync' | 'modified_date'>;

/** The edit path cannot set dateCreated — the legacy omits it deliberately. */
export type PatientUpdate = Omit<PatientInput, 'dateCreated'>;

/** A full row as the server sends it, for the pull path. */
export type PatientUpsert = typeof patient.$inferInsert;

export interface PatientAttributeInput {
  uuid: string;
  patientuuid: string;
  person_attribute_type_uuid: string;
  value: string;
}

// ── writes ────────────────────────────────────────────────────────────────

/**
 * Local CREATE. Writes the patient row only — attributes are a separate call,
 * and the parent must exist first. Wrap both in `transact` when atomicity matters.
 */
export function createPatient(uuid: string, input: PatientInput, on: DbHandle = getDb()): void {
  on.insert(patient)
    .values({
      ...input,
      uuid,
      // Write-side constant of this path. Never read it back from a form.
      gender: 'F',
      modified_date: localIsoTimestamp(),
      sync: SYNC_DIRTY,
    })
    .run();
}

/**
 * Local EDIT. Unlike `createPatient` this forces `dead` to 0, and the type
 * excludes `dateCreated` — a real difference between the legacy create and edit
 * paths, preserved rather than normalised.
 */
export function updatePatient(uuid: string, input: PatientUpdate, on: DbHandle = getDb()): void {
  on.update(patient)
    .set({ ...input, gender: 'F', dead: '0', modified_date: localIsoTimestamp(), sync: SYNC_DIRTY })
    .where(eq(patient.uuid, uuid))
    .run();
}

/**
 * Pull-path bulk write. Explicit column set on conflict, never a whole-row
 * replace: SQLite REPLACE is DELETE+INSERT, so any column the server omits
 * would silently revert to its DDL default.
 */
export function upsertPatients(rows: PatientUpsert[], on: DbHandle = getDb()): void {
  for (const row of rows) {
    on.insert(patient)
      .values({ ...row, sync: SYNC_CLEAN })
      .onConflictDoUpdate({ target: patient.uuid, set: { ...row, sync: SYNC_CLEAN } })
      .run();
  }
}

/** Local attribute write. Marks rows dirty, so the next push sends them. */
export function upsertPatientAttributes(
  rows: PatientAttributeInput[],
  on: DbHandle = getDb(),
): void {
  writeAttributes(rows, SYNC_DIRTY, on);
}

/** Pull-path attribute write. Rows arrive already on the server, so clean. */
export function upsertPatientAttributesFromServer(
  rows: PatientAttributeInput[],
  on: DbHandle = getDb(),
): void {
  writeAttributes(rows, SYNC_CLEAN, on);
}

// The two differ only by the sync flag; collapsing them loses push/no-push.
function writeAttributes(rows: PatientAttributeInput[], sync: boolean, on: DbHandle): void {
  for (const row of rows) {
    const values = { ...row, modified_date: localIsoTimestamp(), sync };
    on.insert(patientAttribute)
      .values(values)
      .onConflictDoUpdate({ target: patientAttribute.uuid, set: values })
      .run();
  }
}

/** Pull-path write of the name-to-uuid lookup every attribute read depends on. */
export function upsertAttributeTypes(
  rows: { uuid: string; name: string }[],
  on: DbHandle = getDb(),
): void {
  for (const row of rows) {
    const values = { ...row, modified_date: localIsoTimestamp(), sync: SYNC_CLEAN };
    on.insert(patientAttributeMaster)
      .values(values)
      .onConflictDoUpdate({ target: patientAttributeMaster.uuid, set: values })
      .run();
  }
}

/**
 * Sets one attribute, reusing the existing row's uuid when there is one.
 * The upsert keys on the row uuid, not on (patient, type), so minting a fresh
 * uuid every edit would insert a duplicate instead of replacing.
 */
export function setPatientAttribute(
  patientUuid: string,
  attributeTypeUuid: string,
  value: string,
  on: DbHandle = getDb(),
): void {
  const existing = on
    .select({ uuid: patientAttribute.uuid })
    .from(patientAttribute)
    .where(
      and(
        eq(patientAttribute.patientuuid, patientUuid),
        eq(patientAttribute.person_attribute_type_uuid, attributeTypeUuid),
      ),
    )
    .get();

  upsertPatientAttributes(
    [
      {
        uuid: existing?.uuid ?? newUuid(),
        patientuuid: patientUuid,
        person_attribute_type_uuid: attributeTypeUuid,
        value,
      },
    ],
    on,
  );
}

/** Applies the server-assigned openmrs_id after a push, and clears the flag. */
export function markPatientSynced(
  uuid: string,
  openmrsId: string,
  synced: boolean,
  on: DbHandle = getDb(),
): void {
  on.update(patient)
    .set({ openmrs_id: openmrsId, sync: synced })
    .where(eq(patient.uuid, uuid))
    .run();
}

/**
 * Stores a filesystem path, not image data. Deliberately does NOT mark the row
 * dirty — legacy behaviour, so a photo change alone is never pushed.
 */
export function updatePatientPhoto(uuid: string, photoPath: string, on: DbHandle = getDb()): void {
  on.update(patient).set({ patient_photo: photoPath }).where(eq(patient.uuid, uuid)).run();
}

// ── reads ─────────────────────────────────────────────────────────────────

/** Every attribute row, voided ones included — the push sends those too. */
export function listAttributes(patientUuid: string, on: DbHandle = getDb()): PatientAttribute[] {
  return on
    .select()
    .from(patientAttribute)
    .where(eq(patientAttribute.patientuuid, patientUuid))
    .all();
}

/**
 * Identity fields for a patient header. Bed number is NOT here — this app
 * records it as an obs under the Admission encounter, so read it from there.
 */
export function getPatientHeader(
  patientUuid: string,
  on: DbHandle = getDb(),
): Pick<Patient, 'openmrs_id' | 'first_name' | 'middle_name' | 'last_name'> | null {
  return (
    on
      .select({
        openmrs_id: patient.openmrs_id,
        first_name: patient.first_name,
        middle_name: patient.middle_name,
        last_name: patient.last_name,
      })
      .from(patient)
      .where(eq(patient.uuid, patientUuid))
      .get() ?? null
  );
}

export function getAttributeName(attributeTypeUuid: string, on: DbHandle = getDb()): string | null {
  const row = on
    .select({ name: patientAttributeMaster.name })
    .from(patientAttributeMaster)
    .where(eq(patientAttributeMaster.uuid, attributeTypeUuid))
    .get();

  return row?.name ?? null;
}

/** Inverse of `getAttributeName`. Case-insensitive, matching the legacy COLLATE NOCASE. */
export function getAttributeTypeUuid(name: string, on: DbHandle = getDb()): string | null {
  const row = on
    .select({ uuid: patientAttributeMaster.uuid })
    .from(patientAttributeMaster)
    .where(sql`lower(${patientAttributeMaster.name}) = lower(${name})`)
    .get();

  return row?.uuid ?? null;
}

/**
 * Rows the server has not seen. The legacy predicate had to match four string
 * spellings and still missed NULL; `sync` is a non-null boolean since D2, so
 * this is now exact.
 */
export function listDirtyPatients(on: DbHandle = getDb()): Patient[] {
  return on.select().from(patient).where(eq(patient.sync, SYNC_DIRTY)).all();
}

export function getOpenmrsId(uuid: string, on: DbHandle = getDb()): string | null {
  const row = on
    .select({ openmrs_id: patient.openmrs_id })
    .from(patient)
    .where(eq(patient.uuid, uuid))
    .get();

  return row?.openmrs_id ?? null;
}

/**
 * The three name parts, unformatted. Two different display formats exist —
 * one keeps the middle name, one drops it — so formatting stays above the
 * repository where the difference is visible.
 */
export function getPatientName(
  uuid: string,
  on: DbHandle = getDb(),
): Pick<Patient, 'first_name' | 'middle_name' | 'last_name'> | null {
  return (
    on
      .select({
        first_name: patient.first_name,
        middle_name: patient.middle_name,
        last_name: patient.last_name,
      })
      .from(patient)
      .where(eq(patient.uuid, uuid))
      .get() ?? null
  );
}

/** Format is not uniform: the pull writes `yyyy-MM-dd`, local writes store it raw. */
export function getDateOfBirth(uuid: string, on: DbHandle = getDb()): string | null {
  const row = on
    .select({ date_of_birth: patient.date_of_birth })
    .from(patient)
    .where(eq(patient.uuid, uuid))
    .get();

  return row?.date_of_birth ?? null;
}

/** Resolves the attribute type by name, then reads that patient's value. */
export function getAttributeValue(
  patientUuid: string,
  attributeName: string,
  on: DbHandle = getDb(),
): string | null {
  const typeUuid = getAttributeTypeUuid(attributeName, on);
  if (!typeUuid) return null;

  const row = on
    .select({ value: patientAttribute.value })
    .from(patientAttribute)
    .where(
      and(
        eq(patientAttribute.patientuuid, patientUuid),
        eq(patientAttribute.person_attribute_type_uuid, typeUuid),
      ),
    )
    .get();

  return row?.value ?? null;
}
