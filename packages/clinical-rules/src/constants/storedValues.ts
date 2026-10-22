/** Stored values the rules hand back. Byte-identical to Android, so both apps and old devices agree. */

// ENCOUNTER_TYPE obs on a timer card (Android `EncounterDTO.Type.NORMAL`).
export const NORMAL_CARD_MARKER = 'NORMAL';

// DECISION_PENDING visit attribute.
export const DECISION_PENDING_SET = 'true';
export const DECISION_PENDING_CLEARED = 'false';

// `tbl_encounter.privacynotice_value` on a card.
export const PRIVACY_NOTICE_VALUE = 'true';

// The explicit "No" saved for Oxytocin, IV Fluids and Medicine.
export const NO_RESPONSE_VALUE = 'No';

// IV fluid type stored when the nurse types her own fluid name.
export const IV_FLUID_OTHER_VALUE = 'Other';
