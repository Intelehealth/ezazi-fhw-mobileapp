import type {
  OpenMrsValue,
  OpenMrsVisitDetail,
  OpenMrsVisitEncounter,
  OpenMrsVisitObs,
} from '../../types/visit.types';

/**
 * OpenMRS visits as GET /visit/{uuid} returns them, for the ELCG mapper and
 * hook tests — built up from encounters and obs so each test states only
 * what it reads.
 */

let nextId = 0;
const id = (prefix: string) => `${prefix}-${++nextId}`;

export const NURSE = 'Kavita Rao';
export const DOCTOR = 'Dr. Sameer Joshi';

export function buildObs(
  concept: string,
  value: OpenMrsValue,
  overrides: Partial<OpenMrsVisitObs> & { by?: string } = {}
): OpenMrsVisitObs {
  const { by = NURSE, ...rest } = overrides;
  return {
    uuid: id('obs'),
    display: `${concept}: ${String(value)}`,
    value,
    comment: null,
    obsDatetime: '2026-11-02T00:30:00.000Z',
    concept: { uuid: id('concept'), display: concept },
    creator: { uuid: id('user'), person: { uuid: id('person'), display: by } },
    ...rest,
  };
}

/** An encounter of `type` at `time`; hourly ones are displayed "Stage…", like the real feed. */
export function buildEncounter(
  type: string,
  time: string,
  obs: OpenMrsVisitObs[] = [],
  provider = NURSE
): OpenMrsVisitEncounter {
  return {
    uuid: id('enc'),
    display: `${type} ${time.slice(0, 10)}`,
    encounterDatetime: time,
    encounterType: { display: type },
    obs,
    encounterProviders: [
      {
        display: `${provider}: Nurse`,
        provider: {
          uuid: id('provider'),
          person: { uuid: id('person'), display: provider },
        },
      },
    ],
  };
}

/** An LCG_SOS encounter, placed by its `SOS_Stage_Hour` obs. */
export function buildSosEncounter(
  stage: number,
  hour: number,
  time: string,
  obs: OpenMrsVisitObs[] = []
): OpenMrsVisitEncounter {
  return buildEncounter('LCG_SOS', time, [
    buildObs('SOS_Stage_Hour', `Stage${stage}_Hour${hour}_SOS1`, {
      obsDatetime: time,
    }),
    ...obs,
  ]);
}

export function buildVisitDetail(
  overrides: Partial<OpenMrsVisitDetail> = {}
): OpenMrsVisitDetail {
  return {
    uuid: 'visit-1',
    display: 'ELCG visit',
    startDatetime: '2026-11-02T00:00:00.000Z',
    stopDatetime: null,
    location: { display: 'Labour ward' },
    encounters: [],
    patient: {
      uuid: 'pat-1',
      identifiers: [{ identifier: 'ELCG-1042' }],
      attributes: [],
      person: {
        display: 'Asha Devi',
        gender: 'F',
        age: 27,
        birthdate: '1999-01-01T00:00:00.000+0000',
      },
    },
    attributes: [],
    ...overrides,
  };
}

export function patientAttribute(display: string, value: OpenMrsValue) {
  return { uuid: id('attr'), value, attributeType: { display } };
}
