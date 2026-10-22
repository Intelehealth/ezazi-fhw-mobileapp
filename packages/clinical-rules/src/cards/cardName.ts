import { CARD_NAME_PART, STAGE_DIGIT } from '../constants';
import type { StageId } from '../constants';

/** Builds card and SOS names from the parts in `constants/stages.ts`. Never write a name by hand. */

const { STAGE: STAGE_WORD, HOUR, SOS, SEPARATOR } = CARD_NAME_PART;

function stageHour(stage: StageId, hour: number): string {
  return `${STAGE_WORD}${STAGE_DIGIT[stage]}${SEPARATOR}${HOUR}${hour}${SEPARATOR}`;
}

/** A card's encounter type name, e.g. `Stage1_Hour3_2`. */
export function formatCardName(stage: StageId, hour: number, slot: number): string {
  return `${stageHour(stage, hour)}${slot}`;
}

/** An SOS card's `SOS_STAGE_HOUR` value, e.g. `Stage1_Hour3_SOS2`. */
export function formatSosName(stage: StageId, hour: number, index: number): string {
  return `${stageHour(stage, hour)}${SOS}${index}`;
}
