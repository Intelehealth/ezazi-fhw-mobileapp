import { formatSosName } from '../cards/cardName';
import { CARD_NAME_PART, NORMAL_CARD_MARKER, STAGE, STAGE_DIGIT } from '../constants';
import { JAVA_INT } from '../internal/javaNumbers';
import type { EncounterKind, SosLabel, SosStage } from './types';

/**
 * The SOS label stored in `SOS_STAGE_HOUR`. Built and read with the name parts in
 * `constants/stages.ts`; Stage 4 keeps Android's digit 3.
 */

const STAGE_OF_DIGIT: Readonly<Record<number, SosStage>> = Object.freeze(
  Object.fromEntries((Object.keys(STAGE_DIGIT) as SosStage[]).map((stage) => [STAGE_DIGIT[stage], stage])),
);

const WORD = {
  stage: CARD_NAME_PART.STAGE.toLowerCase(),
  hour: CARD_NAME_PART.HOUR.toLowerCase(),
  sos: CARD_NAME_PART.SOS.toLowerCase(),
};

/** Splits like Android: lower-case, must contain every word, remove them, split on '_'. */
function androidNumbers(text: string, words: readonly string[], count: number): number[] | null {
  const lower = text.toLowerCase();
  if (!words.every((word) => lower.includes(word))) return null;
  const parts = words.reduce((rest, word) => rest.split(word).join(''), lower).split(CARD_NAME_PART.SEPARATOR);
  if (parts.length !== count || !parts.every((part) => JAVA_INT.test(part))) return null;
  return parts.map(Number);
}

export function stageDigit(stage: SosStage): number {
  return STAGE_DIGIT[stage];
}

export function formatSosLabel(label: SosLabel): string {
  return formatSosName(label.stage, label.hour, label.index);
}

/** Reads an SOS label as Android does (`collectEmergencyData` 1478-1499). Null if it does not parse. */
export function parseSosLabel(text: string | null | undefined): SosLabel | null {
  const numbers = androidNumbers(text ?? '', [WORD.stage, WORD.hour, WORD.sos], 3);
  if (!numbers) return null;
  const stage = STAGE_OF_DIGIT[numbers[0]];
  return stage ? { stage, hour: numbers[1], index: numbers[2] } : null;
}

/** Stage and hour of a card name, as `collectEmergencyData` reads its reference card (1450-1465). */
export function parseCardStageHour(cardName: string): { stage: SosStage; hour: number } | null {
  const numbers = androidNumbers(cardName, [WORD.stage, WORD.hour], 3);
  if (!numbers) return null;
  const stage = STAGE_OF_DIGIT[numbers[0]];
  return stage ? { stage, hour: numbers[1] } : null;
}

/**
 * The stage an SOS card opens in (`TimelineAdapter` 357-367): the digit after "Stage" in its
 * label. Android uses Stage 1 when the label is missing. Null when the label cannot be read.
 */
export function getSosCardStage(label: string | null | undefined): SosStage | null {
  if (!label) return STAGE.STAGE1;
  const digit = label.split(CARD_NAME_PART.SEPARATOR)[0].split(CARD_NAME_PART.STAGE).join('');
  return JAVA_INT.test(digit) ? STAGE_OF_DIGIT[Number(digit)] ?? null : null;
}

/** NORMAL or SOS from a card's ENCOUNTER_TYPE / SOS_STAGE_HOUR value (`EncounterTypeResolver.kt`). */
export function resolveEncounterKind(value: string | null | undefined): EncounterKind {
  if (!value) return NORMAL_CARD_MARKER;
  if (value.toLowerCase() === WORD.sos) return CARD_NAME_PART.SOS; // legacy rows
  const isSos = value.toUpperCase().includes(`${CARD_NAME_PART.SEPARATOR}${CARD_NAME_PART.SOS}`);
  return isSos ? CARD_NAME_PART.SOS : NORMAL_CARD_MARKER;
}
