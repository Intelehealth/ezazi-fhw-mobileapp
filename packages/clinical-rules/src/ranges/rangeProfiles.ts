import { deepFreeze } from '../internal/deepFreeze';
import { BASE_RANGES } from './baseRanges';
import type { FieldId, InfusionInputId } from '../constants';
import type { RangeId, RangeOverrides, RangeProfileId, RangeTable, ValidationRange } from './types';

/**
 * Per-client ranges (ARCHITECTURE_RULES §7a). A profile lists ONLY the min/max it changes;
 * the rest comes from `BASE_RANGES`. Empty = Android. Clinical review for any change.
 */
const PROFILES = {
  default: {},
  nepal: {},
} satisfies Record<RangeProfileId, RangeOverrides>; // satisfies rejects unknown range ids

export const RANGE_PROFILES: Readonly<Record<RangeProfileId, RangeOverrides>> = deepFreeze(PROFILES);

function applyOverrides(overrides: RangeOverrides): RangeTable {
  const table = {} as Record<RangeId, ValidationRange>;
  for (const id of Object.keys(BASE_RANGES) as RangeId[]) {
    table[id] = Object.freeze({ ...BASE_RANGES[id], ...overrides[id] });
  }
  return Object.freeze(table);
}

const RESOLVED: Readonly<Record<RangeProfileId, RangeTable>> = Object.freeze({
  default: applyOverrides(RANGE_PROFILES.default),
  nepal: applyOverrides(RANGE_PROFILES.nepal),
});

/** Every range for a client profile. Throws for an unknown profile id. */
export function getValidationRanges(profile: RangeProfileId): RangeTable {
  const table = RESOLVED[profile];
  if (!table) throw new RangeError(`Unknown validation range profile: ${String(profile)}`);
  return table;
}

/** One range for a client profile. */
export function getValidationRange(profile: RangeProfileId, id: RangeId): ValidationRange {
  return getValidationRanges(profile)[id];
}

/** The range of a field or input for a client profile, or null when it has none. */
export function getRangeFor(profile: RangeProfileId, id: FieldId | InfusionInputId): ValidationRange | null {
  const table = getValidationRanges(profile);
  return Object.prototype.hasOwnProperty.call(table, id) ? table[id as RangeId] : null;
}

/** Every profile id, e.g. for an app test that maps each client to one. */
export function getRangeProfileIds(): readonly RangeProfileId[] {
  return Object.keys(RANGE_PROFILES) as RangeProfileId[];
}
