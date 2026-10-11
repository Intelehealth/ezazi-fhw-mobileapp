import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

/**
 * Timestamps for storage and the wire. Deliberately separate from
 * `calendar.ts`, which formats for display and branches on the deployment's
 * calendar system — these values go to SQLite and to the server, so they must
 * never be localised, never Bikram Sambat, and never deployment-dependent.
 */

/**
 * What the legacy app writes to every `modified_date` and sends on push:
 * Java's `yyyy-MM-dd'T'HH:mm:ss.SSSZ`, in LOCAL time rather than UTC. dayjs's
 * `ZZ` is the no-colon offset that matches Java's `Z`.
 * Changing this changes what the server receives.
 */
export function localIsoTimestamp(): string {
  return dayjs().format('YYYY-MM-DDTHH:mm:ss.SSSZZ');
}

/**
 * The same shape in UTC. The legacy is inconsistent about which it writes —
 * patient and visit rows carry local time, encounter and obs rows carry UTC —
 * and both reach the server, so the split is preserved rather than unified.
 */
export function utcIsoTimestamp(): string {
  return dayjs().utc().format('YYYY-MM-DDTHH:mm:ss.SSSZZ');
}
