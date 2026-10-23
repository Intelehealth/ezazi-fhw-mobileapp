import { transact } from '../tx';
import { seedDevPatient } from './devPatient';
import { DEV_VISIT_UUID } from './devPatient.data';

/** Development builds only: writes the fake labour patient once; returns its visit uuid. */
export function runDevSeed(providerUuid: string): string {
  transact((tx) => seedDevPatient({ providerUuid, now: Date.now() }, tx));
  return DEV_VISIT_UUID;
}
