/**
 * The only values ever written to the `sync` and `voided` columns.
 * Types mirror the API: `sync` is boolean (wire `syncd`), `voided` is 0/1 (wire
 * sends a JSON number). See ARCHITECTURE_RULES §6.
 */

/** Row has local changes the server has not seen. The column default. */
export const SYNC_DIRTY = false;

/** Server holds this row. Everything arriving from a pull is written clean. */
export const SYNC_CLEAN = true;

export const VOIDED_NO = 0;
export const VOIDED_YES = 1;
