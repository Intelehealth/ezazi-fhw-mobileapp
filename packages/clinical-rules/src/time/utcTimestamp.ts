/**
 * The card clock: `yyyy-MM-dd HH:mm:ss` in UTC, as Android writes `encounter_time`.
 * Built on `Date.UTC`: no date library, never `new Date(text)` (engines differ).
 */

export const MS_PER_MINUTE = 60000;

// `\d` without the `u` flag is ASCII-only; native digits are normalised first.
const UTC_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?$/;

// Zero code points of the digit sets Android may write (device locale, e.g. mr, bn, ne, ar).
const NATIVE_DIGIT_ZEROS = [0x0660, 0x06f0, 0x0966, 0x09e6, 0x0a66, 0x0ae6, 0x0b66, 0x0be6, 0x0c66, 0x0ce6, 0x0d66];

const pad2 = (value: number): string => String(value).padStart(2, '0');

function toAsciiDigits(text: string): string {
  return text.replace(/[٠-٩۰-۹०-९০-৯੦-੯૦-૯୦-୯௦-௯౦-౯೦-೯൦-൯]/g, (digit) => {
    const code = digit.charCodeAt(0);
    const zero = NATIVE_DIGIT_ZEROS.find((start) => code >= start && code <= start + 9) as number;
    return String(code - zero);
  });
}

/**
 * Epoch ms, or null when the text is not a real UTC timestamp. Also reads native
 * digits and a fractional-seconds suffix (both possible in Android rows); the
 * fraction is ignored, as Android's parser ignores it.
 */
export function parseUtcTimestamp(text: string): number | null {
  const match = UTC_TIMESTAMP.exec(toAsciiDigits(text));
  if (!match) return null;

  const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number);
  const date = new Date(Date.UTC(2000, month - 1, day, hour, minute, second));
  date.setUTCFullYear(year, month - 1, day); // Date.UTC maps years 0-99 to 1900-1999

  // A round trip rejects dates Date.UTC would roll over, e.g. 2026-02-30.
  const exact =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    date.getUTCSeconds() === second;

  return exact ? date.getTime() : null;
}

/** Formats epoch ms with ASCII digits, dropping milliseconds as Android does. */
export function formatUtcTimestamp(epochMs: number): string {
  const date = new Date(epochMs);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`Not a valid epoch time: ${epochMs}`);
  }

  const day = `${String(date.getUTCFullYear()).padStart(4, '0')}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
  const time = `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())}`;
  return `${day} ${time}`;
}

/** Guards an injected clock value; a NaN `now` would silently mean "wait" forever. */
export function assertEpochMs(now: number): void {
  if (!Number.isFinite(now)) throw new RangeError(`now must be epoch ms, got ${now}`);
}

/** Whole minutes from `fromMs` to `toMs`, truncated toward zero like Java's `toMinutes`. */
export function wholeMinutesBetween(fromMs: number, toMs: number): number {
  const minutes = Math.trunc((toMs - fromMs) / MS_PER_MINUTE);
  return minutes === 0 ? 0 : minutes; // avoids -0
}
