import { describe, expect, it } from 'vitest';

import { buildEditedCardObs, type StoredObs } from '../editedCardObs';
import { FIELD_ID } from '../../constants';
import type { FieldId } from '../../constants';
import type { CardInput } from '../../validation/types';

// The outcome must match Android's EDIT save (PartogramDataCaptureActivity.saveObs 642-745,
// whitelabel-master b3ddd15): rows are rewritten in place by uuid (ObsDAO.updateObs).
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
const inserted = (edit: ReturnType<typeof buildEditedCardObs>) => edit.insert.map((r) => [r.fieldId, r.value, r.comment]);
const rewritten = (edit: ReturnType<typeof buildEditedCardObs>) => edit.update.map((r) => [r.uuid, r.value, r.comment]);

describe('buildEditedCardObs', () => {
  it('rewrites a changed value in its own row, with the new alert code', () => {
    const edit = buildEditedCardObs([stored(FIELD_ID.BASELINE_FHR, '140', 'fhr')], {
      values: { [FIELD_ID.BASELINE_FHR]: '170' },
    });

    expect(rewritten(edit)).toEqual([['fhr', '170', 'R']]);
    expect(edit.insert).toEqual([]);
    expect(edit.voidUuids).toEqual([]);
  });

  it('rewrites every shown field, unchanged ones too, as Android does', () => {
    const edit = buildEditedCardObs([stored(FIELD_ID.PULSE, '88', 'pulse')], { values: { [FIELD_ID.PULSE]: ' 88 ' } });
    expect(rewritten(edit)).toEqual([['pulse', '88', 'G']]);
  });

  it('rewrites the oldest live row when a field has more than one (Android getObsuuid)', () => {
    const older = stored(FIELD_ID.BASELINE_FHR, '140', 'older');
    const newer = stored(FIELD_ID.BASELINE_FHR, '150', 'newer');
    const edit = buildEditedCardObs([newer, older], { values: { [FIELD_ID.BASELINE_FHR]: '155' } });
    expect(rewritten(edit)).toEqual([['older', '155', 'G']]);
  });

  it('saves a cleared number as empty in its row, but leaves a choice that has no value', () => {
    const edit = buildEditedCardObs([stored(FIELD_ID.PULSE, '88', 'pulse')], { values: { [FIELD_ID.PULSE]: '' } });
    expect(rewritten(edit)).toEqual([['pulse', '', '']]);

    const choice = buildEditedCardObs([stored(FIELD_ID.COMPANION, 'Y', 'companion')], { values: { [FIELD_ID.COMPANION]: '' } });
    expect(choice.update).toEqual([]);
  });

  it('adds a field that had no row, and ignores fields the card does not show', () => {
    const edit = buildEditedCardObs([], { values: { [FIELD_ID.PULSE]: '88' } });
    expect(inserted(edit)).toEqual([[FIELD_ID.PULSE, '88', 'G']]);
  });

  it('turns a stored "No" into the infusion JSON in place, and writes nothing for the same JSON', () => {
    const input: CardInput = { values: {}, [FIELD_ID.OXYTOCIN]: { answer: 'yes', entry: { strength: '5', infusionRate: '20', infusionStatus: 'Started' } } };
    const edit = buildEditedCardObs([stored(FIELD_ID.OXYTOCIN, 'No', 'no')], input);
    const json = '{"infusionRate":"20","infusionStatus":"Started","strength":"5"}';
    expect(rewritten(edit)).toEqual([['no', json, null]]);
    expect(edit.voidUuids).toEqual([]);

    const same = buildEditedCardObs([stored(FIELD_ID.OXYTOCIN, json, 'json')], input);
    expect(same.update).toEqual([]);
    expect(same.insert).toEqual([]);
  });

  it('rewrites a changed infusion JSON and voids a leftover "No"', () => {
    const edit = buildEditedCardObs(
      [stored(FIELD_ID.IV_FLUIDS, '{"type":"Normal Saline"}', 'json'), stored(FIELD_ID.IV_FLUIDS, 'No', 'no')],
      { values: {}, [FIELD_ID.IV_FLUIDS]: { answer: 'yes', entry: { type: 'Ringer Lactate', infusionRate: '20', infusionStatus: 'Started' } } },
    );
    expect(edit.update.map((row) => row.uuid)).toEqual(['json']);
    expect(edit.voidUuids).toEqual(['no']);
  });

  it('writes "No" when an infusion turns No, reusing a stored "No" and keeping the JSON, as Android', () => {
    const json = stored(FIELD_ID.OXYTOCIN, '{"strength":"5"}', 'json');
    const turnedNo = buildEditedCardObs([json], { values: {}, [FIELD_ID.OXYTOCIN]: { answer: 'no', entry: {} } });
    expect(inserted(turnedNo)).toEqual([[FIELD_ID.OXYTOCIN, 'No', null]]);
    expect(turnedNo.voidUuids).toEqual([]);

    const reused = buildEditedCardObs([json, stored(FIELD_ID.OXYTOCIN, 'No', 'no')], {
      values: {},
      [FIELD_ID.OXYTOCIN]: { answer: 'no', entry: {} },
    });
    expect(rewritten(reused)).toEqual([['no', 'No', null]]);
  });

  it('rewrites kept medicines, adds new ones, voids removed ones and a stale "No"', () => {
    const edit = buildEditedCardObs(
      [stored(FIELD_ID.MEDICINE, PARACETAMOL_TEXT, 'kept'), stored(FIELD_ID.MEDICINE, 'Tablet | Gone | 1 mg | 1::Tab |  | Oral | ::', 'gone'), stored(FIELD_ID.MEDICINE, 'No', 'no')],
      { values: {}, [FIELD_ID.MEDICINE]: { answer: 'yes', medicines: [PARACETAMOL, { ...PARACETAMOL, name: 'Ibuprofen' }] } },
    );

    expect(rewritten(edit)).toEqual([['kept', PARACETAMOL_TEXT, '']]);
    expect(inserted(edit)).toEqual([[FIELD_ID.MEDICINE, 'Tablet | Ibuprofen | 500 mg | 1::Tab |  | Oral | ::', '']]);
    expect(edit.voidUuids.sort()).toEqual(['gone', 'no']);
  });

  it('voids every medicine and saves "No" when Medicine turns No', () => {
    const edit = buildEditedCardObs([stored(FIELD_ID.MEDICINE, PARACETAMOL_TEXT, 'med')], {
      values: {},
      [FIELD_ID.MEDICINE]: { answer: 'no', medicines: [] },
    });
    expect(edit.voidUuids).toEqual(['med']);
    expect(inserted(edit)).toEqual([[FIELD_ID.MEDICINE, 'No', null]]);
  });

  it('only adds notes; earlier notes are never touched', () => {
    const edit = buildEditedCardObs([stored(FIELD_ID.PLAN, 'Old plan', 'old')], { values: {} }, { [FIELD_ID.PLAN]: ['New plan', ''] });
    expect(inserted(edit)).toEqual([[FIELD_ID.PLAN, 'New plan', null]]);
    expect(edit.update).toEqual([]);
  });
});
