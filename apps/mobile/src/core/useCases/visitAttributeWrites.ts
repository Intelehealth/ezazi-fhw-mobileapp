import { visitAttributeRepo, visitRepo } from '@/core/db/repositories';
import { transact, type DbHandle } from '@/core/db/tx';

/**
 * Visit-attribute writes paired with the visit's needing-send flag, in ONE
 * transaction. Each repository writer already reports whether it wrote, so an
 * unchanged value flips no flag and schedules no push.
 */

export function recordVisitAttribute(
  visitUuid: string,
  typeUuid: string,
  value: string,
  on?: DbHandle,
): string {
  return transact((tx) => {
    const uuid = visitAttributeRepo.insertLocal(visitUuid, typeUuid, value, tx);
    visitRepo.markDirty(visitUuid, tx);
    return uuid;
  }, on);
}

/** Returns null when the value already matched — nothing written, nothing flagged. */
export function upsertVisitAttribute(
  visitUuid: string,
  typeUuid: string,
  value: string,
  on?: DbHandle,
): string | null {
  return transact((tx) => {
    const uuid = visitAttributeRepo.upsertLocal(visitUuid, typeUuid, value, tx);
    if (uuid !== null) visitRepo.markDirty(visitUuid, tx);
    return uuid;
  }, on);
}

/** False when the pair has no row to update. */
export function updateVisitAttribute(
  visitUuid: string,
  typeUuid: string,
  value: string,
  on?: DbHandle,
): boolean {
  return transact((tx) => {
    const written = visitAttributeRepo.updateValue(visitUuid, typeUuid, value, tx);
    if (written) visitRepo.markDirty(visitUuid, tx);
    return written;
  }, on);
}

export function assignVisitHolder(
  visitUuid: string,
  providerUuid: string,
  on?: DbHandle,
): boolean {
  return transact((tx) => {
    const written = visitAttributeRepo.assignHolder(visitUuid, providerUuid, tx);
    if (written) visitRepo.markDirty(visitUuid, tx);
    return written;
  }, on);
}

export function markVisitRead(visitUuid: string, on?: DbHandle): boolean {
  return transact((tx) => {
    const written = visitAttributeRepo.markRead(visitUuid, tx);
    if (written) visitRepo.markDirty(visitUuid, tx);
    return written;
  }, on);
}
