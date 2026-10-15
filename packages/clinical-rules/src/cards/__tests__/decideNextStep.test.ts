import { describe, it, expect } from 'vitest';
import { decideNextStep, getUpcomingStep } from '../decideNextStep';
import { STAGE1_CARDS, STAGE2_CARDS } from '../schedule';
import type { CardStep, LatestCard } from '../types';
import { formatUtcTimestamp, parseUtcTimestamp } from '../../time/utcTimestamp';

const T0_TEXT = '2026-10-14 08:00:00';
const T0 = parseUtcTimestamp(T0_TEXT) as number;
const at = (minutes: number, seconds = 0): number => T0 + minutes * 60_000 + seconds * 1_000;
const latest = (name: string, encounterTime = T0_TEXT): LatestCard => ({ name, encounterTime });
const ALL_CARDS = [...STAGE1_CARDS, ...STAGE2_CARDS];

// ── Android oracle: CardGenerationEngine.java 111-146, 275-285, 322-352, 390-400 ──
function androidNextName(name: string): string {
  const [s, h, c] = name.toLowerCase().replace(/stage/g, '').replace(/hour/g, '').split('_').map(Number);
  let [stage, hour, card] = [s, h, c];
  if (stage === 1) {
    if (card === 1) card = 2;
    else {
      hour += 1;
      card = 1;
      if (hour >= 21) [stage, hour] = [2, 1];
    }
  } else if (card < 4) card += 1;
  else [hour, card] = [hour + 1, 1];
  return `Stage${stage}_Hour${hour}_${card}`;
}

function androidTick(name: string, cardTime: number, now: number): string {
  const minutes = Math.trunc((now - cardTime) / 60_000); // DateTimeUtils.getMinDiffWithCurrentDate
  const lower = name.toLowerCase();
  if (lower.includes('stage1')) {
    if (minutes >= 30) return name === 'Stage1_Hour15_2' ? 'decisionPending' : `create ${androidNextName(name)}`;
    return minutes === 29 ? 'preSync' : 'nothing';
  }
  if (lower.includes('stage2')) {
    if (minutes >= 15) return name === 'Stage2_Hour5_4' ? 'decisionPending' : `create ${androidNextName(name)}`;
    return minutes === 14 ? 'preSync' : 'nothing';
  }
  return 'nothing';
}

function portTick(step: CardStep): string {
  if (step.kind === 'createCard') return `create ${step.card.name}`;
  if (step.kind === 'markDecisionPending') return 'decisionPending';
  if (step.kind === 'preSync') return 'preSync';
  return 'nothing';
}

describe('decideNextStep against the Android timer', () => {
  it('matches Android on every Stage 1/2 card, every second from -3 to +40 minutes', () => {
    let compared = 0;
    for (const card of ALL_CARDS) {
      for (let second = -180; second <= 40 * 60; second += 1) {
        const now = T0 + second * 1_000;
        expect(portTick(decideNextStep(latest(card.name), now)), `${card.name} @${second}s`).toBe(
          androidTick(card.name, T0, now),
        );
        compared += 1;
      }
    }
    expect(compared).toBe(50 * 2581);
  });

  it('agrees with getUpcomingStep about when the next step is due', () => {
    for (const card of ALL_CARDS) {
      const due = (getUpcomingStep(latest(card.name)) as { dueAt: number }).dueAt;
      for (let second = -60; second <= 40 * 60; second += 7) {
        const now = T0 + second * 1_000;
        const kind = decideNextStep(latest(card.name), now).kind;
        expect(kind === 'createCard' || kind === 'markDecisionPending').toBe(now >= due);
        expect(kind === 'preSync').toBe(now >= due - 60_000 && now < due);
      }
    }
  });
});

