import { describe, it, expect } from 'vitest';
import {
  MS_PER_MINUTE,
  assertEpochMs,
  formatUtcTimestamp,
  parseUtcTimestamp,
  wholeMinutesBetween,
} from '../utcTimestamp';

const T = Date.UTC(2026, 9, 14, 8, 30, 5);

describe('parseUtcTimestamp', () => {

  // ── Android's shape ──────────────────────────────────────────────────────

  it('reads yyyy-MM-dd HH:mm:ss as UTC', () => {
    expect(parseUtcTimestamp('2026-10-14 08:30:05')).toBe(T);
    expect(parseUtcTimestamp('2026-01-01 00:00:00')).toBe(Date.UTC(2026, 0, 1));
    expect(parseUtcTimestamp('2026-12-31 23:59:59')).toBe(Date.UTC(2026, 11, 31, 23, 59, 59));
  });

  it('ignores a fractional-seconds suffix, as Android SimpleDateFormat does', () => {
    expect(parseUtcTimestamp('2026-10-14 08:30:05.0')).toBe(T);
    expect(parseUtcTimestamp('2026-10-14 08:30:05.123')).toBe(T);
    expect(parseUtcTimestamp('2026-10-14 08:30:05.999999999')).toBe(T);
  });

  it.each([
    ['Devanagari (mr, ne, hi)', '२०२६-१०-१४ ०८:३०:०५'],
    ['Bengali (bn, as)', '২০২৬-১০-১৪ ০৮:৩০:০৫'],
    ['Arabic-Indic (ar)', '٢٠٢٦-١٠-١٤ ٠٨:٣٠:٠٥'],
    ['Eastern Arabic-Indic (fa, ur)', '۲۰۲۶-۱۰-۱۴ ۰۸:۳۰:۰۵'],
    ['Gujarati', '૨૦૨૬-૧૦-૧૪ ૦૮:૩૦:૦૫'],
  ])('reads native digits Android may write on a %s device', (_label, text) => {
    expect(parseUtcTimestamp(text)).toBe(T);
  });

  it('accepts 29 February in a leap year only', () => {
    expect(parseUtcTimestamp('2028-02-29 00:00:00')).toBe(Date.UTC(2028, 1, 29));
    expect(parseUtcTimestamp('2027-02-29 00:00:00')).toBeNull();
  });

  it('reads years below 100 as written, not as 19xx', () => {
    const parsed = parseUtcTimestamp('0026-10-14 08:30:05') as number;
    expect(new Date(parsed).getUTCFullYear()).toBe(26);
    expect(formatUtcTimestamp(parsed)).toBe('0026-10-14 08:30:05');
  });

  // ── Deliberate deviations: Android's lenient parser reads these, we reject them ──

  it.each([
    ['ISO with T', '2026-10-14T08:30:05'],
    ['an offset', '2026-10-14 08:30:05+0530'],
    ['a Z suffix', '2026-10-14 08:30:05Z'],
    ['no seconds', '2026-10-14 08:30'],
    ['leading space', ' 2026-10-14 08:30:05'],
    ['trailing space', '2026-10-14 08:30:05 '],
    ['single-digit fields', '2026-1-5 3:4:9'],
    ['empty text', ''],
  ])('rejects %s (Android is lenient; documented deviation)', (_label, text) => {
    expect(parseUtcTimestamp(text)).toBeNull();
  });

  it.each([
    ['30 February', '2026-02-30 10:00:00'],
    ['month 13', '2026-13-01 10:00:00'],
    ['day 0', '2026-10-00 10:00:00'],
    ['hour 24', '2026-10-14 24:00:00'],
    ['minute 60', '2026-10-14 10:60:00'],
    ['second 60', '2026-10-14 10:00:60'],
  ])('rejects an impossible date instead of rolling it over: %s', (_label, text) => {
    expect(parseUtcTimestamp(text)).toBeNull();
  });
});

describe('formatUtcTimestamp', () => {
  it('writes UTC with zero padding and ASCII digits', () => {
    expect(formatUtcTimestamp(Date.UTC(2026, 0, 5, 3, 4, 9))).toBe('2026-01-05 03:04:09');
    expect(formatUtcTimestamp(T)).toMatch(/^[0-9 :-]+$/);
  });

  it('drops milliseconds, as Android does', () => {
    expect(formatUtcTimestamp(T + 999)).toBe('2026-10-14 08:30:05');
  });

  it('round-trips through parse', () => {
    for (const text of ['2026-12-31 23:59:59', '2026-01-01 00:00:00', '2028-02-29 12:00:00']) {
      expect(formatUtcTimestamp(parseUtcTimestamp(text) as number)).toBe(text);
    }
  });

  it('throws on an invalid epoch', () => {
    expect(() => formatUtcTimestamp(Number.NaN)).toThrow(RangeError);
  });
});

describe('wholeMinutesBetween', () => {
  it('truncates partial minutes, like Java TimeUnit.toMinutes', () => {
    expect(wholeMinutesBetween(0, 59_999)).toBe(0);
    expect(wholeMinutesBetween(0, 60_000)).toBe(1);
    expect(wholeMinutesBetween(0, 30 * 60_000 - 1)).toBe(29);
    expect(wholeMinutesBetween(0, 30 * 60_000)).toBe(30);
  });

  it('truncates toward zero for a time in the future, without -0', () => {
    expect(Object.is(wholeMinutesBetween(30_000, 0), 0)).toBe(true);
    expect(wholeMinutesBetween(60_000, 0)).toBe(-1);
    expect(wholeMinutesBetween(90 * 60_000, 0)).toBe(-90);
  });

  it('uses 60000 ms per minute', () => {
    expect(MS_PER_MINUTE).toBe(60_000);
  });
});

describe('assertEpochMs', () => {
  it('rejects a clock value that is not a finite number', () => {
    expect(() => assertEpochMs(Number.NaN)).toThrow(RangeError);
    expect(() => assertEpochMs(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => assertEpochMs(0)).not.toThrow();
  });
});
