import { localIsoTimestamp } from '../datetime';

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
