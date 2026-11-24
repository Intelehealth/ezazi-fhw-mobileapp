/**
 * The public surface. Callers import from `@/core/services/photo`, never from
 * `./photo` or `./constants` directly — the path layout is this service's own
 * business and nothing outside it should be able to reconstruct a filename.
 *
 * Unlike monitor/ and batteryGuard/, this service exposes no `use<Name>(enabled)`
 * hook: it is not long-lived and has nothing to start or stop at the
 * composition root. It is two functions called in response to a tap.
 */
export { capturePhoto, deletePatientPhoto } from './photo';
export type { PhotoSource } from './photo';
