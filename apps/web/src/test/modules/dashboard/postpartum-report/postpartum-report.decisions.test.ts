import { describe, expect, it } from 'vitest';
import {
  POSTPARTUM_DECISION_CONCEPTS,
  applyPostpartumChanges,
  latestEncounterColumn,
  postpartumDecisionHistory,
  postpartumDecisionSource,
} from '../../../../modules/dashboard/postpartum-report/postpartum-report.decisions';
import { buildMockPostpartumReport } from '../../../../modules/dashboard/postpartum-report/postpartum-report.mock';

const MOTHER_PLAN = { patient: 'mother', kind: 'plan' } as const;
const VIEWER = { uuid: 'doctor-1', name: 'Dr. Meera Rao' };
const NOW = new Date('2026-11-26T10:00:00Z');

describe('postpartum decisions', () => {
  it("records on stage3.component.ts's concepts", () => {
    expect(POSTPARTUM_DECISION_CONCEPTS).toEqual({
      mother: {
        assessment: '67a050c1-35e5-451c-a4ab-fff9d57b0db1',
        plan: '162169AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      },
      newborn: {
        assessment: '15fc4eca-7635-4e7c-baa4-20c250cfe62a',
        plan: 'a79853d9-e45e-41b2-8473-b19e5cae66cb',
      },
    });
  });

  it('records against the last column that has an encounter', () => {
    const report = buildMockPostpartumReport('visit-1');
    /* +1h 45m: the two checks after it are still due. */
    expect(latestEncounterColumn(report)).toBe(6);

    const unrecorded = {
      ...report,
      columns: report.columns.map(column => ({
        ...column,
        encounterUuid: null,
      })),
    };
    expect(latestEncounterColumn(unrecorded)).toBe(-1);
    expect(postpartumDecisionSource(unrecorded, MOTHER_PLAN).current).toEqual(
      []
    );
  });

  it('opens the dialog with the whole history and the latest encounter’s entries', () => {
    const report = buildMockPostpartumReport('visit-1');
    const source = postpartumDecisionSource(report, {
      patient: 'mother',
      kind: 'assessment',
    });

    expect(source.history.map(entry => entry.value)).toEqual([
      'Bleeding controlled after uterine massage and oxytocin.',
      'Increased bleeding (~550 ml), tachycardia. Suspected PPH.',
      'Uterus well contracted, bleeding within normal limits.',
    ]);
    expect(source.current.map(entry => entry.value)).toEqual([
      'Bleeding controlled after uterine massage and oxytocin.',
    ]);
  });

  it('applies a saved dialog: creates on the latest encounter, updates and voids', () => {
    const created = applyPostpartumChanges(
      buildMockPostpartumReport('visit-1'),
      MOTHER_PLAN,
      [{ action: 'create', value: 'Review in 30 min' }],
      VIEWER,
      NOW
    );
    const [entry] = postpartumDecisionSource(created, MOTHER_PLAN).current;
    expect(entry).toMatchObject({
      value: 'Review in 30 min',
      initial: 'Dr. Meera Rao',
      creatorUuid: 'doctor-1',
      obsDatetime: NOW.toISOString(),
    });

    const updated = applyPostpartumChanges(
      created,
      MOTHER_PLAN,
      [{ action: 'update', uuid: entry.uuid, value: 'Review in 15 min' }],
      VIEWER,
      NOW
    );
    expect(postpartumDecisionHistory(updated, MOTHER_PLAN)[0].value).toBe(
      'Review in 15 min'
    );

    const voided = applyPostpartumChanges(
      updated,
      MOTHER_PLAN,
      [{ action: 'delete', uuid: entry.uuid }],
      VIEWER,
      NOW
    );
    expect(
      postpartumDecisionHistory(voided, MOTHER_PLAN).map(e => e.uuid)
    ).not.toContain(entry.uuid);
    /* The newborn's plan is untouched throughout. */
    expect(
      postpartumDecisionHistory(voided, { patient: 'newborn', kind: 'plan' })
    ).toHaveLength(2);
  });

  it('has no history or entries for a section without note rows', () => {
    const report = buildMockPostpartumReport('visit-1');
    const readingsOnly = {
      ...report,
      maternal: report.maternal.filter(row => row.kind === 'reading'),
    };

    expect(postpartumDecisionHistory(readingsOnly, MOTHER_PLAN)).toEqual([]);
    expect(postpartumDecisionSource(readingsOnly, MOTHER_PLAN)).toEqual({
      history: [],
      current: [],
    });
  });
});
