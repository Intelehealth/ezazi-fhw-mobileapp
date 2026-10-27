import { getCardLayout, getSosLayout } from '@ezazi/clinical-rules';

import { toFieldRows, toTabViews } from '../captureFieldView';

const tabsOf = (name: string) => toTabViews(getCardLayout(name)!, 'default');
const fieldOf = (name: string, id: string) => tabsOf(name).flatMap((tab) => tab.fields).find((field) => field.id === id)!;

describe('toTabViews', () => {
  it('gives a card only the tabs and fields Android shows on it', () => {
    expect(tabsOf('Stage1_Hour1_2').map((tab) => tab.id)).toEqual(['baby', 'labourProgress', 'medication', 'sharedDecisionMaking']);
    expect(tabsOf('Stage1_Hour1_1')).toHaveLength(6);
    expect(toTabViews(getSosLayout('stage1'), 'default')).toHaveLength(6);
  });

  it('names each field\'s control, with options flagged for alerts', () => {
    const companion = fieldOf('Stage1_Hour1_1', 'companion');
    expect(companion.control).toBe('segmented');
    expect(companion.options.map((option) => [option.value, option.alert])).toEqual([
      ['Y', false],
      ['N', true],
      ['D', false],
    ]);
    expect(fieldOf('Stage1_Hour1_1', 'amnioticFluid').control).toBe('picker');
    expect(fieldOf('Stage1_Hour1_1', 'cervix').control).toBe('chips');
  });

  it('gives steppers their bounds from the range profile, and no other field any', () => {
    expect(fieldOf('Stage1_Hour1_1', 'baselineFhr').bounds).toMatchObject({ min: 90, max: 220, base: 110, step: 1 });
    expect(fieldOf('Stage1_Hour1_1', 'temperature').bounds).toMatchObject({ step: 0.1, fractionDigits: 1 });
    expect(fieldOf('Stage1_Hour1_1', 'companion').bounds).toBeNull();
  });
});

describe('toFieldRows', () => {
  it('puts two steppers side by side and every other field alone', () => {
    const woman = tabsOf('Stage1_Hour1_1').find((tab) => tab.id === 'woman')!;
    expect(toFieldRows(woman.fields).map((row) => row.map((field) => field.id))).toEqual([
      ['pulse', 'systolicBp'],
      ['diastolicBp', 'temperature'],
      ['urineProtein'],
      ['urineAcetone'],
    ]);
  });

  it('leaves a lone stepper on its own row', () => {
    const baby = tabsOf('Stage1_Hour1_1').find((tab) => tab.id === 'baby')!;
    expect(toFieldRows(baby.fields)[0].map((field) => field.id)).toEqual(['baselineFhr']);
  });
});
