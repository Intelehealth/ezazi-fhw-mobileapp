import { describe, expect, it } from 'vitest';
import {
  mapVisitToElcgView,
  valueText,
} from '../../../../modules/dashboard/elcg/elcg.mapper';
import type {
  OpenMrsValue,
  OpenMrsVisitDetail,
} from '../../../../types/visit.types';
import {
  DOCTOR,
  buildEncounter,
  buildObs,
  buildSosEncounter,
  buildVisitDetail,
  patientAttribute,
} from '../../../fixtures/openmrs-visit';

const CONTEXT = { pastVisitsCount: 0, hasStage3: false };

function map(visit: OpenMrsVisitDetail, context = CONTEXT) {
  return mapVisitToElcgView(visit, context);
}

/** `HH:MM` on the visit's day, in UTC. */
const at = (time: string) => `2026-11-02T${time}:00.000Z`;

describe('mapVisitToElcgView — patient header', () => {
  it('reads the details from patient attributes, with the patient name and ID', () => {
    const view = map(
      buildVisitDetail({
        patient: {
          ...buildVisitDetail().patient,
          attributes: [
            patientAttribute('Hospital ID', 'HSP-2231'),
            patientAttribute('Parity', '1'),
            patientAttribute('Gravida', '2'),
            patientAttribute('Labor Onset', 'Spontaneous'),
            patientAttribute('Risk factors', 'Previous C-section'),
          ],
        },
      })
    );

    expect(view.patient).toMatchObject({
      name: 'Asha Devi',
      openMrsId: 'ELCG-1042',
      hospitalId: 'HSP-2231',
      parity: '1',
      gravida: '2',
      labourOnset: 'Spontaneous',
      riskFactors: 'Previous C-section',
      activeLabourDiagnosed: null,
      membraneRuptured: null,
    });
  });

  it('lets the Admission encounter override the patient attributes', () => {
    const view = map(
      buildVisitDetail({
        patient: {
          ...buildVisitDetail().patient,
          attributes: [patientAttribute('Parity', '1')],
        },
        encounters: [
          buildEncounter('Admission', at('00:00'), [
            buildObs('Parity', '3'),
            buildObs('GRAVIDA', '4'),
            buildObs('Risk factors', '   '),
          ]),
        ],
      })
    );

    expect(view.patient.parity).toBe('3');
    expect(view.patient.gravida).toBe('4');
    /* A blank admission obs does not wipe the attribute. */
    expect(view.patient.riskFactors).toBeNull();
  });

  it('reads the FHW app date formats into ISO dates', () => {
    const view = map(
      buildVisitDetail({
        patient: {
          ...buildVisitDetail().patient,
          attributes: [
            patientAttribute('Active Labor Diagnosed', '02/11/2026 05:30 AM'),
            patientAttribute('Last Menstrual Period (LMP)', '26/01/2026'),
            patientAttribute('Estimated Date of Delivery (EDD)', '2026-11-02'),
          ],
        },
      })
    );

    expect(view.patient.activeLabourDiagnosed).toBe(
      new Date(2026, 10, 2, 5, 30).toISOString()
    );
    expect(view.patient.lmp).toBe(new Date(2026, 0, 26).toISOString());
    expect(view.patient.edd).toBe(new Date(2026, 10, 2).toISOString());
  });

  it.each([
    [
      '02/11/2026 04:15',
      { kind: 'date', value: new Date(2026, 10, 2, 4, 15).toISOString() },
    ],
    ['I', { kind: 'status', value: 'Intact' }],
    ['u', { kind: 'status', value: 'Unknown' }],
    ['Leaking', { kind: 'status', value: 'LEAKING' }],
  ])('reads a ruptured-membranes value of %j', (value, expected) => {
    const view = map(
      buildVisitDetail({
        patient: {
          ...buildVisitDetail().patient,
          attributes: [patientAttribute('Membrane Ruptured Timestamp', value)],
        },
      })
    );

    expect(view.patient.membraneRuptured).toEqual(expected);
  });

  it('reads LMP and EDD in any format a Date accepts, and drops one it cannot', () => {
    const view = map(
      buildVisitDetail({
        patient: {
          ...buildVisitDetail().patient,
          identifiers: [],
          attributes: [
            patientAttribute('Last Menstrual Period (LMP)', 'January 26, 2026'),
            patientAttribute('Estimated Date of Delivery (EDD)', 'soon'),
          ],
        },
      })
    );

    expect(view.patient.lmp).toBe(new Date(2026, 0, 26).toISOString());
    expect(view.patient.edd).toBeNull();
    expect(view.patient.openMrsId).toBeNull();
  });

  it('drops an active labour diagnosis it cannot read', () => {
    const view = map(
      buildVisitDetail({
        patient: {
          ...buildVisitDetail().patient,
          attributes: [patientAttribute('Active Labor Diagnosed', 'yesterday')],
        },
      })
    );

    expect(view.patient.activeLabourDiagnosed).toBeNull();
  });
});

