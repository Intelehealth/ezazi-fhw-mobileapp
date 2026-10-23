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
export function localIsoTimestamp(at?: number): string {
  return dayjs(at).format('YYYY-MM-DDTHH:mm:ss.SSSZZ');
}

/**
 * A DIFFERENT shape, in UTC: `yyyy-MM-dd HH:mm:ss`, no T, no millis, no offset.
 * The legacy uses a separate pattern for its UTC clock (`AppConstants.UTC_FORMAT`)
 * from its local one, and the pull sends this shape too — so a column holding
 * both would sort ' ' (0x20) below 'T' (0x54) and put every local row above
 * every pulled one whatever the real time. Which entity gets which is the
 * legacy's split, preserved: patient and visit local, encounter and obs UTC.
 */
export function utcIsoTimestamp(at?: number): string {
  return dayjs(at).utc().format('YYYY-MM-DD HH:mm:ss');
}
