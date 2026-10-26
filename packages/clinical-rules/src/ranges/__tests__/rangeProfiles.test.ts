import { describe, it, expect } from 'vitest';
import { BASE_RANGES } from '../baseRanges';
import {
  RANGE_PROFILES,
  getRangeProfileIds,
  getValidationRange,
  getValidationRanges,
} from '../rangeProfiles';
import type { RangeId, RangeOverrides, RangeProfileId, ValidationRange } from '../types';
import { INFUSION_INPUT_LIMITS, INPUT_LIMITS } from '../inputLimits';

const RANGE_IDS = Object.keys(BASE_RANGES) as RangeId[];
const PROFILE_IDS = Object.keys(RANGE_PROFILES) as RangeProfileId[];

/** What each range's input box accepts (Android InputFilter): largest value and decimals. */
function inputLimits(): Record<RangeId, { max: number; decimals: number }> {
  const limits: Partial<Record<RangeId, { max: number; decimals: number }>> = {};
  for (const id of RANGE_IDS) {
    const limit = { ...INPUT_LIMITS, ...INFUSION_INPUT_LIMITS }[id];
    if (limit.kind === 'integer') limits[id] = { max: 10 ** limit.maxDigits - 1, decimals: 0 };
    if (limit.kind === 'decimal') {
      limits[id] = {
        max: 10 ** limit.maxIntegerDigits - 10 ** -limit.maxFractionDigits,
        decimals: limit.maxFractionDigits,
      };
    }
  }
  return limits as Record<RangeId, { max: number; decimals: number }>;
}

const decimalsOf = (value: number): number => (String(value).split('.')[1] ?? '').length;

describe('base ranges (Android)', () => {
  it('holds the min/max Android enforces', () => {
    expect(Object.fromEntries(RANGE_IDS.map((id) => [id, [BASE_RANGES[id].min, BASE_RANGES[id].max]]))).toEqual({
      baselineFhr: [90, 220],
      pulse: [30, 250],
      systolicBp: [30, 300],
      diastolicBp: [20, 180],
      temperature: [89.6, 109.0],
      contractionDuration: [0, 100],
      oxytocinStrength: [1, 10],
      infusionRate: [5, 60],
    });
  });

  it('records the unit and when Android checks each range', () => {
    expect(Object.fromEntries(RANGE_IDS.map((id) => [id, [BASE_RANGES[id].unit, BASE_RANGES[id].checkedOn]]))).toEqual({
      baselineFhr: ['bpm', 'save'],
      pulse: ['bpm', 'save'],
      systolicBp: ['mmHg', 'save'],
      diastolicBp: ['mmHg', 'save'],
      temperature: ['degF', 'save'],
      contractionDuration: ['seconds', 'save'],
      oxytocinStrength: ['iuPerL', 'typing'],
      infusionRate: ['dropsPerMin', 'saveAndTyping'],
    });
  });

  it('cites the Android line each value comes from', () => {
    expect(Object.fromEntries(RANGE_IDS.map((id) => [id, BASE_RANGES[id].androidSource]))).toEqual({
      baselineFhr: 'AppConstants.java:58-59',
      pulse: 'ValidationConstants.kt:26-27',
      systolicBp: 'ValidationConstants.kt:29-30',
      diastolicBp: 'ValidationConstants.kt:32-33',
      temperature: 'ValidationConstants.kt:35-36',
      contractionDuration: 'AppConstants.java:55-56',
      oxytocinStrength: 'PartogramQueryListingAdapter.java:1250',
      infusionRate: 'Medication.java:117',
    });
  });
});

describe('range profiles (ARCHITECTURE_RULES §7a)', () => {
  it('has a profile per client registered today, all empty, so every client gets Android values', () => {
    expect([...getRangeProfileIds()].sort()).toEqual(['default', 'nepal']);
    for (const profile of PROFILE_IDS) {
      expect(RANGE_PROFILES[profile]).toEqual({});
      expect(getValidationRanges(profile)).toEqual(BASE_RANGES);
    }
  });

  // ── Guard rails, for every profile ───────────────────────────────────────

  it.each(PROFILE_IDS)('profile %s only names known ranges and only changes min/max', (profile) => {
    for (const [id, override] of Object.entries(RANGE_PROFILES[profile])) {
      expect(RANGE_IDS).toContain(id);
      for (const key of Object.keys(override ?? {})) expect(['min', 'max']).toContain(key);
    }
  });

  it.each(PROFILE_IDS)('profile %s keeps 0 <= min < max, within the input box and its decimals', (profile) => {
    const limits = inputLimits();
    for (const [id, range] of Object.entries(getValidationRanges(profile)) as [RangeId, ValidationRange][]) {
      expect(range.min).toBeGreaterThanOrEqual(0);
      expect(range.min).toBeLessThan(range.max);
      expect(range.max).toBeLessThanOrEqual(limits[id].max);
      expect(decimalsOf(range.min)).toBeLessThanOrEqual(limits[id].decimals);
      expect(decimalsOf(range.max)).toBeLessThanOrEqual(limits[id].decimals);
      expect(range.unit).toBe(BASE_RANGES[id].unit);
      expect(range.checkedOn).toBe(BASE_RANGES[id].checkedOn);
    }
  });

  it('rejects a misspelt range id or a unit change at compile time', () => {
    // @ts-expect-error unknown range id
    const misspelt: RangeOverrides = { pulze: { min: 1 } };
    // @ts-expect-error only min and max may be overridden
    const unit: RangeOverrides = { pulse: { unit: 'mmHg' } };
    expect([misspelt, unit]).toHaveLength(2);
  });

  // ── Lookups ──────────────────────────────────────────────────────────────

  it('returns one range for a profile', () => {
    expect(getValidationRange('nepal', 'pulse')).toMatchObject({ min: 30, max: 250, unit: 'bpm' });
  });

  it('rejects an unknown profile instead of silently using another', () => {
    expect(() => getValidationRanges('india' as RangeProfileId)).toThrow(RangeError);
  });

  it('cannot be changed at runtime', () => {
    expect(Object.isFrozen(BASE_RANGES.pulse)).toBe(true);
    expect(Object.isFrozen(RANGE_PROFILES)).toBe(true);
    expect(Object.isFrozen(getValidationRanges('default'))).toBe(true);
    expect(Object.isFrozen(getValidationRange('default', 'pulse'))).toBe(true);
  });
});