describe('valueText', () => {
  it.each([
    ['text', 'Spontaneous', 'Spontaneous'],
    ['a number', 120, '120'],
    ['a boolean', false, 'false'],
    ['a coded answer', { uuid: 'c-1', display: 'Yes' }, 'Yes'],
    ['a coded answer with no name', { uuid: 'c-1' }, ''],
    ['null', null, ''],
    ['a missing value', undefined, ''],
  ])('reads %s', (_, value, expected) => {
    expect(valueText(value as OpenMrsValue)).toBe(expected);
  });
});

describe('mapVisitToElcgView — the grid', () => {
  it('lays out 15 first-stage hours of 2 slots and 5 second-stage hours of 4', () => {
    const view = map(buildVisitDetail());

    expect(view.stage1.hours).toHaveLength(15);
    expect(view.stage1.columns).toHaveLength(30);
    expect(view.stage2.hours).toHaveLength(5);
    expect(view.stage2.columns).toHaveLength(20);
    expect(view.readings.pulse.stage1).toHaveLength(30);
    expect(view.medication.oxytocin.stage2).toHaveLength(20);
  });

  it("places each hour's encounters in its slots in time order, whatever order they arrive in", () => {
    const view = map(
      buildVisitDetail({
        encounters: [
          buildEncounter('Stage1_Hour2_1', at('01:30'), [
            buildObs('PULSE', '96'),
          ]),
          buildEncounter('Stage1_Hour1_2', at('00:30'), [
            buildObs('PULSE', '90'),
          ]),
          buildEncounter('Stage1_Hour1_1', at('00:00'), [
            buildObs('PULSE', 88),
          ]),
          buildEncounter('Stage2_Hour1_1', at('05:00'), [
            buildObs('PULSE', '110'),
          ]),
        ],
      })
    );

    expect(view.stage1.columns.slice(0, 3).map(c => c.time)).toEqual([
      at('00:00'),
      at('00:30'),
      at('01:30'),
    ]);
    expect(view.readings.pulse.stage1.slice(0, 3)).toEqual([
      { value: '88', alert: null },
      { value: '90', alert: null },
      { value: '96', alert: null },
    ]);
    expect(view.readings.pulse.stage2[0]).toEqual({
      value: '110',
      alert: null,
    });
  });

  it('widens an hour for an SOS check instead of overwriting a reading', () => {
    const view = map(
      buildVisitDetail({
        encounters: [
          buildEncounter('Stage1_Hour1_1', at('00:00'), [
            buildObs('Baseline FHR', '140'),
          ]),
          buildEncounter('Stage1_Hour1_2', at('00:30'), [
            buildObs('Baseline FHR', '142'),
          ]),
          buildSosEncounter(1, 1, at('00:45'), [
            buildObs('Baseline FHR', '168', { comment: 'R' }),
          ]),
        ],
      })
    );

    expect(view.stage1.hours[0].subColumns).toBe(3);
    expect(view.stage1.columns).toHaveLength(31);
    expect(view.stage1.columns[2]).toEqual({ time: at('00:45'), isSos: true });
    expect(view.readings.baselineFhr.stage1.slice(0, 3)).toEqual([
      { value: '140', alert: null },
      { value: '142', alert: null },
      { value: '168', alert: 'R' },
    ]);
    /* Hour 2 starts after the widened hour 1. */
    expect(view.stage1.hours[1].subColumns).toBe(2);
  });

  it('flags readings by their R / Y comment and shows coded answers by name', () => {
    const view = map(
      buildVisitDetail({
        encounters: [
          buildEncounter('Stage1_Hour1_1', at('00:00'), [
            buildObs('Systolic BP', '148', { comment: 'R' }),
            buildObs('TEMPERATURE (C)', '99.6', { comment: 'Y' }),
            buildObs(
              'Posture',
              { uuid: 'c-mo', display: 'MO' },
              { comment: 'noted' }
            ),
          ]),
        ],
      })
    );

    expect(view.readings.systolicBp.stage1[0]).toEqual({
      value: '148',
      alert: 'R',
    });
    expect(view.readings.temperature.stage1[0]).toEqual({
      value: '99.6',
      alert: 'Y',
    });
    expect(view.readings.posture.stage1[0]).toEqual({
      value: 'MO',
      alert: null,
    });
  });

  it('signs each hour off with the provider of its last hourly encounter', () => {
    const view = map(
      buildVisitDetail({
        encounters: [
          buildEncounter('Stage1_Hour1_1', at('00:00'), [], '  Kavita Rao '),
          buildEncounter('Stage1_Hour1_2', at('00:30'), [], 'Meena Shah'),
          buildSosEncounter(1, 2, at('01:15')),
        ],
      })
    );

    expect(view.stage1.hours[0]).toMatchObject({
      initials: 'Meena Shah',
      hasEncounter: true,
    });
    /* An SOS check alone does not open the hour's assessment and plan. */
    expect(view.stage1.hours[1]).toMatchObject({
      initials: null,
      hasEncounter: false,
    });
  });

  it('leaves out an SOS check that does not say which hour it belongs to', () => {
    const view = map(
      buildVisitDetail({
        encounters: [
          buildEncounter('LCG_SOS', at('00:10'), [buildObs('PULSE', '90')]),
          buildEncounter('LCG_SOS', at('00:20'), [
            buildObs('SOS_Stage_Hour', 'sometime'),
            buildObs('PULSE', '91'),
          ]),
        ],
      })
    );

    expect(view.readings.pulse.stage1.every(r => r === null)).toBe(true);
  });

  it('leaves an entry unsigned when its recorder is not known', () => {
    const view = map(
      buildVisitDetail({
        encounters: [
          buildEncounter('Stage1_Hour1_1', at('00:00'), [
            buildObs('Assessment', 'Progressing normally', { creator: null }),
          ]),
        ],
      })
    );

    expect(view.history.assessment[0].initial).toBe('');
  });

  it('leaves out encounters that are not on the guide', () => {
    const view = map(
      buildVisitDetail({
        encounters: [
          buildEncounter('Admission', at('00:00'), [buildObs('PULSE', '80')]),
          buildEncounter('Stage1_Hour16_1', at('01:00'), [
            buildObs('PULSE', '81'),
          ]),
          buildEncounter('Stage3_Hour1_1', at('02:00'), [
            buildObs('PULSE', '82'),
          ]),
          buildSosEncounter(2, 6, at('03:00'), [buildObs('PULSE', '83')]),
        ],
      })
    );

    expect(
      [...view.stage1.columns, ...view.stage2.columns].every(c => !c.time)
    ).toBe(true);
    expect(
      [...view.readings.pulse.stage1, ...view.readings.pulse.stage2].every(
        r => r === null
      )
    ).toBe(true);
  });
});

