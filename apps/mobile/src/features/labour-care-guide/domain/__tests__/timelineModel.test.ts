import {
  activeStageOf,
  buildCheckpoints,
  endStageOf,
  fullName,
  labourStageOf,
  outcomeView,
  scrollTargetId,
  stageHeadings,
  type TimelineCardRow,
} from '../timelineModel';
import type { TimelineCheckpoint } from '../timeline.types';

const NOW = Date.UTC(2026, 9, 23, 10, 0, 0);
const at = (minutesAgo: number) => {
  const d = new Date(NOW - minutesAgo * 60_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00`;
};
const card = (cardName: string | null, minutesAgo: number, extra: Partial<TimelineCardRow> = {}): TimelineCardRow => ({
  encounterUuid: `${cardName ?? 'sos'}-${minutesAgo}`,
  cardName,
  isSos: cardName === null,
  encounterTime: at(minutesAgo),
  hasRealObs: false,
  hasMissedMarker: false,
  recordedAt: null,
  ...extra,
});
const OPEN = { decisionPending: false, visitComplete: false, isVisitHolder: true };

describe('buildCheckpoints', () => {
  const rows = [
    card('Stage1_Hour1_1', 120, { hasRealObs: true, recordedAt: at(118) }),
    card('Stage1_Hour1_2', 90, { hasMissedMarker: true }),
    card(null, 60, { hasRealObs: true }),
    card('Stage1_Hour2_1', 20),
  ];

  it('gives each stored card its state and adds the next card while it is still ahead', () => {
    const checkpoints = buildCheckpoints(rows, OPEN, NOW);

    expect(checkpoints.map((c) => [c.cardName ?? 'SOS', c.status, c.access])).toEqual([
      ['Stage1_Hour1_1', 'completed', 'read'],
      ['Stage1_Hour1_2', 'missed', 'none'],
      ['SOS', 'completed', 'read'],
      ['Stage1_Hour2_1', 'dueNow', 'write'],
      ['Stage1_Hour2_2', 'upcoming', 'none'],
    ]);
    expect(checkpoints[0].recordedAt).toBe(new Date(NOW - 118 * 60_000).toISOString());
    expect(checkpoints[4].scheduledAt).toBe(new Date(NOW + 10 * 60_000).toISOString());
  });

  it('makes a just-created SOS the card to fill, as Android: the unfilled card before it is missed', () => {
    const checkpoints = buildCheckpoints([...rows, card(null, 1)], OPEN, NOW);

    expect(checkpoints.map((c) => [c.cardName ?? 'SOS', c.status, Boolean(c.isSos)])).toEqual([
      ['Stage1_Hour1_1', 'completed', false],
      ['Stage1_Hour1_2', 'missed', false],
      ['SOS', 'completed', true],
      ['Stage1_Hour2_1', 'missed', false],
      ['SOS', 'dueNow', true],
      ['Stage1_Hour2_2', 'upcoming', false],
    ]);
  });

  it('projects no upcoming card once it is due (the engine is about to create it)', () => {
    expect(buildCheckpoints(rows, OPEN, NOW + 10 * 60_000).at(-1)?.status).toBe('dueNow');
  });

  it('closes the timeline during Decision Pending: no upcoming card and the empty newest card is missed', () => {
    const checkpoints = buildCheckpoints(rows, { ...OPEN, decisionPending: true }, NOW);
    expect(checkpoints.at(-1)?.status).toBe('missed');
    expect(checkpoints.some((c) => c.status === 'upcoming')).toBe(false);
  });

  it('opens nothing for a provider who does not hold the visit', () => {
    const checkpoints = buildCheckpoints(rows, { ...OPEN, isVisitHolder: false }, NOW);
    expect(checkpoints.every((c) => c.access === 'none')).toBe(true);
  });

  it('drops a card whose time cannot be read, and projects nothing from it', () => {
    expect(buildCheckpoints([card('Stage1_Hour1_1', 5, { encounterTime: 'bad' })], OPEN, NOW)).toEqual([]);
  });
});

describe('patient and stage helpers', () => {
  it('names the active stage from the highest card', () => {
    expect(activeStageOf('Stage1_Hour3_2')).toBe('stage1');
    expect(activeStageOf('Stage2_Hour1_1')).toBe('stage2');
    expect(activeStageOf(null)).toBe('stage1');
    expect(labourStageOf('stage4')).toBe('earlyPostpartum');
  });

  it('joins the name parts, skipping blanks', () => {
    expect(fullName({ patientUuid: 'p', openmrsId: null, firstName: 'Test', middleName: ' ', lastName: 'Patient', dateOfBirth: null, gravida: null })).toBe('Test Patient');
  });
});

describe('scrollTargetId', () => {
  const card = (id: string, status: TimelineCheckpoint['status']) =>
    ({ id, status, scheduledAt: '2026-11-06T10:00:00.000Z' }) as TimelineCheckpoint;

  it('opens at the due card', () => {
    expect(scrollTargetId([card('a', 'completed'), card('b', 'missed'), card('c', 'dueNow'), card('d', 'upcoming')])).toBe('c');
  });

  it('without a due card, at the newest card that is not upcoming', () => {
    expect(scrollTargetId([card('a', 'completed'), card('b', 'missed'), card('c', 'upcoming')])).toBe('b');
  });

  it('nothing to scroll to: none', () => {
    expect(scrollTargetId([])).toBeNull();
    expect(scrollTargetId([card('a', 'upcoming')])).toBeNull();
  });
});

describe('endStageOf (Android manageEndStageButtonText)', () => {
  it('ends the stage of the current card, and nothing without a Stage 1/2 card (never Stage 1 by default)', () => {
    expect(endStageOf('Stage1_Hour3_2')).toBe('stage1');
    expect(endStageOf('Stage2_Hour1_1')).toBe('stage2');
    expect(endStageOf(null)).toBeNull();
    expect(endStageOf('Stage3_Hour1_1')).toBeNull();
  });
});

describe('outcomeView (Android setVisitOutcome / updateOutOfTimeOutcomeText)', () => {
  const summary = (outcome: string, motherDeceasedReason: string | null = null, otherComment: string | null = null) => ({
    outcome,
    hasMotherDeceased: motherDeceasedReason !== null,
    motherDeceasedReason,
    otherComment,
  });

  it('a plain outcome: "Mother Outcome", no reason, no View more', () => {
    expect(outcomeView(summary('Shift to C-Section'))).toEqual({ kind: 'mother', outcome: 'Shift to C-Section', reason: null, more: null });
  });

  it('a reason or comment: "Outcome" with the reason, and View more', () => {
    expect(outcomeView(summary('Mother Death', 'PPH'))).toMatchObject({ kind: 'outcome', reason: 'PPH' });
    expect(outcomeView(summary('Other', null, 'Went home'))).toMatchObject({
      kind: 'outcome',
      reason: 'Went home',
      more: { otherComment: 'Went home', motherDeceasedReason: null },
    });
  });

  it('nothing stored, or the visit still open: nothing to show', () => {
    expect(outcomeView(summary(''))).toBeNull();
    expect(outcomeView(null)).toBeNull();
  });
});

describe('stageHeadings (Android TimelineAdapter tvStage)', () => {
  const at = '2026-11-18T10:00:00.000Z';
  it('a heading over the first card of each stage; SOS and the upcoming card continue their stage', () => {
    expect(
      stageHeadings(
        [
          { id: '1', cardName: 'Stage1_Hour1_1', scheduledAt: at, status: 'completed' },
          { id: '2', cardName: 'Stage1_Hour1_2', scheduledAt: at, status: 'missed' },
          { id: 's', isSos: true, scheduledAt: at, status: 'completed' },
          { id: '3', cardName: 'Stage2_Hour1_1', scheduledAt: at, status: 'dueNow' },
          { id: 'u', cardName: 'Stage2_Hour1_2', scheduledAt: at, status: 'upcoming' },
        ],
        'stage2',
      ),
    ).toEqual(['stage1', null, null, 'stage2', null]);
  });

  it('a list that starts with an SOS card takes the active stage', () => {
    expect(stageHeadings([{ id: 's', isSos: true, scheduledAt: at, status: 'completed' }], 'stage1')).toEqual(['stage1']);
  });
});

