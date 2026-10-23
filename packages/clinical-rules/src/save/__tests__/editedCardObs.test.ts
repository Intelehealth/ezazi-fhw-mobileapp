import { describe, expect, it } from 'vitest';

import { buildEditedCardObs, type StoredObs } from '../editedCardObs';
import { FIELD_ID } from '../../constants';
import type { FieldId } from '../../constants';
import type { CardInput } from '../../validation/types';

// The outcome must match Android's EDIT save (PartogramDataCaptureActivity.saveObs,
// whitelabel-master b3ddd15) read newest-first, without overwriting any row.
let clock = 0;
const stored = (fieldId: FieldId, value: string, uuid = `u${clock}`): StoredObs => ({
  uuid,
  fieldId,
  value,
  createdAt: `2026-10-23 10:${String(clock++).padStart(2, '0')}:00`,
});
const PARACETAMOL = {
  form: 'Tablet', name: 'Paracetamol', strength: '500 mg', dosage: '1', dosageUnit: 'Tab',
  frequency: '', route: 'Oral', duration: '', durationUnit: '',
};
const PARACETAMOL_TEXT = 'Tablet | Paracetamol | 500 mg | 1::Tab |  | Oral | ::';
const rows = (edit: ReturnType<typeof buildEditedCardObs>) => edit.insert.map((r) => [r.fieldId, r.value, r.comment]);

describe('buildEditedCardObs', () => {
  it('writes a changed value with its alert code, and nothing for an unchanged one', () => {
    const before = [stored(FIELD_ID.BASELINE_FHR, '150'), stored(FIELD_ID.PULSE, '80')];
    const edit = buildEditedCardObs(before, { values: { [FIELD_ID.BASELINE_FHR]: '165', [FIELD_ID.PULSE]: '80' } });

    expect(rows(edit)).toEqual([[FIELD_ID.BASELINE_FHR, '165', 'R']]);
    expect(edit.voidUuids).toEqual([]);
  });

  it('compares with the newest stored value, not the first', () => {
    const before = [stored(FIELD_ID.BASELINE_FHR, '150'), stored(FIELD_ID.BASELINE_FHR, '165')];
    expect(rows(buildEditedCardObs(before, { values: { [FIELD_ID.BASELINE_FHR]: '165' } }))).toEqual([]);
    expect(rows(buildEditedCardObs(before, { values: { [FIELD_ID.BASELINE_FHR]: '150' } }))).toEqual([
      [FIELD_ID.BASELINE_FHR, '150', 'G'],
    ]);
  });

  it('saves a cleared value as empty, as Android does on an edited card', () => {
    const edit = buildEditedCardObs([stored(FIELD_ID.POSTURE, 'SP')], { values: { [FIELD_ID.POSTURE]: '' } });
    expect(rows(edit)).toEqual([[FIELD_ID.POSTURE, '', '']]);
  });

  it('adds a value that was empty before, and ignores fields the card does not show', () => {
    const edit = buildEditedCardObs([stored(FIELD_ID.PULSE, '80')], { values: { [FIELD_ID.BASELINE_FHR]: '120' } });
    expect(rows(edit)).toEqual([[FIELD_ID.BASELINE_FHR, '120', 'G']]);
  });

  it('voids the stale "No" when an infusion turns Yes, and never writes the same JSON twice', () => {
    const no = stored(FIELD_ID.OXYTOCIN, 'No', 'no-1');
    const input: CardInput = {
      values: {},
      [FIELD_ID.OXYTOCIN]: { answer: 'yes', entry: { strength: '5', infusionRate: '20', infusionStatus: 'Started' } },
    };
    const json = '{"infusionRate":"20","infusionStatus":"Started","strength":"5"}';

    const first = buildEditedCardObs([no], input);
    expect(rows(first)).toEqual([[FIELD_ID.OXYTOCIN, json, null]]);
    expect(first.voidUuids).toEqual(['no-1']);

    expect(rows(buildEditedCardObs([stored(FIELD_ID.OXYTOCIN, json)], input))).toEqual([]);
  });

  it('writes "No" when an infusion turns No, keeping the earlier JSON as Android does', () => {
    const json = stored(FIELD_ID.IV_FLUIDS, '{"infusionRate":"10"}', 'json-1');
    const edit = buildEditedCardObs([json], { values: {}, [FIELD_ID.IV_FLUIDS]: { answer: 'no', entry: {} } });

    expect(rows(edit)).toEqual([[FIELD_ID.IV_FLUIDS, 'No', null]]);
    expect(edit.voidUuids).toEqual([]);
    expect(rows(buildEditedCardObs([stored(FIELD_ID.IV_FLUIDS, 'No')], { values: {}, [FIELD_ID.IV_FLUIDS]: { answer: 'no', entry: {} } }))).toEqual([]);
  });

  it('keeps saved medicines, adds new ones, voids removed ones and a stale "No"', () => {
    const before = [
      stored(FIELD_ID.MEDICINE, 'No', 'no-1'),
      stored(FIELD_ID.MEDICINE, PARACETAMOL_TEXT, 'para-1'),
      stored(FIELD_ID.MEDICINE, 'Tablet | Ibuprofen | 400 mg | 1::Tab |  | Oral | ::', 'ibu-1'),
    ];
    const oxytocin = { ...PARACETAMOL, form: 'Injection', name: 'Oxytocin', strength: '10 IU/mL', dosageUnit: 'mL', route: 'IV Infusion' };
    const edit = buildEditedCardObs(before, {
      values: {},
      [FIELD_ID.MEDICINE]: { answer: 'yes', medicines: [PARACETAMOL, oxytocin] },
    });

    expect(rows(edit)).toEqual([[FIELD_ID.MEDICINE, 'Injection | Oxytocin | 10 IU/mL | 1::mL |  | IV Infusion | ::', null]]);
    expect([...edit.voidUuids].sort()).toEqual(['ibu-1', 'no-1']);
  });

  it('voids every medicine and saves "No" when Medicine turns No', () => {
    const edit = buildEditedCardObs([stored(FIELD_ID.MEDICINE, PARACETAMOL_TEXT, 'para-1')], {
      values: {},
      [FIELD_ID.MEDICINE]: { answer: 'no', medicines: [] },
    });

    expect(rows(edit)).toEqual([[FIELD_ID.MEDICINE, 'No', null]]);
    expect(edit.voidUuids).toEqual(['para-1']);
  });

  it('only adds notes; earlier notes are never touched', () => {
    const edit = buildEditedCardObs([stored(FIELD_ID.PLAN, 'Old plan', 'plan-1')], { values: {} }, {
      [FIELD_ID.PLAN]: ['New plan'],
    });

    expect(rows(edit)).toEqual([[FIELD_ID.PLAN, 'New plan', null]]);
    expect(edit.voidUuids).toEqual([]);
  });
});
