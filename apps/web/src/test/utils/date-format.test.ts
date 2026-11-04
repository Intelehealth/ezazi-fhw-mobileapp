import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatDayMonthYearTime,
  formatTime,
} from '../../utils/date-format';

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
