import { transact } from '../tx';
import { seedDevPatient } from './devPatient';
import { DEV_VISIT_UUID } from './devPatient.data';
import { seedDevLiveVisit, startDevStage1 } from './devVisitStart';
import { DEV_LIVE_VISIT_UUID } from './devVisitStart.data';

export { DEV_CREATOR_UUID } from './devPatient.data';

/**
 * Development builds only: writes the fake labour patient, and the live test patient's visit
 * (no card yet), once; returns the fake patient's visit uuid.
 */
export function runDevSeed(providerUuid: string): string {
  transact((tx) => {
    seedDevPatient({ providerUuid, now: Date.now() }, tx);
    seedDevLiveVisit({ providerUuid, now: Date.now() }, tx);
  });
  return DEV_VISIT_UUID;
}

/** Development builds only: starts Stage 1 on the live test visit, once; returns its visit uuid. */
export function runDevVisitStart(providerUuid: string): string {
  transact((tx) => startDevStage1({ providerUuid, now: Date.now() }, tx));
  return DEV_LIVE_VISIT_UUID;
}
