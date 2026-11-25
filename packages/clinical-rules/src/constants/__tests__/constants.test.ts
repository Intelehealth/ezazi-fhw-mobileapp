import { describe, it, expect } from 'vitest';
import * as pkg from '../../index';
import { formatCardName, formatSosName } from '../../cards/cardName';
import { getStage1And2Fields } from '../../fields/cardFields';
import { STAGE1_AND_2_FIELDS } from '../../fields/stage1And2Fields';
import {
  fieldLabelKey,
  infusionInputLabelKey,
  optionLabelKey,
  sectionLabelKey,
  validationMessageKey,
} from '../i18nKeys';

describe('name builders', () => {
  it('builds every translation key in one shape', () => {
    expect(fieldLabelKey('pulse')).toBe('partogram.field.pulse');
    expect(optionLabelKey('caput', 'plus1')).toBe('partogram.option.caput.plus1');
    expect(sectionLabelKey('woman')).toBe('partogram.section.woman');
    expect(infusionInputLabelKey('infusionRate')).toBe('partogram.infusion.infusionRate');
    expect(validationMessageKey('pulse', 'outOfRange')).toBe('partogram.validation.pulse.outOfRange');
  });

  it('builds card and SOS names exactly as Android stores them, Stage 4 with digit 3', () => {
    expect(formatCardName('stage1', 3, 2)).toBe('Stage1_Hour3_2');
    expect(formatCardName('stage2', 5, 4)).toBe('Stage2_Hour5_4');
    expect(formatSosName('stage1', 3, 2)).toBe('Stage1_Hour3_SOS2');
    expect(formatSosName('stage4', 2, 1)).toBe('Stage3_Hour2_SOS1');
  });

  it('returns the field list itself from getStage1And2Fields', () => {
    expect(getStage1And2Fields()).toBe(STAGE1_AND_2_FIELDS);
  });
});

describe('package entry point', () => {
  it('exports every public function and data table, all defined', () => {
    const missing = Object.entries(pkg).filter(([, value]) => value === undefined).map(([name]) => name);
    expect(missing).toEqual([]);
    for (const name of ['decideNextStep', 'decideSos', 'getCardErrors', 'getRangeFor', 'getCardLayout', 'encodeInfusion']) {
      expect(typeof (pkg as Record<string, unknown>)[name]).toBe('function');
    }
    for (const name of ['FIELD_ID', 'BASE_RANGES', 'INPUT_LIMITS', 'INFUSION_INPUT_LIMITS', 'STAGE1_AND_2_FIELDS']) {
      expect(Object.isFrozen((pkg as Record<string, unknown>)[name])).toBe(true);
    }
  });
});
