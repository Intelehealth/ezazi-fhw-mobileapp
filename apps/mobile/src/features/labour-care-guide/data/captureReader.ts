import { LCG_SOS, encounterTypeName } from '@/core/db/constants/encounter';
import { encounterRepo, obsRepo } from '@/core/db/repositories';
import type { DbHandle } from '@/core/db/tx';

import type { CaptureCardRow } from '../domain/captureCard';

/** The card a capture screen opens, or null when it is missing or voided. */
export function readCaptureCard(encounterUuid: string, on: DbHandle): CaptureCardRow | null {
  const row = encounterRepo.findByUuid(encounterUuid, on);
  if (!row) return null;
  const isSos = row.encounter_type_uuid === LCG_SOS;

  return {
    encounterUuid,
    cardName: !isSos && row.encounter_type_uuid ? encounterTypeName(row.encounter_type_uuid) : null,
    isSos,
    sosLabel: isSos ? obsRepo.getSosStageHourValue(encounterUuid, on) : null,
    encounterTime: row.encounter_time ?? '',
  };
}
