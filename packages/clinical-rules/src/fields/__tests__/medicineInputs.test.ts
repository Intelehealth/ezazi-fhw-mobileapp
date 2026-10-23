import { describe, expect, it } from 'vitest';

import {
  MEDICINE_CATALOGUE,
  MEDICINE_DOSE_UNIT_OPTIONS,
  MEDICINE_DURATION_UNIT_OPTIONS,
  MEDICINE_FORM_OPTIONS,
  MEDICINE_FREQUENCY_OPTIONS,
  MEDICINE_ROUTE_OPTIONS,
  MEDICINE_STRENGTH_OPTIONS,
  catalogueLabel,
  findCatalogueMedicine,
} from '../medicineInputs';
import { MEDICINE_REQUIRED_FIELDS } from '../../storage/medicineText';

// Literal copies of Android res/values/arrays_ezazi.xml (whitelabel-master b3ddd15), kept
// independent of the data file: duplicates and spellings are Android's own.
const ANDROID = {
  form: ['Capsule', 'Tablet', 'Injection', 'IV Fluid', 'Liquid', 'Drop', 'Inhaler', 'Suppositorie', 'Topical', 'Implant', 'Patche'],
  strength: ['5 mg', '10 mg', '50 mg', '75 mg', '100 mg', '500 mg', '1000 mg', '100 mg', '150 mg', '200 mg', '250 mg',
    '750 mg', '-', '2000 mg', '5%', '0.9%', '10 IU/mL', '5 IU/mL', '25 mg/mL', '30 mg/mL', '125 ug', '5 mg/mL', '1 mg/mL',
    '2%', '4 mg/mL', '100 mg/mL', '500  mg/mL', '500 mg/100 mL mg/mL', '20 mg/mL', '40 mg/mL', '10 mg/mL', '200 ug',
    '400  mg', '650  mg'],
  doseUnit: ['mL', 'mg', 'ug', '%', 'IU', 'Tab', 'Cap', 'Drop'],
  route: ['Oral', 'Sublingual (SL)', 'Intravenous (IV)', 'IV Infusion', 'Intramuscular (IM)', 'Subcutaneous (SC)',
    'Intradermal (ID)'],
  frequency: ['Once daily (OD)', 'Twice daily (BD)', 'Thrice daily (TID)', 'Four times in a day (QID)',
    'Single Dose, Stat Dose', 'Single Dose, Stat Dose', 'As required (SOS)'],
  durationUnit: ['Minute', 'Minutes', 'Hour', 'Hours', 'Day', 'Days'],
};

describe('medicine form lists', () => {
  it('copies every Android list exactly, in order, duplicates included', () => {
    expect(MEDICINE_FORM_OPTIONS).toEqual(ANDROID.form);
    expect(MEDICINE_STRENGTH_OPTIONS).toEqual(ANDROID.strength);
    expect(MEDICINE_DOSE_UNIT_OPTIONS).toEqual(ANDROID.doseUnit);
    expect(MEDICINE_ROUTE_OPTIONS).toEqual(ANDROID.route);
    expect(MEDICINE_FREQUENCY_OPTIONS).toEqual(ANDROID.frequency);
    expect(MEDICINE_DURATION_UNIT_OPTIONS).toEqual(ANDROID.durationUnit);
  });
});

describe('medicine catalogue', () => {
  it('holds the 39 medicines.json entries in file order', () => {
    expect(MEDICINE_CATALOGUE).toHaveLength(39);
    expect(MEDICINE_CATALOGUE[0]).toEqual({
      name: 'Ampicillin', form: 'Capsule', strength: '500 mg', dosageUnit: 'Cap', route: 'Oral',
    });
    expect(MEDICINE_CATALOGUE[38]).toEqual({
      name: 'Ceftriaxone', form: 'Injection', strength: '2000 mg', dosageUnit: 'mL', route: 'Intravenous (IV)',
    });
  });

  it('labels an entry as Android does: form, name, strength', () => {
    expect(catalogueLabel(MEDICINE_CATALOGUE[2])).toBe('Tablet Paracetamol 650 mg');
  });

  it('finds every entry by its own label, ignoring case', () => {
    for (const medicine of MEDICINE_CATALOGUE) {
      expect(findCatalogueMedicine(catalogueLabel(medicine))).toBe(medicine);
      expect(findCatalogueMedicine(catalogueLabel(medicine).toLowerCase())).toBe(medicine);
    }
  });

  it('returns null for a medicine typed by hand', () => {
    expect(findCatalogueMedicine('Paracetamol')).toBeNull();
    expect(findCatalogueMedicine('')).toBeNull();
  });

  it('fills every part a picked medicine needs except the dose the nurse enters', () => {
    const filled = new Set(['name', 'form', 'strength', 'dosageUnit', 'route']);
    expect(MEDICINE_REQUIRED_FIELDS.filter((part) => !filled.has(part))).toEqual(['dosage']);
    for (const medicine of MEDICINE_CATALOGUE) {
      for (const part of filled) expect(medicine[part as keyof typeof medicine]).not.toBe('');
    }
  });
});
