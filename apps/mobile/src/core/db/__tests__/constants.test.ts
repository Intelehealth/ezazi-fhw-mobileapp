import * as encounterTypes from '../constants/encounter';
import * as obsConcepts from '../constants/obs';
import * as dbLiterals from '../constants/literals';
import * as providerAttributes from '../constants/provider';
import * as visitAttributes from '../constants/visit';

/**
 * Guards the ported uuids. A uuid under two names is how the legacy file hid
 * seven collisions for years — six turned out to be dead aliases. These fail on
 * a new collision, a truncated paste, or a constant that lost its value.
 */

const FILES = {
  'constants/encounter.ts': encounterTypes,
  'constants/obs.ts': obsConcepts,
  'constants/provider.ts': providerAttributes,
  'constants/visit.ts': visitAttributes,
};

const entries = Object.entries(FILES).flatMap(([file, mod]) =>
  Object.entries(mod)
    .filter(([, value]) => typeof value === 'string')
    .map(([name, value]) => ({ file, name, uuid: value as string })),
);

describe('uuid constants', () => {
  it('exports the full ported set', () => {
    // Deliberately brittle: a changed count means a constant was added or lost.
    expect(entries).toHaveLength(103);
  });

  it('gives every uuid exactly one name, with no exceptions', () => {
    const byUuid = new Map<string, string[]>();
    for (const e of entries) byUuid.set(e.uuid, [...(byUuid.get(e.uuid) ?? []), e.name]);

    // There used to be one documented exception, ca5f5dc3, exported as both
    // ENCOUNTER_EMERGENCY and OBS_EMERGENCY. Both were dropped on 2026-10-12:
    // Android never inserts that uuid in either role. No exception remains.
    const shared = [...byUuid.values()].filter((names) => names.length > 1);
    expect(shared).toEqual([]);
  });

  it('has no truncated or malformed uuid', () => {
    // OpenMRS uses both 8-4-4-4-12 and the padded 5090AAAA… form; both are 36.
    const malformed = entries.filter((e) => e.uuid.length !== 36 || /\s/.test(e.uuid));

    expect(malformed).toEqual([]);
  });

  it('keeps uuids out of literals.ts, which the sweep above does not cover', () => {
    // literals.ts holds non-uuid column values, so it is excluded from FILES.
    // This closes the hole that opens: a uuid parked there would go unguarded.
    const uuidShaped = Object.values(dbLiterals).filter(
      (value) => typeof value === 'string' && value.length === 36 && !/\s/.test(value),
    );

    expect(uuidShaped).toEqual([]);
  });

  it('keeps the admission set at 15, matching the obs it writes', () => {
    // D13 iterates this; a short list silently drops a clinical value.
    expect(obsConcepts.ADMISSION_CONCEPTS).toHaveLength(15);
    expect(new Set(obsConcepts.ADMISSION_CONCEPTS).size).toBe(15);
  });

  it('excludes bookkeeping encounters from the clinical set', () => {
    expect(encounterTypes.NON_CLINICAL_ENCOUNTER_TYPES).toEqual([
      encounterTypes.ENCOUNTER_VISIT_COMPLETE,
      encounterTypes.ENCOUNTER_ADMISSION,
      encounterTypes.LCG_SOS,
    ]);
  });
});
