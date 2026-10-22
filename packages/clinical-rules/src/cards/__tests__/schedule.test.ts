import { describe, it, expect } from 'vitest';
import {
  STAGE1_CARDS,
  STAGE2_CARDS,
  findCard,
  getFirstCard,
  getNextCard,
  getStageCards,
  getStageWindowMinutes,
} from '../schedule';

/** Android `CardGenerationEngine.getNextEncounterTypeName` (322-352), ported as the test oracle. */
function androidNextName(name: string): string {
  const [stage, hour, card] = name.toLowerCase().replace(/stage/g, '').replace(/hour/g, '').split('_').map(Number);
  if (stage === 1) return card === 1 ? `Stage1_Hour${hour}_2` : `Stage1_Hour${hour + 1}_1`;
  return card < 4 ? `Stage${stage}_Hour${hour}_${card + 1}` : `Stage${stage}_Hour${hour + 1}_1`;
}

describe('card schedule', () => {

  // ── Stage 1 ──────────────────────────────────────────────────────────────

  it('has 30 cards, Stage1_Hour1_1 to Stage1_Hour15_2', () => {
    expect(STAGE1_CARDS).toHaveLength(30);
    expect(STAGE1_CARDS[0].name).toBe('Stage1_Hour1_1');
    expect(STAGE1_CARDS[29].name).toBe('Stage1_Hour15_2');
  });

  it('spaces Stage 1 cards 30 minutes apart, the last at 870', () => {
    STAGE1_CARDS.forEach((card, i) => {
      expect(card.offsetMinutes).toBe(i * 30);
      expect(card.intervalMinutes).toBe(30);
    });
    expect(STAGE1_CARDS[29].offsetMinutes).toBe(870);
  });

  // ── Stage 2 ──────────────────────────────────────────────────────────────

  it('has 20 cards, Stage2_Hour1_1 to Stage2_Hour5_4', () => {
    expect(STAGE2_CARDS).toHaveLength(20);
    expect(STAGE2_CARDS[0].name).toBe('Stage2_Hour1_1');
    expect(STAGE2_CARDS[19].name).toBe('Stage2_Hour5_4');
  });

  it('spaces Stage 2 cards 15 minutes apart, the last at 285', () => {
    STAGE2_CARDS.forEach((card, i) => {
      expect(card.offsetMinutes).toBe(i * 15);
      expect(card.intervalMinutes).toBe(15);
    });
    expect(STAGE2_CARDS[19].offsetMinutes).toBe(285);
  });

  // ── Android parity ───────────────────────────────────────────────────────

  it.each([
    ['stage1', STAGE1_CARDS],
    ['stage2', STAGE2_CARDS],
  ] as const)('%s follows Android getNextEncounterTypeName card by card', (_stage, cards) => {
    for (let i = 0; i < cards.length - 1; i += 1) {
      expect(cards[i + 1].name).toBe(androidNextName(cards[i].name));
    }
  });

  it('marks only Android limit cards as last (Stage1_Hour15_2, Stage2_Hour5_4)', () => {
    const last = [...STAGE1_CARDS, ...STAGE2_CARDS].filter((card) => card.isLast).map((c) => c.name);
    expect(last).toEqual(['Stage1_Hour15_2', 'Stage2_Hour5_4']);
  });

  it('puts the window until Decision Pending at 15 h and 5 h', () => {
    expect(getStageWindowMinutes('stage1')).toBe(900);
    expect(getStageWindowMinutes('stage2')).toBe(300);
  });

  // ── Lookups ──────────────────────────────────────────────────────────────

  it('derives hour and slot from the name', () => {
    expect(findCard('Stage1_Hour7_2')).toMatchObject({ stage: 'stage1', hour: 7, slot: 2, position: 13 });
    expect(findCard('Stage2_Hour3_4')).toMatchObject({ stage: 'stage2', hour: 3, slot: 4, position: 11 });
  });

  it.each([
    'Stage3_Hour1_1',
    'DELIVERY_OUTCOME_STAGE3',
    'LCG_SOS',
    'ENCOUNTER_VISIT_NOTE',
    'stage1_hour1_1',
    'Stage1_Hour16_1',
    'Stage1_Hour1_3',
    'Stage2_Hour1_5',
    '',
  ])('finds no Stage 1/2 card named %j', (name) => {
    expect(findCard(name)).toBeNull();
  });

  it('never moves from Stage 1 to Stage 2 by itself', () => {
    expect(getNextCard(STAGE1_CARDS[29])).toBeNull();
    expect(getNextCard(STAGE2_CARDS[19])).toBeNull();
  });

  it('returns the first card and the ordered cards per stage', () => {
    expect(getFirstCard('stage1').name).toBe('Stage1_Hour1_1');
    expect(getFirstCard('stage2').name).toBe('Stage2_Hour1_1');
    expect(getStageCards('stage2')).toBe(STAGE2_CARDS);
  });

  it('cannot be mutated by a caller', () => {
    expect(Object.isFrozen(STAGE1_CARDS)).toBe(true);
    expect(Object.isFrozen(STAGE1_CARDS[0])).toBe(true);
  });
});
