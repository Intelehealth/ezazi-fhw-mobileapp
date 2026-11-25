import { describe, expect, it } from 'vitest';
import { decisionView } from '../../../../../modules/dashboard/elcg/decisions/view-decisions';
import { buildHour, localIso } from '../../../../fixtures/elcg-view';

const at = (minutes: number) => ({
  initial: 'Dr. Joshi',
  obsDatetime: localIso(2026, 10, 2, 7, minutes),
});

const HOUR = buildHour({
  hasEncounter: true,
  assessments: [
    { uuid: 'a-1', value: 'Progressing normally', ...at(5) },
    { uuid: 'a-2', value: 'Raised FHR', ...at(40) },
  ],
  plans: [{ uuid: 'p-1', value: 'Encourage mobility', ...at(6) }],
  prescribed: {
    medication: [
      {
        uuid: 'm-1',
        value:
          'Tablet | Paracetamol | 650 mg | 1::Tab | Thrice daily (TID) | Oral | 3::Days',
        ...at(7),
      },
    ],
    oxytocin: [
      {
        uuid: 'o-1',
        value: { strength: '5', infusionRate: '20', infusionStatus: 'Start' },
        ...at(8),
      },
    ],
    ivFluids: [
      {
        uuid: 'i-1',
        value: {
          type: 'Normal Saline',
          infusionRate: '30',
          infusionStatus: 'Continue',
        },
        ...at(9),
      },
    ],
  },
});

describe('decisionView', () => {
  it("lists an hour's assessments newest first, each with when it was recorded", () => {
    expect(
      decisionView({ kind: 'assessment', stage: 1, hourIndex: 1 }, HOUR)
    ).toEqual({
      title: 'ASSESSMENT [Stage 1] [ Hour 2]',
      sections: [
        {
          heading: 'ASSESSMENT',
          items: [
            { uuid: 'a-2', label: 'Raised FHR', meta: '(02-11-2026 07:40 AM)' },
            {
              uuid: 'a-1',
              label: 'Progressing normally',
              meta: '(02-11-2026 07:05 AM)',
            },
          ],
        },
      ],
    });
  });

  it("lists an hour's plan, then what was prescribed in it", () => {
    const view = decisionView({ kind: 'plan', stage: 2, hourIndex: 0 }, HOUR);

    expect(view.title).toBe('PLAN [Stage 2] [ Hour 1]');
    expect(
      view.sections.map(section => [
        section.heading,
        section.items.map(item => item.label),
      ])
    ).toEqual([
      ['PLAN', ['Encourage mobility']],
      [
        'MEDICATION',
        ['Tablet Paracetamol 650 mg 1 Tab Thrice daily (TID) Oral for 3 Days'],
      ],
      ['OXYTOCIN', ['START OXYTOCIN - 5 U/L (20 drops/minute)']],
      ['IV FLUIDS', ['CONTINUE IV - Normal Saline (30 drops/minute)']],
    ]);
  });
});
