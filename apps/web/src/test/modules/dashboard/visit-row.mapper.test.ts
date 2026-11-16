import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mapVisitToRow } from '../../../modules/dashboard/visit-row.mapper';
import { formatDateTime } from '../../../utils/date-format';
import type {
  PortalEncounter,
  PortalObs,
  PortalVisit,
} from '../../../types/visit.types';

const CONTEXT = {
  viewerUuid: 'abcd1234-0000-4000-8000-000000000000',
  openMrsBaseUrl: 'https://openmrs.test/openmrs/ws/rest/v1',
};

function obs(
  conceptName: string,
  value: string | number | null,
  overrides: Partial<PortalObs> = {}
): PortalObs {
  return {
    value_text: typeof value === 'string' ? value : null,
    value_numeric: typeof value === 'number' ? value : null,
    comments: null,
    uuid: `obs-${conceptName}`,
    voided: false,
    concept: {
      uuid: `concept-${conceptName}`,
      concept_name: [{ name: conceptName, voided: false }],
    },
    ...overrides,
  };
}

function encounter(
  typeName: string,
  observations: PortalObs[] = [],
  overrides: Partial<PortalEncounter> = {}
): PortalEncounter {
  return {
    encounter_datetime: '2026-10-22T10:30:00.000Z',
    uuid: `enc-${typeName}`,
    voided: false,
    obs: observations,
    type: { name: typeName },
    encounter_provider: {
      uuid: 'ep-1',
      voided: false,
      provider: {
        identifier: 'NUR-1',
        uuid: 'prov-1',
        person: {
          gender: 'F',
          person_name: { given_name: 'Kavita', family_name: 'Rao' },
        },
      },
    },
    ...overrides,
  };
}

