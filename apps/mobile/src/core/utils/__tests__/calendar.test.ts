import { format24HourTime, formatClockTime, formatDate } from '../calendar';

describe('formatDate', () => {
  it('writes a Gregorian date as day, short month and year', () => {
    expect(formatDate(new Date(2026, 9, 27, 21, 5), 'AD')).toBe('27 Oct 2026');
  });
});

describe('formatClockTime / format24HourTime', () => {
  it('writes the clock time with the day period in capitals, as Figma does', () => {
    const text = formatClockTime(new Date(2026, 9, 27, 21, 5));

    expect(text).toBe(text.toUpperCase());
    expect(text).toMatch(/9:05/);
  });

  it('writes the 24-hour clock time', () => {
    expect(format24HourTime(new Date(2026, 9, 27, 21, 5))).toBe('21:05');
  });
});
