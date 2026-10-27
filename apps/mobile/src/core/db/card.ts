import { encounterRepo, obsRepo } from './repositories';
import type { DbHandle } from './tx';
import { newUuid } from './uuid';

/**
 * Writes one timeline card in the caller's transaction: the encounter (unsynced) and its
 * ENCOUNTER_TYPE marker obs. Every card writer shares it: the card engine, the stage starts
 * and the dev visit start. Returns the encounter uuid.
 */
export function writeCard(
  input: {
    visitUuid: string;
    cardName: string;
    encounterTime: string;
    privacyNoticeValue: string | null;
    marker: string;
  },
  writer: { providerUuid: string; creatorUuid: string },
  on: DbHandle,
): string {
  const uuid = newUuid();
  encounterRepo.insertCard(
    {
      uuid,
      visitUuid: input.visitUuid,
      cardName: input.cardName,
      encounterTime: input.encounterTime,
      providerUuid: writer.providerUuid,
      privacyNoticeValue: input.privacyNoticeValue,
    },
    on,
  );
  obsRepo.insertEncounterType(
    { encounterUuid: uuid, value: input.marker, creator: writer.creatorUuid, creatorUuid: writer.creatorUuid },
    on,
  );
  return uuid;
}
