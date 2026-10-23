import { describe, expect, it } from 'vitest';

import { buildNewCardObs } from '../newCardObs';
import { FIELD_ID } from '../../constants';
import type { CardInput } from '../../validation/types';

// Expected rows follow Android PartogramDataCaptureActivity.saveObs in WRITE mode
// (whitelabel-master b3ddd15): buildObservation sets the alert code on value rows;
// createNoResponseObs, the medicine and note builders leave comment unset.
const NO_INFUSION = { answer: 'no' as const, entry: {} };

describe('buildNewCardObs', () => {
  it('writes each filled value with its alert code, in field order, and skips empty ones', () => {
    const input: CardInput = {
      values: {
        [FIELD_ID.COMPANION]: 'N',
        [FIELD_ID.POSTURE]: '',
        [FIELD_ID.BASELINE_FHR]: '150',
        [FIELD_ID.SYSTOLIC_BP]: '145',
        [FIELD_ID.DIASTOLIC_BP]: null,
        [FIELD_ID.SUPERVISOR_DOCTOR]: 'Dr Rao',
      },
    };

    expect(buildNewCardObs(input).map(({ fieldId, value, comment }) => [fieldId, value, comment])).toEqual([
      [FIELD_ID.COMPANION, 'N', 'R'],
      [FIELD_ID.BASELINE_FHR, '150', 'G'],
      [FIELD_ID.SYSTOLIC_BP, '145', 'R'],
      [FIELD_ID.SUPERVISOR_DOCTOR, 'Dr Rao', 'G'],
    ]);
  });

  it('names each row by its concept key for the app to resolve', () => {
    const [row] = buildNewCardObs({ values: { [FIELD_ID.BASELINE_FHR]: '150' } });
    expect(row.conceptKey).toBe('BASELINE_FHR');
  });

  it('saves an explicit "No" for Oxytocin, IV Fluids and Medicine, with no alert code', () => {
    const input: CardInput = {
      values: {},
      [FIELD_ID.OXYTOCIN]: NO_INFUSION,
      [FIELD_ID.IV_FLUIDS]: NO_INFUSION,
      [FIELD_ID.MEDICINE]: { answer: 'no', medicines: [] },
    };

    expect(buildNewCardObs(input).map(({ fieldId, value, comment }) => [fieldId, value, comment])).toEqual([
      [FIELD_ID.OXYTOCIN, 'No', null],
      [FIELD_ID.MEDICINE, 'No', null],
      [FIELD_ID.IV_FLUIDS, 'No', null],
    ]);
  });

  it('saves a Yes infusion as Android JSON and writes nothing for an empty one', () => {
    const rows = buildNewCardObs({
      values: {},
      [FIELD_ID.OXYTOCIN]: { answer: 'yes', entry: { strength: '5', infusionRate: '20', infusionStatus: 'Started' } },
      [FIELD_ID.IV_FLUIDS]: { answer: 'yes', entry: {} },
    });

    expect(rows).toEqual([
      {
        fieldId: FIELD_ID.OXYTOCIN,
        conceptKey: 'OXYTOCIN_UL_DROPS_MIN',
        value: '{"infusionRate":"20","infusionStatus":"Started","strength":"5"}',
        comment: null,
      },
    ]);
  });

  it('saves one obs per medicine in Android text format', () => {
    const rows = buildNewCardObs({
      values: {},
      [FIELD_ID.MEDICINE]: {
        answer: 'yes',
        medicines: [
          { form: 'Tablet', name: 'Paracetamol', strength: '500 mg', dosage: '1', dosageUnit: 'Tab', frequency: '', route: 'Oral', duration: '', durationUnit: '' },
          { form: 'Injection', name: 'Oxytocin', strength: '10 IU/mL', dosage: '1', dosageUnit: 'mL', frequency: '', route: 'IV Infusion', duration: '', durationUnit: '' },
        ],
      },
    });

    expect(rows.map((row) => [row.value, row.comment])).toEqual([
      ['Tablet | Paracetamol | 500 mg | 1::Tab |  | Oral | ::', null],
      ['Injection | Oxytocin | 10 IU/mL | 1::mL |  | IV Infusion | ::', null],
    ]);
  });

  it('saves each non-empty note as its own obs', () => {
    const rows = buildNewCardObs({ values: {} }, {
      [FIELD_ID.ASSESSMENT]: ['Progressing well', ''],
      [FIELD_ID.PLAN]: ['Review in 30 min'],
    });

    expect(rows.map(({ fieldId, value, comment }) => [fieldId, value, comment])).toEqual([
      [FIELD_ID.ASSESSMENT, 'Progressing well', null],
      [FIELD_ID.PLAN, 'Review in 30 min', null],
    ]);
  });

  it('writes nothing for a Medication answer that was never given', () => {
    expect(buildNewCardObs({ values: {}, [FIELD_ID.OXYTOCIN]: { answer: null, entry: {} } })).toEqual([]);
  });
});