describe('mapVisitToElcgView — decisions and medication', () => {
  const ASSESSMENT_1 = buildObs('Assessment', 'Progressing normally', {
    by: DOCTOR,
    obsDatetime: at('00:40'),
  });
  const ASSESSMENT_2 = buildObs('Assessment', 'Raised FHR', {
    by: DOCTOR,
    obsDatetime: at('00:50'),
  });

  it("gathers an hour's assessments and plans across its slots, and lists them all newest first", () => {
    const view = map(
      buildVisitDetail({
        encounters: [
          buildEncounter('Stage1_Hour1_1', at('00:00'), [ASSESSMENT_1]),
          buildEncounter('Stage1_Hour1_2', at('00:30'), [
            ASSESSMENT_2,
            buildObs('Additional Comments', 'Encourage mobility', {
              by: DOCTOR,
              obsDatetime: at('00:55'),
            }),
          ]),
        ],
      })
    );

    expect(view.stage1.hours[0].assessments.map(a => a.value)).toEqual([
      'Progressing normally',
      'Raised FHR',
    ]);
    expect(view.stage1.hours[0].assessments[0]).toMatchObject({
      initial: DOCTOR,
      obsDatetime: at('00:40'),
    });
    expect(view.stage1.hours[0].plans.map(p => p.value)).toEqual([
      'Encourage mobility',
    ]);
    expect(view.history.assessment.map(a => a.value)).toEqual([
      'Raised FHR',
      'Progressing normally',
    ]);
    expect(view.history.plan).toHaveLength(1);
  });

  it("lists the doctor's prescriptions before the nurse's entry in each medication cell", () => {
    const view = map(
      buildVisitDetail({
        encounters: [
          buildEncounter('Stage1_Hour1_1', at('00:00'), [
            buildObs('Oxytocin U/l, Drops per min', 'NO', {
              obsDatetime: at('00:05'),
            }),
            buildObs(
              'Oxytocin U/l, Drops per min, Prescribed',
              '{"strength":"5","infusionRate":"10","infusionStatus":"start"}',
              { by: DOCTOR, obsDatetime: at('00:10') }
            ),
            buildObs('Medicine', 'Paracetamol::500 mg', {
              obsDatetime: at('00:15'),
            }),
            buildObs('Medicine Prescribed', 'Tablet | Iron', {
              by: DOCTOR,
              obsDatetime: at('00:20'),
            }),
            buildObs(
              'IV fluids',
              '{"type":"Ringer Lactate","infusionRate":"20","infusionStatus":"start"}',
              { obsDatetime: at('00:25') }
            ),
          ]),
        ],
      })
    );

    const oxytocinCell = view.medication.oxytocin.stage1[0];
    expect(oxytocinCell.map(e => e.value)).toEqual([
      { strength: '5', infusionRate: '10', infusionStatus: 'start' },
      'NO',
    ]);
    expect(view.medication.medicine.stage1[0].map(e => e.value)).toEqual([
      'Tablet | Iron',
      'Paracetamol::500 mg',
    ]);
    expect(view.medication.ivFluids.stage1[0][0].value).toEqual({
      type: 'Ringer Lactate',
      infusionRate: '20',
      infusionStatus: 'start',
    });

    /* "NO" stays on the grid but is no history of anything given. */
    expect(view.history.oxytocin).toHaveLength(1);
    expect(view.history.medication.map(m => m.value)).toEqual([
      'Tablet | Iron',
      'Paracetamol::500 mg',
    ]);
    expect(view.history.ivFluids).toHaveLength(1);
  });

  it('keeps a structured value that is not valid JSON as text', () => {
    const view = map(
      buildVisitDetail({
        encounters: [
          buildEncounter('Stage1_Hour1_1', at('00:00'), [
            buildObs('IV fluids Prescribed', '{broken', { by: DOCTOR }),
          ]),
        ],
      })
    );

    expect(view.medication.ivFluids.stage1[0][0].value).toBe('{broken');
  });

  it('carries the past-visit count through', () => {
    expect(
      map(buildVisitDetail(), { ...CONTEXT, pastVisitsCount: 3 })
        .pastVisitsCount
    ).toBe(3);
  });
});

