import {
  ageInYears,
  epochToIso,
  minutesFromNow,
  minutesUntil,
  localIsoTimestamp,
  utcIsoTimestamp,
  utcTimestampToIso,
} from '../datetime';

/**
 * Pins the wire format. The server parses these with Java's
 * `yyyy-MM-dd'T'HH:mm:ss.SSSZ`, so a drift here is not a cosmetic change —
 * it is a value the backend may reject or misread.
 */

describe('localIsoTimestamp', () => {
  it('matches the Java pattern, offset without a colon', () => {
    // `+05:30` would be dayjs's Z; Java's Z is `+0530`.
    expect(localIsoTimestamp()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{4}$/);
  });

  it('is local time, not UTC', () => {
    // toISOString() is UTC; anywhere off GMT these must differ.
    const now = new Date();
    const [, hours, minutes] = /T(\d{2}):(\d{2})/.exec(localIsoTimestamp()) ?? [];

    expect(Number(hours)).toBe(now.getHours());
    expect(Number(minutes)).toBe(now.getMinutes());
  });

  it('pads milliseconds to three digits', () => {
    // A 2-digit millisecond field shifts every later character.
    const [, ms] = /\.(\d+)[+-]/.exec(localIsoTimestamp()) ?? [];

    expect(ms).toHaveLength(3);
  });
});

/**
 * A SEPARATE pattern from the local one. The legacy writes its UTC clock with
 * `AppConstants.UTC_FORMAT = "yyyy-MM-dd HH:mm:ss"`, and the pull returns that
 * shape too — so this had no test and drifted to the local ISO shape unnoticed.
 */
describe('utcIsoTimestamp', () => {
  it('matches the Java UTC pattern — space separator, no millis, no offset', () => {
    expect(utcIsoTimestamp()).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('is NOT the local shape — the two formats are different on purpose', () => {
    expect(utcIsoTimestamp()).not.toContain('T');
    expect(utcIsoTimestamp()).not.toMatch(/[+-]\d{4}$/);
  });

  it('sorts correctly against the shape the pull sends', () => {
    // created_date is TEXT, compared lexicographically. ' ' (0x20) sorts below
    // 'T' (0x54), so a mixed column puts every local row above every pulled one.
    const pulled = '2026-10-09 12:17:43';
    expect([utcIsoTimestamp(), pulled].sort()).toEqual([pulled, utcIsoTimestamp()]);
  });

  it('formats a given instant instead of now when one is passed', () => {
    expect(utcIsoTimestamp(Date.UTC(2026, 9, 23, 7, 5, 9))).toBe('2026-10-23 07:05:09');
    expect(localIsoTimestamp(Date.UTC(2026, 9, 23, 7, 5, 9))).toMatch(/^2026-10-2\d/);
  });

  it('is UTC, not local time', () => {
    const now = new Date();
    const [, hours] = /\d{4}-\d{2}-\d{2} (\d{2}):/.exec(utcIsoTimestamp()) ?? [];

    expect(Number(hours)).toBe(now.getUTCHours());
  });
});

describe('utcTimestampToIso / epochToIso', () => {
  it('reads a stored UTC time as ISO, and nothing for unreadable text', () => {
    expect(utcTimestampToIso('2026-10-23 07:05:09')).toBe('2026-10-23T07:05:09.000Z');
    expect(utcTimestampToIso('')).toBeNull();
    expect(utcTimestampToIso(null)).toBeNull();
    expect(utcTimestampToIso('2026-02-30 00:00:00')).toBeNull();
  });

  it('writes epoch ms as ISO in UTC', () => {
    expect(epochToIso(Date.UTC(2026, 9, 23, 7, 5, 9))).toBe('2026-10-23T07:05:09.000Z');
  });
});

describe('minutesUntil / minutesFromNow', () => {
  const NOW = Date.UTC(2026, 9, 23, 10, 0, 0);

  it('adds whole minutes to a time', () => {
    expect(minutesFromNow(15, NOW)).toBe(Date.UTC(2026, 9, 23, 10, 15, 0));
  });

  it('counts whole minutes to a later time, and 0 once it has passed', () => {
    expect(minutesUntil('2026-10-23T10:30:20.000Z', NOW)).toBe(30);
    expect(minutesUntil('2026-10-23T09:00:00.000Z', NOW)).toBe(0);
  });
});

describe('ageInYears', () => {
  const NOW = Date.UTC(2026, 9, 23, 10, 0, 0);

  it('counts whole years from the birth date', () => {
    expect(ageInYears('1998-04-12', NOW)).toBe(28);
    expect(ageInYears('1998-12-31', NOW)).toBe(27);
    expect(ageInYears(null, NOW)).toBeNull();
  });
});
