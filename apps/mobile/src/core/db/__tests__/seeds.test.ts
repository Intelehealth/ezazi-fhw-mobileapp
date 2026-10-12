import * as encounterTypes from '../constants/encounter';
import * as obsConcepts from '../constants/obs';
import * as patientAttributes from '../constants/patient';
import * as providerAttributes from '../constants/provider';
import * as visitAttributes from '../constants/visit';
import { UUID_ENTRIES } from '../seeds/uuidDictionary';

/**
 * Guards `tbl_uuid_dictionary`'s seed rows, which `constants.test.ts` does NOT
 * cover — it sweeps `constants/` only, and that gap let a transposed uuid sit
 * in `Stage3_Hour4_1` undetected until the 2026-10-12 audit compared all 96
 * rows against `InteleHealthDatabaseHelper.uuidInsert()`.
 *
 * BE HONEST ABOUT WHAT THIS CATCHES. A transposition that stays 36 valid hex
 * characters — which is exactly what happened — passes every shape check here.
 * Only comparing against the Android source finds that, and the source is not
 * in this repo. What these tests do catch: truncation, a lost or duplicated
 * row, and drift between a seed row and the same uuid in `constants/`.
 */

const CONSTANTS = {
  'constants/encounter.ts': encounterTypes,
  'constants/obs.ts': obsConcepts,
  'constants/patient.ts': patientAttributes,
  'constants/provider.ts': providerAttributes,
  'constants/visit.ts': visitAttributes,
};

describe('uuid dictionary seed', () => {
  it('holds exactly the encounter types', () => {
    // Deliberately brittle: a changed count means a row was added or lost.
    // 67 encounter-type constants plus EMERGENCY, which is an encounter type
    // with no constant - nothing in this app writes or matches that uuid.
    expect(UUID_ENTRIES).toHaveLength(68);
  });

  it('seeds NOTHING but encounter types', () => {
    // The other half of the rule. Android seeded 22 obs concepts and 8 patient
    // attribute types here; every read of this table is keyed on an encounter
    // type, so none of them was ever looked up. Dropped 2026-10-12.
    const banned = new Set(
      Object.values({ ...obsConcepts, ...patientAttributes })
        .filter((v) => typeof v === 'string')
        .map((v) => (v as string).toLowerCase()),
    );
    const strays = UUID_ENTRIES.filter((e) => banned.has(e.uuid.toLowerCase())).map((e) => e.name);

    expect(strays).toEqual([]);
  });

  it('seeds EVERY encounter type, because every read joins on encounter_type_uuid', () => {
    // The rule this table follows: if a uuid can appear in `encounter_type_uuid`
    // it has a row here; otherwise it does not need one. This is the test that
    // would have caught ENCOUNTER_ADMISSION and ENCOUNTER_VISIT_COMPLETE missing.
    // Three uuids in constants/encounter.ts are NOT encounter types and moved to
    // constants/provider.ts on 2026-10-12, so everything left here must be seeded.
    const seeded = new Set(UUID_ENTRIES.map((e) => e.uuid.toLowerCase()));
    const missing = Object.entries(encounterTypes)
      .filter(([, v]) => typeof v === 'string')
      .filter(([, v]) => !seeded.has((v as string).toLowerCase()))
      .map(([k]) => k);

    expect(missing).toEqual([]);
  });

  it('has no truncated or malformed uuid', () => {
    const malformed = UUID_ENTRIES.filter(
      (e) => e.uuid.length !== 36 || /\s/.test(e.uuid),
    );

    expect(malformed).toEqual([]);
  });

  it('gives every uuid and every name exactly one row', () => {
    expect(new Set(UUID_ENTRIES.map((e) => e.uuid)).size).toBe(UUID_ENTRIES.length);
    expect(new Set(UUID_ENTRIES.map((e) => e.name)).size).toBe(UUID_ENTRIES.length);
  });

  it('never disagrees with constants/ about a uuid', () => {
    // The one cross-check that could have caught a valid-looking transposition:
    // where a uuid is stored in two places, the two must match.
    const byName = new Map(UUID_ENTRIES.map((e) => [e.name.trim().toUpperCase(), e.uuid]));
    const conflicts: string[] = [];

    for (const [file, mod] of Object.entries(CONSTANTS)) {
      for (const [name, value] of Object.entries(mod)) {
        if (typeof value !== 'string') continue;

        const seeded = byName.get(name.trim().toUpperCase());
        if (seeded && seeded.toLowerCase() !== value.toLowerCase()) {
          conflicts.push(`${file} ${name}: constant=${value} seed=${seeded}`);
        }
      }
    }

    expect(conflicts).toEqual([]);
  });
});
