import { NO_RESPONSE_VALUE } from '../constants';
import { javaTrim } from '../internal/javaTrim';

/**
 * The explicit "No" Android saves for Oxytocin, IV Fluids and Medicine when the
 * nurse leaves them at No (`PartogramDataCaptureActivity.createNoResponseObs`).
 * Matched case-insensitively and trimmed on read, as `findExistingNoObsUuid` does.
 */
export function isNoResponse(stored: string | null | undefined): boolean {
  return javaTrim(stored ?? '').toLowerCase() === NO_RESPONSE_VALUE.toLowerCase();
}
