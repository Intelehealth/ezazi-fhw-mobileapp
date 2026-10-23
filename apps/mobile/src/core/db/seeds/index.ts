import { transact } from '../tx';
import { seedDevPatient } from './devPatient';

/** Development builds only: writes the fake labour patient in one transaction. */
export function runDevSeed(providerUuid: string): boolean {
  return transact((tx) => seedDevPatient({ providerUuid, now: Date.now() }, tx));
}
