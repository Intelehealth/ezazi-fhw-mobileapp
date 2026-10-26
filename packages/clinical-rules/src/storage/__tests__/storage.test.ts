import { describe, it, expect } from 'vitest';
import { decodeInfusion, encodeInfusion } from '../infusionJson';
import { MEDICINE_REQUIRED_FIELDS, decodeMedicine, encodeMedicine } from '../medicineText';
import type { MedicineEntry } from '../medicineText';
import { isNoResponse } from '../noResponse';
import { NO_RESPONSE_VALUE } from '../../constants';
import { javaTrim } from '../../internal/javaTrim';

describe('infusion JSON (Android Medication.toJson, Gson on ART)', () => {
  it('writes Oxytocin with keys by field name and no null fields', () => {
    expect(encodeInfusion({ strength: '2.5', infusionRate: '20', infusionStatus: 'Started' })).toBe(
      '{"infusionRate":"20","infusionStatus":"Started","strength":"2.5"}',
    );
  });

  it('writes IV Fluids, and Other with its free text, in the same key order', () => {
    expect(encodeInfusion({ infusionStatus: 'Continued', infusionRate: '30', type: 'Normal Saline' })).toBe(
      '{"infusionRate":"30","infusionStatus":"Continued","type":"Normal Saline"}',
    );
    expect(
      encodeInfusion({ type: 'Other', otherType: 'Plasma', infusionRate: '15', infusionStatus: 'Stopped' }),
    ).toBe('{"infusionRate":"15","infusionStatus":"Stopped","otherType":"Plasma","type":"Other"}');
  });

  it('gives the same text whatever order the caller passes fields in', () => {
    const a = encodeInfusion({ type: 'Other', otherType: 'X', infusionRate: '5', infusionStatus: 'Started' });
    const b = encodeInfusion({ infusionStatus: 'Started', infusionRate: '5', otherType: 'X', type: 'Other' });
    expect(a).toBe(b);
  });

  it("HTML-escapes < > & = ' like Gson's default writer", () => {
    expect(encodeInfusion({ type: 'Other', otherType: "A&B <x>='y'" })).toBe(
      '{"otherType":"A\\u0026B \\u003cx\\u003e\\u003d\\u0027y\\u0027","type":"Other"}',
    );
  });

  it('escapes quotes, backslashes, control characters and line separators', () => {
    expect(encodeInfusion({ otherType: 'a"b\\c\nd\te\u2028' })).toBe('{"otherType":"a\\"b\\\\c\\nd\\te\\u2028"}');
  });

  it('writes an empty object when nothing is set', () => {
    expect(encodeInfusion({})).toBe('{}');
  });

  it('reads back what it writes, and Android rows in any key order', () => {
    const entry = { type: 'Other', otherType: 'A&B', infusionRate: '15', infusionStatus: 'Started' };
    expect(decodeInfusion(encodeInfusion(entry))).toEqual(entry);
    expect(decodeInfusion('{"type":"Other","strength":"5","infusionRate":"10","infusionStatus":"Started"}')).toEqual({
      type: 'Other',
      strength: '5',
      infusionRate: '10',
      infusionStatus: 'Started',
    });
  });

  it('ignores unknown keys and reads numbers as text, as Gson does for String fields', () => {
    expect(decodeInfusion('{"infusionRate":20,"strength":2.5,"obsUuid":"x","createdAt":"y"}')).toEqual({
      infusionRate: '20',
      strength: '2.5',
    });
  });

  it.each(['No', '', 'not json', '[]', 'null', '"text"', '42'])('reads %j as no infusion', (stored) => {
    expect(decodeInfusion(stored)).toBeNull();
  });
});

describe('medicine text (Android Medicine.toDBFormat)', () => {
  const medicine: MedicineEntry = {
    form: 'Tablet',
    name: 'Paracetamol',
    strength: '500 mg',
    dosage: '1',
    dosageUnit: 'Tablet',
    frequency: 'Twice daily',
    route: 'Oral',
    duration: '3',
    durationUnit: 'Days',
  };

  it('writes the Android pipe format, with no remark part when there is none', () => {
    expect(encodeMedicine(medicine)).toBe('Tablet | Paracetamol | 500 mg | 1::Tablet | Twice daily | Oral | 3::Days');
    expect(encodeMedicine({ ...medicine, remark: '' })).toBe(encodeMedicine(medicine));
  });

  it('adds the remark as the eighth part', () => {
    expect(encodeMedicine({ ...medicine, remark: 'After food' })).toBe(
      'Tablet | Paracetamol | 500 mg | 1::Tablet | Twice daily | Oral | 3::Days | After food',
    );
  });

  it('keeps empty optional parts in place, as Android does', () => {
    expect(encodeMedicine({ ...medicine, frequency: '', duration: '', durationUnit: '' })).toBe(
      'Tablet | Paracetamol | 500 mg | 1::Tablet |  | Oral | ::',
    );
  });

  it('reads back what it writes', () => {
    expect(decodeMedicine(encodeMedicine(medicine))).toEqual(medicine);
    expect(decodeMedicine(encodeMedicine({ ...medicine, remark: 'After food' }))).toEqual({
      ...medicine,
      remark: 'After food',
    });
  });

  it('keeps an Android "null" part as text, as Android reads it', () => {
    expect(decodeMedicine('Tablet | X | 5 mg | 1::Tablet | null | Oral | null::null')).toMatchObject({
      frequency: 'null',
      duration: 'null',
      durationUnit: 'null',
    });
  });

  it('reads a dose or duration without "::" as value only', () => {
    expect(decodeMedicine('Tablet | X | 5 mg | 1 | Daily | Oral | 3')).toMatchObject({
      dosage: '1',
      dosageUnit: '',
      duration: '3',
      durationUnit: '',
    });
  });

  it('returns null for old or short rows (fewer than 7 parts) instead of crashing like Android', () => {
    expect(decodeMedicine('No')).toBeNull();
    expect(decodeMedicine('Paracetamol | 500 mg | 1::Tablet | 3 | Tablet | Oral')).toBeNull();
  });

  it('lists the parts a medicine needs before it can be saved (Medicine.isValidMedicine)', () => {
    expect(MEDICINE_REQUIRED_FIELDS).toEqual(['name', 'strength', 'dosage', 'dosageUnit', 'form', 'route']);
  });
});

describe('"No" response and Java trim', () => {
  it('writes "No" and recognises it the way Android does', () => {
    expect(NO_RESPONSE_VALUE).toBe('No');
    expect(['No', 'NO', ' no ', 'no', '\tno\n'].every(isNoResponse)).toBe(true);
    expect([null, undefined, '', 'None', 'Yes', 'n o'].some(isNoResponse)).toBe(false);
  });

  it('trims like Java String.trim: control characters and spaces only, not NBSP', () => {
    expect(javaTrim('  a b \t\n')).toBe('a b');
    expect(javaTrim('\u00a0no\u00a0')).toBe('\u00a0no\u00a0');
    expect(isNoResponse('\u00a0No')).toBe(false);
    expect(javaTrim('')).toBe('');
    expect(javaTrim(' \t ')).toBe('');
  });
});
