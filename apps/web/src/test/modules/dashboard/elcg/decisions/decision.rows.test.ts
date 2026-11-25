import { describe, expect, it } from 'vitest';
import {
  emptyIvFluidRow,
  emptyMedicationRow,
  emptyNoteRow,
  emptyOxytocinRow,
  ivFluidLabel,
  ivFluidRow,
  medicationLabel,
  medicationRow,
  oxytocinLabel,
  oxytocinRow,
  parseMedicine,
  planObsChanges,
  recordedBy,
  serializeIvFluid,
  serializeMedication,
  serializeNote,
  serializeOxytocin,
  type MedicationRow,
} from '../../../../../modules/dashboard/elcg/decisions/decision.rows';

const SIGNED = { initial: 'Dr. Joshi', obsDatetime: '2026-11-02T00:30:00Z' };

const PARACETAMOL: MedicationRow = {
  ...emptyMedicationRow(),
  typeOfMedicine: 'Tablet',
  medicineName: 'Paracetamol',
  strength: '650 mg',
  dosage: '1',
  dosageUnit: 'Tab',
  frequency: 'Thrice daily (TID)',
  routeOfMedicine: 'Oral',
  duration: '3',
  durationUnit: 'Days',
};

describe('medication values', () => {
  it("writes prescribeMedication()'s pipe-separated text, with the remark only when given", () => {
    expect(serializeMedication(PARACETAMOL)).toBe(
      'Tablet | Paracetamol | 650 mg | 1::Tab | Thrice daily (TID) | Oral | 3::Days'
    );
    expect(serializeMedication({ ...PARACETAMOL, remark: 'After food' })).toBe(
      'Tablet | Paracetamol | 650 mg | 1::Tab | Thrice daily (TID) | Oral | 3::Days | After food'
    );
  });

  it('reads a saved value back into the same row', () => {
    const value = serializeMedication({ ...PARACETAMOL, remark: 'After food' });
    expect(medicationRow({ uuid: 'obs-1', value, ...SIGNED })).toEqual({
      ...PARACETAMOL,
      obsUuid: 'obs-1',
      remark: 'After food',
    });
  });

  it('reads a short or malformed value without failing', () => {
    expect(parseMedicine('Tablet | Iron')).toMatchObject({
      typeOfMedicine: 'Tablet',
      medicineName: 'Iron',
      dosage: '',
      duration: '',
      remark: '',
    });
  });

  it('labels a prescription as the dialog history lists it', () => {
    expect(medicationLabel(serializeMedication(PARACETAMOL))).toBe(
      'Tablet Paracetamol 650 mg 1 Tab Thrice daily (TID) Oral for 3 Days'
    );
  });
});

describe('oxytocin and IV fluid values', () => {
  it('stores oxytocin as JSON with numbers, as the number inputs give them', () => {
    expect(
      serializeOxytocin({
        obsUuid: null,
        isDeleted: false,
        strength: '5',
        infusionRate: '10',
        infusionStatus: 'Start',
      })
    ).toBe('{"strength":5,"infusionRate":10,"infusionStatus":"Start"}');
  });

  it('reads saved oxytocin whether its numbers were stored as numbers or text', () => {
    expect(
      oxytocinRow({
        uuid: 'obs-1',
        value: {
          strength: 5 as unknown as string,
          infusionRate: '10',
          infusionStatus: 'Stop',
        },
        ...SIGNED,
      })
    ).toMatchObject({ strength: '5', infusionRate: '10' });
  });

  it('keeps the other IV type only when the type is "Other"', () => {
    const row = {
      ...emptyIvFluidRow(),
      type: 'Other',
      otherType: 'Mannitol',
      infusionRate: '20',
      infusionStatus: 'Start',
    };
    expect(serializeIvFluid(row)).toBe(
      '{"type":"Other","otherType":"Mannitol","infusionRate":20,"infusionStatus":"Start"}'
    );
    expect(
      JSON.parse(serializeIvFluid({ ...row, type: 'Normal Saline' }))
    ).toMatchObject({ type: 'Normal Saline', otherType: null });
  });

  it('labels entries as the card and the dialogs list them', () => {
    expect(
      oxytocinLabel({
        uuid: 'o',
        value: { strength: '5', infusionRate: '10', infusionStatus: 'Start' },
        ...SIGNED,
      })
    ).toBe('START OXYTOCIN - 5 U/L (10 drops/minute)');
    expect(
      ivFluidLabel({
        uuid: 'i',
        value: {
          type: 'Other',
          otherType: 'Mannitol',
          infusionRate: '20',
          infusionStatus: 'Continue',
        },
        ...SIGNED,
      })
    ).toBe('CONTINUE IV - Other Mannitol (20 drops/minute)');
  });
});

