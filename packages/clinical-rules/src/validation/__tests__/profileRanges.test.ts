import { describe, it, expect, vi } from 'vitest';

// A client profile that changes pulse, as a real Nepal change would; every other range stays Android's.
vi.mock('../../ranges/rangeProfiles', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../ranges/rangeProfiles')>();
  const nepal = { ...actual.getValidationRanges('nepal'), pulse: { ...actual.getValidationRanges('nepal').pulse, min: 40, max: 200 } };
  return {
    ...actual,
    getValidationRanges: (profile: 'default' | 'nepal') => (profile === 'nepal' ? nepal : actual.getValidationRanges(profile)),
    getValidationRange: (profile: 'default' | 'nepal', id: keyof typeof nepal) =>
      profile === 'nepal' ? nepal[id] : actual.getValidationRange(profile, id),
  };
});

const { getCardErrors } = await import('../saveRules');

describe('validation uses the client profile it is given', () => {
  it('applies the changed range to that client only', () => {
    expect(getCardErrors({ values: { pulse: '35' } }, 'nepal').map((e) => [e.reason, e.range?.min, e.range?.max])).toEqual([
      ['outOfRange', 40, 200],
    ]);
    expect(getCardErrors({ values: { pulse: '35' } }, 'default')).toEqual([]);
    expect(getCardErrors({ values: { pulse: '210' } }, 'nepal')[0]?.reason).toBe('outOfRange');
    expect(getCardErrors({ values: { pulse: '210' } }, 'default')).toEqual([]);
  });

  it('keeps every other range for that client', () => {
    expect(getCardErrors({ values: { baselineFhr: '89', temperature: '109.1' } }, 'nepal').map((e) => e.id)).toEqual([
      'baselineFhr',
      'temperature',
    ]);
  });
});
