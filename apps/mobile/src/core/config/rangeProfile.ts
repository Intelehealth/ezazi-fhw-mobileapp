import type { RangeProfileId } from '@ezazi/clinical-rules';
import { CLIENT_ID } from './clients';
import { DEFAULT_CLIENT_CONFIG } from './clients/default';
import { NEPAL_CLIENT_CONFIG } from './clients/nepal';

/**
 * Which validation range profile each client uses (ARCHITECTURE_RULES §7a). THE one
 * mapping: a new client adds one line here, and a test fails until it does.
 */
export const RANGE_PROFILE_BY_CLIENT: Readonly<Record<string, RangeProfileId>> = {
  [DEFAULT_CLIENT_CONFIG.id]: 'default',
  [NEPAL_CLIENT_CONFIG.id]: 'nepal',
};

/** The profile for a client. Throws when it has none: never guess clinical ranges. */
export function rangeProfileFor(clientId: string): RangeProfileId {
  const profile = RANGE_PROFILE_BY_CLIENT[clientId];
  if (!profile) throw new Error(`No validation range profile for client "${clientId}"`);
  return profile;
}

/** The build client's profile, fixed at build time like the client itself. */
export const RANGE_PROFILE: RangeProfileId = rangeProfileFor(CLIENT_ID);
