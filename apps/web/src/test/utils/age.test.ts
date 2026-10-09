import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calculateAge } from '../../utils/age';

describe('calculateAge', () => {
  beforeEach(() => {
    /* Only Date is faked, so nothing else in the test depends on timers. */
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 15));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null for a blank or unparseable birthdate', () => {
    expect(calculateAge('')).toBeNull();
    expect(calculateAge('not-a-date')).toBeNull();
  });

  it('counts the birthday as passed when its month is earlier this year', () => {
    expect(calculateAge('2000-03-10')).toBe(26);
  });

  it('counts the birthday as passed on the day itself', () => {
    expect(calculateAge('2000-06-15')).toBe(26);
  });

  it('counts the birthday as passed earlier in the same month', () => {
    expect(calculateAge('2000-06-01')).toBe(26);
  });

  it('has not counted the birthday later in the same month', () => {
    expect(calculateAge('2000-06-16')).toBe(25);
  });

  it('has not counted the birthday when its month is later this year', () => {
    expect(calculateAge('2000-09-01')).toBe(25);
  });
});
