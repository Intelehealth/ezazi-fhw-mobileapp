import { describe, expect, it } from 'vitest';
import { formatDateTime } from '../../utils/date-format';

describe('formatDateTime', () => {
  it('formats as YYYY/MM/DD hh:mm am|pm in local time', () => {
    expect(formatDateTime(new Date(2026, 9, 5, 9, 7).toISOString())).toBe(
      '2026/10/05 09:07 am'
    );
    expect(formatDateTime(new Date(2026, 9, 5, 21, 30).toISOString())).toBe(
      '2026/10/05 09:30 pm'
    );
  });

  it('shows midnight and noon as 12', () => {
    expect(formatDateTime(new Date(2026, 0, 1, 0, 0).toISOString())).toBe(
      '2026/01/01 12:00 am'
    );
    expect(formatDateTime(new Date(2026, 0, 1, 12, 0).toISOString())).toBe(
      '2026/01/01 12:00 pm'
    );
  });

  it.each([null, undefined, '', 'not a date'])('returns null for %j', value => {
    expect(formatDateTime(value)).toBeNull();
  });
});