describe('decideNextStep', () => {

  // ── Stage 1: 30-minute cards ─────────────────────────────────────────────

  it('waits before minute 29, with the due time', () => {
    expect(decideNextStep(latest('Stage1_Hour1_1'), at(0))).toEqual({ kind: 'wait', dueAt: at(30) });
    expect(decideNextStep(latest('Stage1_Hour1_1'), at(28, 59)).kind).toBe('wait');
  });

  it('pre-syncs during minute 29 only, to the last millisecond', () => {
    expect(decideNextStep(latest('Stage1_Hour1_1'), at(29))).toEqual({ kind: 'preSync', dueAt: at(30) });
    expect(decideNextStep(latest('Stage1_Hour1_1'), at(30) - 1).kind).toBe('preSync');
    expect(decideNextStep(latest('Stage1_Hour1_1'), at(30)).kind).toBe('createCard');
  });

  it('creates the next card at minute 30: time now (no ms), NORMAL marker, privacy notice', () => {
    const step = decideNextStep(latest('Stage1_Hour1_1'), at(30, 7) + 999);
    expect(step).toEqual({
      kind: 'createCard',
      card: STAGE1_CARDS[1],
      encounterTime: formatUtcTimestamp(at(30, 7)),
      marker: 'NORMAL',
      privacyNoticeValue: 'true',
    });
    expect(step.kind === 'createCard' && step.encounterTime).toBe('2026-10-14 08:30:07');
  });

  it('moves from the half-hour card to the next hour', () => {
    const step = decideNextStep(latest('Stage1_Hour3_2'), at(30));
    expect(step.kind === 'createCard' && step.card.name).toBe('Stage1_Hour4_1');
  });

  it('creates only one card however late the tick is (no backfill)', () => {
    const step = decideNextStep(latest('Stage1_Hour1_1'), at(180));
    expect(step.kind === 'createCard' && step.card.name).toBe('Stage1_Hour1_2');
  });

  it('sets Decision Pending 30 minutes after Stage1_Hour15_2, also on a late tick', () => {
    expect(decideNextStep(latest('Stage1_Hour15_2'), at(29)).kind).toBe('preSync');
    for (const minute of [30, 31, 180, 600]) {
      expect(decideNextStep(latest('Stage1_Hour15_2'), at(minute))).toEqual({
        kind: 'markDecisionPending',
        stage: 'stage1',
        value: 'true',
      });
    }
  });

  // ── Stage 2: 15-minute cards ─────────────────────────────────────────────

  it('pre-syncs at minute 14 and creates the next card at 15', () => {
    expect(decideNextStep(latest('Stage2_Hour1_1'), at(13, 59)).kind).toBe('wait');
    expect(decideNextStep(latest('Stage2_Hour1_1'), at(14))).toEqual({ kind: 'preSync', dueAt: at(15) });
    const step = decideNextStep(latest('Stage2_Hour1_1'), at(15));
    expect(step.kind === 'createCard' && step.card.name).toBe('Stage2_Hour1_2');
  });

  it('moves from the fourth card to the next hour', () => {
    const step = decideNextStep(latest('Stage2_Hour2_4'), at(15));
    expect(step.kind === 'createCard' && step.card.name).toBe('Stage2_Hour3_1');
  });

  it('pre-syncs before Stage2_Hour5_4 runs out, then keeps returning Decision Pending', () => {
    expect(decideNextStep(latest('Stage2_Hour5_4'), at(14)).kind).toBe('preSync');
    for (const minute of [15, 16, 120]) {
      expect(decideNextStep(latest('Stage2_Hour5_4'), at(minute))).toEqual({
        kind: 'markDecisionPending',
        stage: 'stage2',
        value: 'true',
      });
    }
  });

  // ── Whole-stage runs on a 1-minute timer ─────────────────────────────────

  function runStage(firstCard: string, tickEveryMinutes: number, untilMinutes: number) {
    let current = latest(firstCard);
    const created: { name: string; minute: number }[] = [];
    let decisionPendingAt: number | null = null;
    for (let minute = 0; minute <= untilMinutes; minute += tickEveryMinutes) {
      const step = decideNextStep(current, at(minute));
      if (step.kind === 'createCard') {
        created.push({ name: step.card.name, minute });
        current = latest(step.card.name, step.encounterTime);
      } else if (step.kind === 'markDecisionPending' && decisionPendingAt === null) {
        decisionPendingAt = minute;
      }
    }
    return { created, decisionPendingAt };
  }

  it('Stage 1 yields cards 2..30 at 30..870 and Decision Pending at 900', () => {
    const { created, decisionPendingAt } = runStage('Stage1_Hour1_1', 1, 960);
    expect(created).toEqual(STAGE1_CARDS.slice(1).map((c) => ({ name: c.name, minute: c.offsetMinutes })));
    expect(decisionPendingAt).toBe(900);
  });

  it('Stage 2 yields cards 2..20 at 15..285 and Decision Pending at 300', () => {
    const { created, decisionPendingAt } = runStage('Stage2_Hour1_1', 1, 360);
    expect(created).toEqual(STAGE2_CARDS.slice(1).map((c) => ({ name: c.name, minute: c.offsetMinutes })));
    expect(decisionPendingAt).toBe(300);
  });

  it('lets delay accumulate when ticks are late (rolling schedule)', () => {
    expect(runStage('Stage1_Hour1_1', 7, 70).created).toEqual([
      { name: 'Stage1_Hour1_2', minute: 35 },
      { name: 'Stage1_Hour2_1', minute: 70 },
    ]);
  });

  // ── Inputs this rule does not handle ─────────────────────────────────────

  it.each(['Stage3_Hour1_1', 'DELIVERY_OUTCOME_STAGE3', 'ENCOUNTER_VISIT_NOTE', 'ENCOUNTER_ADMISSION', 'LCG_SOS'])(
    'returns notMonitored for a latest encounter named %s',
    (name) => {
      // The app passes Android's "latest card" (VISIT_COMPLETE, LCG_SOS, ADMISSION already excluded).
      expect(decideNextStep(latest(name), at(600))).toEqual({ kind: 'notMonitored' });
    },
  );

  it('reports a time it cannot read instead of guessing (Android would use "now")', () => {
    expect(decideNextStep(latest('Stage1_Hour1_1', '2026-10-14T08:00:00.000+0530'), at(60))).toEqual({
      kind: 'invalidTime',
    });
  });

  it('reads a card time written with native digits or a .0 suffix', () => {
    expect(decideNextStep(latest('Stage1_Hour1_1', '२०२६-१०-१४ ०८:००:००'), at(30)).kind).toBe('createCard');
    expect(decideNextStep(latest('Stage1_Hour1_1', '2026-10-14 08:00:00.0'), at(30)).kind).toBe('createCard');
  });

  it('waits on a card timed in the future, never pre-syncs on a negative minute count', () => {
    expect(decideNextStep(latest('Stage1_Hour1_1'), at(-10)).kind).toBe('wait');
    expect(decideNextStep(latest('Stage1_Hour1_1'), at(-90))).toEqual({ kind: 'wait', dueAt: at(30) });
    expect(decideNextStep(latest('Stage2_Hour1_1'), at(-14, -59)).kind).toBe('wait');
  });

  it('rejects a clock value that is not epoch ms', () => {
    expect(() => decideNextStep(latest('Stage1_Hour1_1'), Number.NaN)).toThrow(RangeError);
  });
});

