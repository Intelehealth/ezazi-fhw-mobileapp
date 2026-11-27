function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * `YYYY/MM/DD hh:mm am` in the browser's local time, or null when `value` is
 * blank or not a parseable date — the dashboard's date-time format
 * (dashboard.component.ts's formatDateTimeByClient, moment's
 * `YYYY/MM/DD hh:mm a`).
 */
export function formatDateTime(
  value: string | null | undefined
): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const hours = date.getHours();
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  const meridiem = hours < 12 ? 'am' : 'pm';

  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(hours12)}:${pad(date.getMinutes())} ${meridiem}`;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * `YYYY/MM/DD` in the browser's local time, or null when `value` is blank or
 * unparseable — partogram.component.ts's formatDateByClient() for AD clients.
 */
export function formatDate(value: string | null | undefined): string | null {
  const date = parseDate(value);
  if (!date) return null;
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
}

/**
 * `YYYY/MM/DD HH:mm` in local time, or null — stage3.component.ts's
 * formatColTime() for AD clients.
 */
export function formatDateTime24h(
  value: string | null | undefined
): string | null {
  const date = formatDate(value);
  return date && `${date} ${formatTime(value)}`;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * `YYYY MMMM DD` (e.g. `2026 November 26`) in local time, or null —
 * stage3.component.ts's formatDateYMD() for AD clients.
 */
export function formatYearMonthNameDay(
  value: string | null | undefined
): string | null {
  const date = parseDate(value);
  if (!date) return null;
  return `${date.getFullYear()} ${MONTH_NAMES[date.getMonth()]} ${pad(date.getDate())}`;
}

/** 24-hour `HH:mm` in local time (Angular's `date:'HH:mm'`), or null. */
export function formatTime(value: string | null | undefined): string | null {
  const date = parseDate(value);
  if (!date) return null;
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 12-hour `hh:mm AM` in local time (moment's `hh:mm A`), or null. */
export function formatTime12h(value: string | null | undefined): string | null {
  const date = parseDate(value);
  if (!date) return null;
  const hours = date.getHours();
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  const meridiem = hours < 12 ? 'AM' : 'PM';
  return `${pad(hours12)}:${pad(date.getMinutes())} ${meridiem}`;
}

/** `DD-MM-YYYY HH:mm` in local time (Angular's `date:'dd-MM-YYYY HH:mm'`), or null. */
export function formatDayMonthYearTime(
  value: string | null | undefined
): string | null {
  const date = parseDate(value);
  if (!date) return null;
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${formatTime(value)}`;
}

/** `DD-MM-YYYY hh:mm AM` in local time (Angular's `date:'dd-MM-YYYY hh:mm a'`), or null. */
export function formatDayMonthYearTime12h(
  value: string | null | undefined
): string | null {
  const date = parseDate(value);
  if (!date) return null;
  const hours = date.getHours();
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  const meridiem = hours < 12 ? 'AM' : 'PM';
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(hours12)}:${pad(date.getMinutes())} ${meridiem}`;
}

const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T/;
const DAY_MONTH_YEAR =
  /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?)?$/;

/**
 * The dates the FHW app records on a labour visit, in the formats
 * partogram.component.ts accepts (moment, strict): ISO 8601, or
 * `DD/MM/YYYY`, `DD/MM/YYYY HH:mm` and `DD/MM/YYYY hh:mm A`. A date with no
 * time is local midnight, as moment reads it. Null for anything else.
 */
export function parseClinicalDate(
  value: string | null | undefined
): Date | null {
  const text = value?.trim();
  if (!text) return null;

  const dateOnly = ISO_DATE_ONLY.exec(text);
  if (dateOnly) {
    const [, year, month, day] = dateOnly.map(Number);
    return validLocalDate(year, month, day, 0, 0);
  }
  if (ISO_DATE_TIME.test(text)) return parseDate(text);

  const dayMonthYear = DAY_MONTH_YEAR.exec(text);
  if (!dayMonthYear) return null;
  const [, day, month, year, hourText, minuteText, meridiem] = dayMonthYear;
  let hours = hourText ? Number(hourText) : 0;
  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    hours = (hours % 12) + (/p/i.test(meridiem) ? 12 : 0);
  }
  return validLocalDate(
    Number(year),
    Number(month),
    Number(day),
    hours,
    minuteText ? Number(minuteText) : 0
  );
}

/** The local date, or null when a part overflows (31/02, 25:00…) instead of rolling over. */
function validLocalDate(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number
): Date | null {
  const date = new Date(year, month - 1, day, hours, minutes);
  const matches =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date.getHours() === hours &&
    date.getMinutes() === minutes;
  return matches ? date : null;
}