function visit(overrides: Partial<PortalVisit> = {}): PortalVisit {
  return {
    visit_id: 1,
    uuid: 'visit-1',
    date_started: '2026-10-22T03:45:00.000Z',
    date_stopped: null,
    voided: false,
    encounters: [encounter('Stage1_Hour1_1')],
    patient: { identifier: 'ELCG-1042' },
    patient_name: { given_name: 'Asha', family_name: 'Devi' },
    person: {
      uuid: 'per-1',
      gender: 'F',
      birthdate: '1999-04-12T00:00:00.000Z',
    },
    attributes: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-23T12:00:00'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('mapVisitToRow', () => {
  it('maps the patient, provider and photo URL', () => {
    const row = mapVisitToRow(visit(), CONTEXT);

    expect(row.uuid).toBe('visit-1');
    expect(row.patient).toEqual({
      name: 'Asha Devi',
      identifier: 'ELCG-1042',
      gender: 'F',
      age: 27,
      avatarUrl: 'https://openmrs.test/openmrs/ws/rest/v1/personimage/per-1',
    });
    expect(row.provider).toBe('Kavita Rao');
    /* The visit's start time, in local time — compared via the formatter so any timezone passes. */
    expect(row.inLabourDuration).toBe(
      formatDateTime('2026-10-22T03:45:00.000Z')
    );
  });

  it.each([
    [['Stage1_Hour1_1'], 1],
    [['Stage1_Hour1_1', 'Stage2_Hour1_1'], 2],
    [['Stage2_Hour1_1', 'Stage3_Hour1_1'], 3],
    [['DELIVERY_OUTCOME_STAGE3'], 3],
  ])('derives stage from encounter types %j → %i', (types, stage) => {
    const row = mapVisitToRow(
      visit({ encounters: types.map(t => encounter(t)) }),
      CONTEXT
    );
    expect(row.stage).toBe(stage);
  });

  it('uses the active Visit Risk score as the alert count, ignoring voided attributes', () => {
    const row = mapVisitToRow(
      visit({
        attributes: [
          {
            value_reference: '9',
            uuid: 'a-old',
            voided: true,
            attribute_type: { name: 'Visit Risk', uuid: 't-risk' },
          },
          {
            value_reference: '2',
            uuid: 'a-new',
            voided: false,
            attribute_type: { name: 'Visit Risk', uuid: 't-risk' },
          },
        ],
      }),
      CONTEXT
    );
    expect(row.alertCount).toBe(2);
  });

  it('marks the row unseen unless the viewer appears in the Visit Read attribute', () => {
    const readAttribute = (value: string) => ({
      value_reference: value,
      uuid: 'a-read',
      voided: false,
      attribute_type: { name: 'Visit Read', uuid: 't-read' },
    });

    expect(mapVisitToRow(visit(), CONTEXT).isUnseen).toBe(true);
    expect(
      mapVisitToRow(
        visit({ attributes: [readAttribute('ffff0000,abcd1234')] }),
        CONTEXT
      ).isUnseen
    ).toBe(false);
  });

  it('lists only red-flagged allowed readings, sorted, and reads the cervix/descent plots', () => {
    const row = mapVisitToRow(
      visit({
        encounters: [
          encounter('Stage1_Hour1_1', [
            obs('Systolic BP', 150, { comments: 'R' }),
            obs('Baseline FHR', 170, { comments: 'R' }),
            obs('PULSE', 130, { comments: 'R' }),
            obs('Diastolic BP', 80, { comments: 'Y' }),
            obs('Moulding', '++', { comments: 'R', voided: true }),
            obs('Cervix 0 cm, 1 cm, 2 cm, 3 cm, 4 cm, 5 cm', 6),
            obs('Descent 0-5', '3'),
          ]),
        ],
      }),
      CONTEXT
    );

    expect(row.alarmingReadings).toEqual([
      { key: 'Baseline FHR', value: 170 },
      { key: 'Systolic BP', value: 150 },
    ]);
    expect(row.cervixPlotX).toBe('6');
    expect(row.descentPlotO).toBe('3');
  });

  it('reads a birth from the Visit Complete encounter', () => {
    const row = mapVisitToRow(
      visit({
        encounters: [
          encounter('Visit Complete', [
            obs('Birth Outcome', 'Other'),
            obs('Birth Outcome Other', 'Twins'),
          ]),
        ],
      }),
      CONTEXT
    );

    expect(row.completeReason).toBe('Newborn');
    expect(row.birthOutcome).toBe('Other');
    expect(row.birthOutcomeOther).toBe('Twins');
    expect(row.dateTimeOfBirth).toMatch(/^2026\/10\/22 /);
  });

  it('reads an out-of-time completion and its reason', () => {
    const row = mapVisitToRow(
      visit({
        encounters: [
          encounter('Visit Complete', [obs('OUT_OF_TIME', 'Shift ended')]),
        ],
      }),
      CONTEXT
    );

    expect(row.completeReason).toBe('Out Of Time');
    expect(row.outOfTimeReason).toBe('Shift ended');
  });

  it('reads a referral and its "Other" reason', () => {
    const row = mapVisitToRow(
      visit({
        encounters: [
          encounter('Visit Complete', [
            obs('Refer Type', 'Other'),
            obs('Refer Type Other', 'Family request'),
          ]),
        ],
      }),
      CONTEXT
    );

    expect(row.completeReason).toBe('Other');
    expect(row.referTypeOtherReason).toBe('Family request');
  });

  it('reports a visit with no Visit Complete encounter as Ended', () => {
    expect(mapVisitToRow(visit(), CONTEXT).completeReason).toBe('Ended');
  });

  it('survives a partial record instead of throwing', () => {
    const row = mapVisitToRow(
      visit({
        encounters: [
          encounter('Stage1_Hour1_1', [{ ...obs('x', 1), concept: null }], {
            type: null,
            encounter_provider: null,
          }),
        ],
        patient: null,
        patient_name: null,
        person: null,
      }),
      CONTEXT
    );

    expect(row.patient).toEqual({
      name: '-',
      identifier: '-',
      gender: '-',
      age: null,
      avatarUrl: undefined,
    });
    expect(row.provider).toBe('-');
    expect(row.stage).toBe(1);
  });
});
