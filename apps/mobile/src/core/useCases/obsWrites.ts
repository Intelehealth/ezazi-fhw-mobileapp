import { encounterRepo, obsRepo } from '@/core/db/repositories';
import type { AdmissionConcept, ObsInput, ObsUpdate } from '@/core/db/repositories/obs';
import { transact, type DbHandle } from '@/core/db/tx';

/**
 * Local observation writes, each paired with its encounter's needing-send flag
 * in ONE transaction. The push finds observations through their encounter, so
 * an obs left dirty under a clean encounter is collected by nothing and never
 * sent. Screens call these, never the repository writers directly.
 */

/** One flag per encounter, however many observations touched it. */
function markParents(encounterUuids: readonly (string | null | undefined)[], on: DbHandle): void {
  for (const uuid of new Set(encounterUuids.filter(Boolean) as string[])) {
    encounterRepo.markDirty(uuid, on);
  }
}

export function recordObs(input: ObsInput, on?: DbHandle): string {
  return transact((tx) => {
    const uuid = obsRepo.insert(input, tx);
    markParents([input.encounteruuid], tx);
    return uuid;
  }, on);
}

export function recordObsMany(inputs: ObsInput[], on?: DbHandle): string[] {
  return transact((tx) => {
    const uuids = obsRepo.insertMany(inputs, tx);
    markParents(inputs.map((input) => input.encounteruuid), tx);
    return uuids;
  }, on);
}

export function recordEncounterType(
  input: { encounterUuid: string; value: string; creator: string; creatorUuid: string },
  on?: DbHandle,
): string {
  return transact((tx) => {
    const uuid = obsRepo.insertEncounterType(input, tx);
    encounterRepo.markDirty(input.encounterUuid, tx);
    return uuid;
  }, on);
}

export function recordMissedEncounter(
  input: { encounterUuid: string; creator: string; creatorUuid: string },
  on?: DbHandle,
): string {
  return transact((tx) => {
    const uuid = obsRepo.insertMissedEncounterMarker(input, tx);
    encounterRepo.markDirty(input.encounterUuid, tx);
    return uuid;
  }, on);
}

export function recordAdmissionValues(
  input: {
    encounterUuid: string;
    creator: string;
    creatorUuid: string;
    values: Partial<Record<AdmissionConcept, string>>;
  },
  on?: DbHandle,
): string[] {
  return transact((tx) => {
    const written = obsRepo.writeAdmissionValues(input, tx);
    // Nothing written means nothing to send — do not wake the encounter.
    if (written.length > 0) encounterRepo.markDirty(input.encounterUuid, tx);
    return written;
  }, on);
}

/**
 * The old parent is read BEFORE the write: a patch may carry a different
 * `encounteruuid`, and both encounters then have something to send.
 */
export function editObs(uuid: string, patch: ObsUpdate, on?: DbHandle): void {
  transact((tx) => {
    const parents = obsRepo.listEncounterUuidsFor([uuid], tx);
    obsRepo.update(uuid, patch, tx);
    markParents([...parents, patch.encounteruuid], tx);
  }, on);
}

export function voidObs(uuids: string[], on?: DbHandle): void {
  transact((tx) => {
    const parents = obsRepo.listEncounterUuidsFor(uuids, tx);
    obsRepo.markVoided(uuids, tx);
    markParents(parents, tx);
  }, on);
}

export function setOutOfTimeReason(encounterUuid: string, value: string, on?: DbHandle): void {
  transact((tx) => {
    obsRepo.updateOutOfTimeReason(encounterUuid, value, tx);
    encounterRepo.markDirty(encounterUuid, tx);
  }, on);
}