describe('planObsChanges', () => {
  const saved = { obsUuid: 'obs-1', isDeleted: false, value: 'Raised FHR' };

  it('creates new rows, voids removed ones and updates only what changed', () => {
    const unchanged = { obsUuid: 'obs-2', isDeleted: false, value: 'Stable' };
    const removed = { obsUuid: 'obs-3', isDeleted: false, value: 'Old' };

    expect(
      planObsChanges(
        [
          { ...saved, value: 'Raised FHR, recheck in 15 min' },
          unchanged,
          { ...removed, isDeleted: true },
          { ...emptyNoteRow(), value: '  Progressing normally ' },
        ],
        [saved, unchanged, removed],
        serializeNote
      )
    ).toEqual([
      {
        action: 'update',
        uuid: 'obs-1',
        value: 'Raised FHR, recheck in 15 min',
      },
      { action: 'delete', uuid: 'obs-3' },
      { action: 'create', value: 'Progressing normally' },
    ]);
  });

  it('sends nothing for a new row that was removed again', () => {
    expect(
      planObsChanges(
        [{ ...emptyNoteRow(), isDeleted: true }],
        [],
        serializeNote
      )
    ).toEqual([]);
  });
});

describe('reading saved entries into rows', () => {
  it('reads saved IV fluids, numbers as text', () => {
    expect(
      ivFluidRow({
        uuid: 'obs-1',
        value: {
          type: 'Other',
          otherType: 'Mannitol',
          infusionRate: 20 as unknown as string,
          infusionStatus: 'Start',
        },
        ...SIGNED,
      })
    ).toEqual({
      obsUuid: 'obs-1',
      isDeleted: false,
      type: 'Other',
      otherType: 'Mannitol',
      infusionRate: '20',
      infusionStatus: 'Start',
    });
  });

  it('opens a plain-text oxytocin or IV value as an empty row to fill in', () => {
    expect(oxytocinRow({ uuid: 'o', value: 'NO', ...SIGNED })).toEqual({
      ...emptyOxytocinRow(),
      obsUuid: 'o',
    });
    expect(ivFluidRow({ uuid: 'i', value: 'NO', ...SIGNED })).toEqual({
      ...emptyIvFluidRow(),
      obsUuid: 'i',
    });
  });

  it('stores no other IV type when "Other" was left blank', () => {
    expect(
      JSON.parse(
        serializeIvFluid({
          ...emptyIvFluidRow(),
          type: 'Other',
          otherType: ' ',
        })
      ).otherType
    ).toBeNull();
  });

  it('reads a medicine value that holds only its form', () => {
    expect(parseMedicine('Tablet')).toMatchObject({
      typeOfMedicine: 'Tablet',
      medicineName: '',
      strength: '',
    });
  });

  it('reads an amount with an empty unit', () => {
    expect(
      parseMedicine('Tablet | Iron | 5 mg | 2:: | OD | Oral | ::Days')
    ).toMatchObject({
      dosage: '2',
      dosageUnit: '',
      duration: '',
      durationUnit: 'Days',
    });
  });
});

describe('recordedBy', () => {
  const entry = {
    initial: 'Dr. Joshi',
    obsDatetime: new Date(2026, 10, 2, 19, 5).toISOString(),
  };

  it('says who recorded an entry and when', () => {
    expect(recordedBy(entry)).toBe('Dr. Joshi (02-11-2026 07:05 PM)');
  });

  it('gives only the time where the dialog lists no name', () => {
    expect(recordedBy(entry, false)).toBe('(02-11-2026 07:05 PM)');
  });

  it('leaves the time blank when it cannot be read', () => {
    expect(recordedBy({ ...entry, obsDatetime: 'bad' })).toBe('Dr. Joshi ()');
  });
});