describe('mapVisitToElcgView — completion', () => {
  function completed(
    visitCompleteObs: ReturnType<typeof buildObs>[] | null,
    stage3Obs: ReturnType<typeof buildObs>[] | null = null
  ) {
    return buildVisitDetail({
      encounters: [
        ...(visitCompleteObs
          ? [buildEncounter('Visit Complete', at('09:00'), visitCompleteObs)]
          : []),
        ...(stage3Obs
          ? [buildEncounter('DELIVERY_OUTCOME_STAGE3', at('08:00'), stage3Obs)]
          : []),
      ],
    });
  }

  it('is null while the visit is in progress', () => {
    expect(map(buildVisitDetail()).completion).toBeNull();
  });

  it('reads an out-of-time completion', () => {
    const view = map(completed([buildObs('OUT OF TIME', 'Shift ended')]));

    expect(view.completion).toEqual({
      reason: { kind: 'out-of-time', reason: 'Shift ended' },
      birth: null,
      hasStage3: false,
    });
  });

  it('reads an "Other" referral with its reason, and any other referral as recorded', () => {
    expect(
      map(
        completed([
          buildObs('Refer Type', 'Other'),
          buildObs('Refer Type Other', 'Self discharge'),
        ])
      ).completion?.reason
    ).toEqual({ kind: 'other', reason: 'Self discharge' });

    expect(
      map(completed([buildObs('Refer Type', 'Referred to higher centre')]))
        .completion?.reason
    ).toEqual({
      kind: 'referred',
      referType: 'Referred to higher centre',
    });
  });

  it('reads a completion recorded without its details as blank', () => {
    expect(
      map(completed([buildObs('Refer Type', 'Other')])).completion?.reason
    ).toEqual({ kind: 'other', reason: '' });

    expect(map(completed([])).completion?.reason).toEqual({
      kind: 'newborn',
      birthOutcome: '',
      birthOutcomeOther: null,
      motherDeceasedReason: null,
    });
  });

  it('reads a newborn completion with the Stage 3 baby details', () => {
    const view = map(
      completed(
        [
          buildObs('Birth Outcome', 'OTHER'),
          buildObs('Birth Outcome Other', 'Twins'),
          buildObs('MOTHER DECEASED REASON', 'PPH'),
        ],
        [
          buildObs('BirthWeight', '3.1'),
          buildObs('Apgar at 1 min', '8'),
          buildObs('Apgar at 5 min', '9'),
          buildObs('Sex', 'F'),
          buildObs('BIRTH_TYPE', 'Live Birth'),
        ]
      )
    );

    expect(view.completion).toEqual({
      reason: {
        kind: 'newborn',
        birthOutcome: 'OTHER',
        birthOutcomeOther: 'Twins',
        motherDeceasedReason: 'PPH',
      },
      birth: {
        birthWeight: '3.1',
        apgar1: '8',
        apgar5: '9',
        babySex: 'F',
        babyStatus: 'Live Birth',
      },
      hasStage3: false,
    });
  });

  it('treats a Stage 3 outcome alone as complete, without a reason', () => {
    const view = map(completed(null, [buildObs('BIRTH_TYPE', 'Live Birth')]));

    expect(view.completion).toEqual({
      reason: null,
      birth: null,
      hasStage3: false,
    });
  });

  it('offers Stage 3 only where the client has it', () => {
    const visit = completed([buildObs('Birth Outcome', 'Live Birth')], []);

    expect(map(visit).completion?.hasStage3).toBe(false);
    expect(
      map(visit, { ...CONTEXT, hasStage3: true }).completion?.hasStage3
    ).toBe(true);
  });
});
