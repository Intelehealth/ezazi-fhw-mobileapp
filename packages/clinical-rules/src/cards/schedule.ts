import { STAGE } from '../constants';
import { formatCardName } from './cardName';
import type { CardDefinition, MonitoringStage } from './types';
import { deepFreeze } from '../internal/deepFreeze';

/**
 * Stage 1 and Stage 2 card sequences (`CardGenerationEngine.getNextEncounterTypeName` and
 * its limit checks). Both are uniform; Stage 4 will get its own table.
 */

export interface UniformStageSchedule {
  readonly stage: MonitoringStage;
  readonly hours: number;
  readonly cardsPerHour: number;
  readonly intervalMinutes: number;
}

/** Stage 1: 15 hours, a card every 30 minutes, 30 cards. */
export const STAGE1_SCHEDULE: UniformStageSchedule = deepFreeze({
  stage: STAGE.STAGE1,
  hours: 15,
  cardsPerHour: 2,
  intervalMinutes: 30,
});

/** Stage 2: 5 hours, a card every 15 minutes, 20 cards. */
export const STAGE2_SCHEDULE: UniformStageSchedule = deepFreeze({
  stage: STAGE.STAGE2,
  hours: 5,
  cardsPerHour: 4,
  intervalMinutes: 15,
});

function buildUniformCards(schedule: UniformStageSchedule): readonly CardDefinition[] {
  const total = schedule.hours * schedule.cardsPerHour;
  const cards: CardDefinition[] = [];

  for (let position = 0; position < total; position += 1) {
    const hour = Math.floor(position / schedule.cardsPerHour) + 1;
    const slot = (position % schedule.cardsPerHour) + 1;
    cards.push(
      deepFreeze({
        name: formatCardName(schedule.stage, hour, slot),
        stage: schedule.stage,
        hour,
        slot,
        position,
        offsetMinutes: position * schedule.intervalMinutes,
        intervalMinutes: schedule.intervalMinutes,
        isLast: position === total - 1,
      }),
    );
  }

  return deepFreeze(cards);
}

export const STAGE1_CARDS = buildUniformCards(STAGE1_SCHEDULE);
export const STAGE2_CARDS = buildUniformCards(STAGE2_SCHEDULE);

const CARDS_BY_STAGE: Readonly<Record<MonitoringStage, readonly CardDefinition[]>> = {
  [STAGE.STAGE1]: STAGE1_CARDS,
  [STAGE.STAGE2]: STAGE2_CARDS,
};

const CARDS_BY_NAME: ReadonlyMap<string, CardDefinition> = new Map(
  [...STAGE1_CARDS, ...STAGE2_CARDS].map((card) => [card.name, card]),
);

/** Every card of a stage, in order. */
export function getStageCards(stage: MonitoringStage): readonly CardDefinition[] {
  return CARDS_BY_STAGE[stage];
}

/** The first card of a stage, written when the stage starts. */
export function getFirstCard(stage: MonitoringStage): CardDefinition {
  return CARDS_BY_STAGE[stage][0];
}

/** The card with this exact encounter type name, or null when it is not a Stage 1/2 card. */
export function findCard(name: string): CardDefinition | null {
  return CARDS_BY_NAME.get(name) ?? null;
}

/** The card after this one in its stage, or null after the last card. */
export function getNextCard(card: CardDefinition): CardDefinition | null {
  if (card.isLast) return null;
  return CARDS_BY_STAGE[card.stage][card.position + 1] ?? null;
}

/** From a stage's first card until Decision Pending: 900 min (Stage 1), 300 min (Stage 2). */
export function getStageWindowMinutes(stage: MonitoringStage): number {
  const cards = CARDS_BY_STAGE[stage];
  const last = cards[cards.length - 1];
  return last.offsetMinutes + last.intervalMinutes;
}
