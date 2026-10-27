import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { MS_PER_MINUTE, formatUtcTimestamp, parseUtcTimestamp } from '@ezazi/clinical-rules';

dayjs.extend(utc);

/**
 * Timestamps for storage and the wire. Deliberately separate from
 * `calendar.ts`, which formats for display and branches on the deployment's
 * calendar system — these values go to SQLite and to the server, so they must
 * never be localised, never Bikram Sambat, and never deployment-dependent.
 */

// ── Storage ──────────────────────────────────────────────────────────────────

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
  return formatUtcTimestamp(at ?? Date.now());
}

/** Epoch ms as ISO 8601 (UTC), the form the UI layer passes dates around in. */
export function epochToIso(ms: number): string {
  return new Date(ms).toISOString();
}

/** A stored `yyyy-MM-dd HH:mm:ss` UTC time as ISO 8601 for the UI, or null when unreadable. */
export function utcTimestampToIso(text: string | null): string | null {
  const ms = text ? parseUtcTimestamp(text) : null;
  return ms === null ? null : epochToIso(ms);
}

// ── Arithmetic ───────────────────────────────────────────────────────────────
// Shared so no caller repeats date maths (Kaveri, 2026-10-28).

/** Epoch ms `minutes` after `now`, e.g. when an alarm should next fire. */
export function minutesFromNow(minutes: number, now: number = Date.now()): number {
  return now + minutes * MS_PER_MINUTE;
}

/** Whole minutes from `now` until an ISO time, rounded; 0 once it has passed. */
export function minutesUntil(iso: string, now: number = Date.now()): number {
  return Math.max(0, Math.round((new Date(iso).getTime() - now) / MS_PER_MINUTE));
}

/** Whole years between a `yyyy-MM-dd` birth date and `now`, or null when unknown. */
export function ageInYears(dateOfBirth: string | null, now: number): number | null {
  const match = dateOfBirth ? /^(\d{4})-(\d{2})-(\d{2})/.exec(dateOfBirth) : null;
  if (!match) return null;
  const today = new Date(now);
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const hadBirthday =
    today.getUTCMonth() + 1 > month || (today.getUTCMonth() + 1 === month && today.getUTCDate() >= day);
  return today.getUTCFullYear() - year - (hadBirthday ? 0 : 1);
}
