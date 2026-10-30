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