describe('getUpcomingStep', () => {
  it('gives the next card and when it is due, for every non-last card', () => {
    for (const card of ALL_CARDS.filter((c) => !c.isLast)) {
      const upcoming = getUpcomingStep(latest(card.name));
      expect(upcoming?.kind).toBe('card');
      expect(upcoming?.dueAt).toBe(T0 + card.intervalMinutes * 60_000);
    }
    expect(getUpcomingStep(latest('Stage2_Hour1_1'))).toEqual({ kind: 'card', card: STAGE2_CARDS[1], dueAt: at(15) });
  });

  it('gives Decision Pending after each stage\'s last card', () => {
    expect(getUpcomingStep(latest('Stage1_Hour15_2'))).toEqual({ kind: 'decisionPending', stage: 'stage1', dueAt: at(30) });
    expect(getUpcomingStep(latest('Stage2_Hour5_4'))).toEqual({ kind: 'decisionPending', stage: 'stage2', dueAt: at(15) });
  });

  it('counts from the card time even when it is in the future', () => {
    expect(getUpcomingStep(latest('Stage1_Hour1_1', '2026-10-14 09:00:00'))?.dueAt).toBe(at(90));
  });

  it('is null for a non-card or an unreadable time', () => {
    expect(getUpcomingStep(latest('LCG_SOS'))).toBeNull();
    expect(getUpcomingStep(latest('Stage1_Hour1_1', 'bad'))).toBeNull();
  });
});
