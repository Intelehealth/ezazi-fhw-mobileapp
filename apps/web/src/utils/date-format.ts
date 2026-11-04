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

/** 24-hour `HH:mm` in local time (Angular's `date:'HH:mm'`), or null. */
export function formatTime(value: string | null | undefined): string | null {
  const date = parseDate(value);
  if (!date) return null;
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** `DD-MM-YYYY HH:mm` in local time (Angular's `date:'dd-MM-YYYY HH:mm'`), or null. */
export function formatDayMonthYearTime(
  value: string | null | undefined
): string | null {
  const date = parseDate(value);
  if (!date) return null;
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${formatTime(value)}`;
}
