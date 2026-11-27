import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatDateTime24h,
  formatDayMonthYearTime,
  formatDayMonthYearTime12h,
  formatTime,
  formatTime12h,
  formatYearMonthNameDay,
  parseClinicalDate,
} from '../../utils/date-format';

describe('formatDateTime24h', () => {
  it('formats as YYYY/MM/DD HH:mm in local time', () => {
    expect(formatDateTime24h(new Date(2026, 10, 26, 21, 5).toISOString())).toBe(
      '2026/11/26 21:05'
    );
  });

  it.each([null, undefined, '', 'not a date'])('returns null for %j', value => {
    expect(formatDateTime24h(value)).toBeNull();
  });
});

describe('formatYearMonthNameDay', () => {
  it('formats as YYYY MMMM DD in local time', () => {
    expect(formatYearMonthNameDay(new Date(2026, 10, 6, 8).toISOString())).toBe(
      '2026 November 06'
    );
  });

  it.each([null, undefined, '', 'not a date'])('returns null for %j', value => {
    expect(formatYearMonthNameDay(value)).toBeNull();
  });
});

describe('formatTime12h', () => {
  it('formats as hh:mm AM|PM in local time, midnight and noon as 12', () => {
    expect(formatTime12h(new Date(2026, 0, 1, 0, 5).toISOString())).toBe(
      '12:05 AM'
    );
    expect(formatTime12h(new Date(2026, 0, 1, 13, 30).toISOString())).toBe(
      '01:30 PM'
    );
  });

  it.each([null, undefined, '', 'not a date'])('returns null for %j', value => {
    expect(formatTime12h(value)).toBeNull();
  });
});

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

describe('formatDate', () => {
  it('formats as YYYY/MM/DD in local time', () => {
    expect(formatDate(new Date(2026, 10, 2, 23, 59).toISOString())).toBe(
      '2026/11/02'
    );
  });

  it.each([null, undefined, '', 'not a date'])('returns null for %j', value => {
    expect(formatDate(value)).toBeNull();
  });
});

describe('formatTime', () => {
  it('formats as 24-hour HH:mm in local time', () => {
    expect(formatTime(new Date(2026, 10, 2, 7, 5).toISOString())).toBe('07:05');
    expect(formatTime(new Date(2026, 10, 2, 21, 30).toISOString())).toBe(
      '21:30'
    );
  });

  it.each([null, undefined, '', 'not a date'])('returns null for %j', value => {
    expect(formatTime(value)).toBeNull();
  });
});

describe('formatDayMonthYearTime', () => {
  it('formats as DD-MM-YYYY HH:mm in local time', () => {
    expect(
      formatDayMonthYearTime(new Date(2026, 10, 2, 7, 5).toISOString())
    ).toBe('02-11-2026 07:05');
  });

  it.each([null, undefined, '', 'not a date'])('returns null for %j', value => {
    expect(formatDayMonthYearTime(value)).toBeNull();
  });
});

describe('formatDayMonthYearTime12h', () => {
  it.each([
    [new Date(2026, 10, 2, 7, 5), '02-11-2026 07:05 AM'],
    [new Date(2026, 10, 2, 0, 30), '02-11-2026 12:30 AM'],
    [new Date(2026, 10, 2, 12, 0), '02-11-2026 12:00 PM'],
    [new Date(2026, 10, 2, 19, 45), '02-11-2026 07:45 PM'],
  ])('formats %s as %s, in local time', (date, expected) => {
    expect(formatDayMonthYearTime12h(date.toISOString())).toBe(expected);
  });

  it.each([null, undefined, '', 'not a date'])('returns null for %j', value => {
    expect(formatDayMonthYearTime12h(value)).toBeNull();
  });
});

describe('parseClinicalDate', () => {
  it.each([
    ['02/11/2026', new Date(2026, 10, 2)],
    ['02/11/2026 07:05', new Date(2026, 10, 2, 7, 5)],
    ['02/11/2026 07:05 PM', new Date(2026, 10, 2, 19, 5)],
    ['02/11/2026 12:30 am', new Date(2026, 10, 2, 0, 30)],
    ['2026-11-02', new Date(2026, 10, 2)],
  ])('reads %j in local time', (text, expected) => {
    expect(parseClinicalDate(text)).toEqual(expected);
  });

  it('reads an ISO date-time as the moment it names', () => {
    expect(parseClinicalDate('2026-11-02T01:35:00.000Z')?.toISOString()).toBe(
      '2026-11-02T01:35:00.000Z'
    );
  });

  it.each([
    null,
    undefined,
    '',
    'I',
    'Unknown',
    '31/02/2026',
    '02/11/2026 25:00',
    '02/11/2026 13:00 PM',
    '11-02-2026',
  ])('returns null for %j', value => {
    expect(parseClinicalDate(value)).toBeNull();
  });
});
