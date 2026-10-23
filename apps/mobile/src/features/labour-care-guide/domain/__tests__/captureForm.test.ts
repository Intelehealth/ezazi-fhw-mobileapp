import { FIELD_ID, SECTION_ID, getCardErrors, getCardLayout, type CardLayout } from '@ezazi/clinical-rules';

import { errorsByTab, initialCaptureValues, toCardInput } from '../captureForm';

const halfHour = getCardLayout('Stage1_Hour1_2') as CardLayout;
const exam = getCardLayout('Stage1_Hour1_1') as CardLayout;

describe('initialCaptureValues', () => {
  it('starts a new card empty, with the Medication answers on "No" as Android', () => {
    const form = initialCaptureValues(halfHour);

    expect(form.values[FIELD_ID.BASELINE_FHR]).toBe('');
    expect(form.values).not.toHaveProperty(FIELD_ID.PULSE); // not on a half-hour card
    expect(form[FIELD_ID.OXYTOCIN].answer).toBe('no');
    expect(form[FIELD_ID.MEDICINE]).toEqual({ answer: 'no', medicines: [] });
    expect(form.notes).toEqual({ [FIELD_ID.ASSESSMENT]: [], [FIELD_ID.PLAN]: [] });
  });

  it('loads an edited card from its newest stored values', () => {
    const form = initialCaptureValues(halfHour, [
      { uuid: 'b', fieldId: FIELD_ID.BASELINE_FHR, value: '150', createdAt: '2026-10-23 10:05:00' },
      { uuid: 'a', fieldId: FIELD_ID.BASELINE_FHR, value: '165', createdAt: '2026-10-23 10:00:00' },
      { uuid: 'c', fieldId: FIELD_ID.OXYTOCIN, value: '{"infusionRate":"20","strength":"5"}', createdAt: '2026-10-23 10:00:00' },
      { uuid: 'd', fieldId: FIELD_ID.MEDICINE, value: 'Tablet | Paracetamol | 500 mg | 1::Tab |  | Oral | ::', createdAt: '2026-10-23 10:00:00' },
    ]);

    expect(form.values[FIELD_ID.BASELINE_FHR]).toBe('150');
    expect(form[FIELD_ID.OXYTOCIN]).toEqual({ answer: 'yes', entry: { infusionRate: '20', strength: '5' } });
    expect(form[FIELD_ID.MEDICINE].answer).toBe('yes');
    expect(form[FIELD_ID.MEDICINE].medicines[0].name).toBe('Paracetamol');
  });
});

describe('toCardInput', () => {
  it('passes only the fields the card shows', () => {
    const form = initialCaptureValues(halfHour);
    form.values[FIELD_ID.PULSE] = '80'; // not on this card

    const input = toCardInput(form, halfHour);
    expect(input.values).not.toHaveProperty(FIELD_ID.PULSE);
    expect(input[FIELD_ID.MEDICINE]).toEqual({ answer: 'no', medicines: [] });
  });
});

describe('errorsByTab', () => {
  it('counts errors per tab and points at the first tab with one, in tab order', () => {
    const form = initialCaptureValues(exam);
    form.values[FIELD_ID.BASELINE_FHR] = '300';
    form.values[FIELD_ID.PULSE] = '10';
    form[FIELD_ID.OXYTOCIN] = { answer: 'yes', entry: {} };

    const { counts, firstTab } = errorsByTab(getCardErrors(toCardInput(form, exam), 'default'), exam);
    expect(counts).toEqual({ [SECTION_ID.BABY]: 1, [SECTION_ID.WOMAN]: 1, [SECTION_ID.MEDICATION]: 1 });
    expect(firstTab).toBe(SECTION_ID.BABY);
  });

  it('reports no tab when the card is valid', () => {
    expect(errorsByTab(getCardErrors(toCardInput(initialCaptureValues(exam), exam), 'default'), exam)).toEqual({
      counts: {},
      firstTab: null,
    });
  });
});
