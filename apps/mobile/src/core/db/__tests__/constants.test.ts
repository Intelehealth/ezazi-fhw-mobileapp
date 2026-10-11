import * as encounterTypes from '../constants/encounter';
import * as obsConcepts from '../constants/obs';
import * as patientAttributes from '../constants/patient';
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
  'constants/patient.ts': patientAttributes,
  'constants/provider.ts': providerAttributes,
  'constants/visit.ts': visitAttributes,
};

/**
 * The one uuid deliberately exported twice. It is used as an encounter type at
 * PatientsFrameJson:235 and as a concept at EncounterDAO:485 — a server-side
 * question, see ROADMAP. Any OTHER collision is a defect.
 */
const ALLOWED_ALIAS = ['ENCOUNTER_EMERGENCY', 'OBS_EMERGENCY'];

const entries = Object.entries(FILES).flatMap(([file, mod]) =>
  Object.entries(mod)
    .filter(([, value]) => typeof value === 'string')
    .map(([name, value]) => ({ file, name, uuid: value as string })),
);

describe('uuid constants', () => {
  it('exports the full ported set', () => {
    // Deliberately brittle: a changed count means a constant was added or lost.
    expect(entries).toHaveLength(111);
  });

  it('gives every uuid exactly one name, bar the documented alias', () => {
    const byUuid = new Map<string, string[]>();
    for (const e of entries) byUuid.set(e.uuid, [...(byUuid.get(e.uuid) ?? []), e.name]);

    const shared = [...byUuid.values()].filter((names) => names.length > 1);
    expect(shared.map((names) => [...names].sort())).toEqual([[...ALLOWED_ALIAS].sort()]);
  });

  it('has no truncated or malformed uuid', () => {
    // OpenMRS uses both 8-4-4-4-12 and the padded 5090AAAA… form; both are 36.
    const malformed = entries.filter((e) => e.uuid.length !== 36 || /\s/.test(e.uuid));

    expect(malformed).toEqual([]);
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
