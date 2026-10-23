import { describe, it, expect } from 'vitest';
import { decideSos } from '../decideSos';
import {
  formatSosLabel,
  getSosCardStage,
  parseCardStageHour,
  parseSosLabel,
  resolveEncounterKind,
  stageDigit,
} from '../sosLabel';
import type { SosReferenceCard, SosRequest } from '../types';
import { STAGE1_CARDS, STAGE2_CARDS } from '../../cards/schedule';

const NOW = Date.UTC(2026, 10, 3, 9, 30, 15);
const STAGE4_CARDS = ['Stage3_Hour1_1', 'Stage3_Hour1_2', 'Stage3_Hour1_3', 'Stage3_Hour1_4',
  'Stage3_Hour2_1', 'Stage3_Hour2_2', 'Stage3_Hour3_1', 'Stage3_Hour4_1'];

const card = (name: string, providerUuid: string | null = 'p-1', privacyNoticeValue: string | null = 'true'): SosReferenceCard =>
  ({ name, providerUuid, privacyNoticeValue });
const request = (latest: SosReferenceCard | null, latestSosLabel: string | null = null, extra: Partial<SosRequest> = {}): SosRequest =>
  ({ visitCompleted: false, isVisitHolder: true, decisionPending: false, latestCard: latest, latestSosLabel, ...extra });

// ── Android oracle: TimelineVisitSummaryActivity.collectEmergencyData 1440-1505 ──
function javaParseInt(text: string): number {
  if (!/^[+-]?\d+$/.test(text)) throw new Error('NumberFormatException');
  return Number(text);
}
function androidSosLabel(latestName: string | null, latestSosObs: string | null): string | null {
  if (latestName === null) return null;
  const name = latestName.toLowerCase();
  if (!name.includes('stage') || !name.includes('hour')) return null;
  const parts = name.split('stage').join('').split('hour').join('').split('_');
  if (parts.length !== 3) return null;
  const [currentStage, currentHour] = [javaParseInt(parts[0]), javaParseInt(parts[1])];
  let cardNumber = 1;
  const sos = (latestSosObs ?? '').toLowerCase();
  if (sos && sos.includes('stage') && sos.includes('hour') && sos.includes('sos')) {
    try {
      const p = sos.split('stage').join('').split('hour').join('').split('sos').join('').split('_');
      if (p.length === 3) {
        const [lastStage, lastHour, lastSos] = p.map(javaParseInt);
        if (lastStage === currentStage && lastHour === currentHour) cardNumber = lastSos + 1;
      }
    } catch {
      // NumberFormatException ignored, as in Android
    }
  }
  return `Stage${currentStage}_Hour${currentHour}_SOS${cardNumber}`;
}

const REFERENCE_NAMES = [...STAGE1_CARDS.map((c) => c.name), ...STAGE2_CARDS.map((c) => c.name), ...STAGE4_CARDS,
  'DELIVERY_OUTCOME_STAGE3', 'ENCOUNTER_VISIT_NOTE', 'EMERGENCY'];
const PREVIOUS_LABELS = [null, '', 'SOS', 'garbage', 'Stage1_Hour3_SOS1', 'Stage1_Hour3_SOS7', 'stage1_hour3_sos2',
  'Stage1_Hour1_SOS1', 'Stage2_Hour3_SOS1', 'Stage2_Hour5_SOS9', 'Stage3_Hour2_SOS4', 'Stage3_Hour4_SOS1',
  'Stage1_Hour3_SOSx', 'Stage1_Hour3', 'Stage1_Hour3_SOS+2', 'Stage4_Hour3_SOS1', 'Stage1_Hour15_SOS3'];

describe('decideSos against Android collectEmergencyData', () => {
  it('produces the same label (or nothing) for every reference card and previous SOS', () => {
    let compared = 0;
    for (const name of REFERENCE_NAMES) {
      for (const previous of PREVIOUS_LABELS) {
        const decision = decideSos(request(card(name), previous), NOW);
        const port = decision.kind === 'createSos' ? decision.label : null;
        expect(port, `${name} after ${String(previous)}`).toBe(androidSosLabel(name, previous));
        compared += 1;
      }
    }
    expect(compared).toBe(REFERENCE_NAMES.length * PREVIOUS_LABELS.length);
  });
});

describe('decideSos', () => {

  // ── When an SOS can be raised ────────────────────────────────────────────

  it('is blocked on a completed visit (Android hides the button)', () => {
    expect(decideSos(request(card('Stage1_Hour3_1'), null, { visitCompleted: true, isVisitHolder: false }), NOW))
      .toEqual({ kind: 'blocked', reason: 'visitCompleted' });
  });

  it('is blocked for a nurse who does not hold the visit (Android disables the button)', () => {
    expect(decideSos(request(card('Stage1_Hour3_1'), null, { isVisitHolder: false }), NOW))
      .toEqual({ kind: 'blocked', reason: 'notVisitHolder' });
  });

  it('is blocked during Decision Pending: no activity after it (deviation, decided 2026-10-15)', () => {
    expect(decideSos(request(card('Stage1_Hour15_2'), null, { decisionPending: true }), NOW))
      .toEqual({ kind: 'blocked', reason: 'decisionPending' });
    expect(decideSos(request(card('Stage2_Hour5_4'), 'Stage2_Hour5_SOS1', { decisionPending: true }), NOW))
      .toEqual({ kind: 'blocked', reason: 'decisionPending' });
    expect(decideSos(request(card('Stage1_Hour3_1'), null, { decisionPending: true, isVisitHolder: false }), NOW))
      .toEqual({ kind: 'blocked', reason: 'notVisitHolder' });
  });

  it('does nothing without a latest card, or when it is not a stage card (Android: silent return)', () => {
    expect(decideSos(request(null), NOW)).toEqual({ kind: 'blocked', reason: 'noLatestCard' });
    expect(decideSos(request(card('DELIVERY_OUTCOME_STAGE3')), NOW)).toEqual({ kind: 'blocked', reason: 'latestIsNotACard' });
  });

  it('has no limit on how many SOS cards are raised', () => {
    let previous: string | null = null;
    for (let i = 1; i <= 25; i += 1) {
      const decision = decideSos(request(card('Stage2_Hour3_2'), previous), NOW);
      expect(decision.kind === 'createSos' && decision.index).toBe(i);
      previous = decision.kind === 'createSos' ? decision.label : null;
    }
  });

  // ── Label and numbering, the same for Stages 1, 2 and 4 ─────────────────

  it.each([
    ['Stage1_Hour3_2', 'Stage1_Hour3_SOS1', 'stage1', 3],
    ['Stage2_Hour1_4', 'Stage2_Hour1_SOS1', 'stage2', 1],
    ['Stage3_Hour2_1', 'Stage3_Hour2_SOS1', 'stage4', 2],
    ['Stage3_Hour4_1', 'Stage3_Hour4_SOS1', 'stage4', 4],
  ])('after %s, the first SOS is %s (stage %s, hour %i)', (name, label, stage, hour) => {
    expect(decideSos(request(card(name)), NOW)).toMatchObject({ kind: 'createSos', label, stage, hour, index: 1 });
  });

  it('counts up within the same stage and hour, using the card hour (both cards of an hour share it)', () => {
    expect(decideSos(request(card('Stage1_Hour3_1'), 'Stage1_Hour3_SOS1'), NOW)).toMatchObject({ label: 'Stage1_Hour3_SOS2' });
    expect(decideSos(request(card('Stage1_Hour3_2'), 'Stage1_Hour3_SOS2'), NOW)).toMatchObject({ label: 'Stage1_Hour3_SOS3' });
  });

  it('starts again at 1 in a new hour or a new stage', () => {
    expect(decideSos(request(card('Stage1_Hour4_1'), 'Stage1_Hour3_SOS5'), NOW)).toMatchObject({ index: 1 });
    expect(decideSos(request(card('Stage2_Hour3_1'), 'Stage1_Hour3_SOS5'), NOW)).toMatchObject({ index: 1 });
    expect(decideSos(request(card('Stage3_Hour1_1'), 'Stage2_Hour1_SOS2'), NOW)).toMatchObject({ label: 'Stage3_Hour1_SOS1' });
  });

  it('starts at 1 when the previous SOS label is missing or unreadable', () => {
    for (const previous of [null, '', 'SOS', 'Stage1_Hour3_SOSx']) {
      expect(decideSos(request(card('Stage1_Hour3_1'), previous), NOW)).toMatchObject({ index: 1 });
    }
  });

  // ── What gets written ────────────────────────────────────────────────────

  it('times the SOS now (UTC, no ms) and copies provider and privacy notice from the latest card', () => {
    expect(decideSos(request(card('Stage2_Hour2_3', 'provider-9', 'true')), NOW + 999)).toEqual({
      kind: 'createSos',
      label: 'Stage2_Hour2_SOS1',
      stage: 'stage2',
      hour: 2,
      index: 1,
      encounterTime: '2026-11-03 09:30:15',
      providerUuid: 'provider-9',
      privacyNoticeValue: 'true',
    });
  });

  it('copies a missing privacy notice too (Stage 1 first card has none)', () => {
    expect(decideSos(request(card('Stage1_Hour1_1', 'p', null)), NOW)).toMatchObject({ privacyNoticeValue: null });
  });

  it('rejects a clock value that is not epoch ms', () => {
    expect(() => decideSos(request(card('Stage1_Hour1_1')), Number.NaN)).toThrow(RangeError);
  });
});

describe('SOS labels', () => {
  it('formats with Android stage digits: Stage 4 is written Stage3_', () => {
    expect(formatSosLabel({ stage: 'stage1', hour: 3, index: 2 })).toBe('Stage1_Hour3_SOS2');
    expect(formatSosLabel({ stage: 'stage4', hour: 2, index: 1 })).toBe('Stage3_Hour2_SOS1');
    expect([stageDigit('stage1'), stageDigit('stage2'), stageDigit('stage4')]).toEqual([1, 2, 3]);
  });

  it('parses what it formats, case-insensitively as Android does', () => {
    expect(parseSosLabel('Stage3_Hour2_SOS4')).toEqual({ stage: 'stage4', hour: 2, index: 4 });
    expect(parseSosLabel('stage1_hour3_sos2')).toEqual({ stage: 'stage1', hour: 3, index: 2 });
  });

  it.each([null, undefined, '', 'SOS', 'Stage1_Hour3', 'Stage1_Hour3_SOSx', 'Stage4_Hour1_SOS1', 'Stage1_Hour3_SOS1_x'])(
    'does not parse %j',
    (text) => {
      expect(parseSosLabel(text)).toBeNull();
    },
  );

  it('reads the stage and hour of a reference card name', () => {
    expect(parseCardStageHour('Stage1_Hour15_2')).toEqual({ stage: 'stage1', hour: 15 });
    expect(parseCardStageHour('Stage3_Hour4_1')).toEqual({ stage: 'stage4', hour: 4 });
    expect(parseCardStageHour('DELIVERY_OUTCOME_STAGE3')).toBeNull();
    expect(parseCardStageHour('Stage4_Hour1_1')).toBeNull(); // digit 4 is no stage
    expect(getSosCardStage('Stage9_Hour1_SOS1')).toBeNull();
    expect(parseCardStageHour('LCG_SOS')).toBeNull();
  });
});

describe('reading SOS cards back', () => {
  it('opens an SOS card in the stage of its label, Stage 1 when the label is missing (TimelineAdapter)', () => {
    expect(getSosCardStage('Stage1_Hour3_SOS2')).toBe('stage1');
    expect(getSosCardStage('Stage2_Hour1_SOS1')).toBe('stage2');
    expect(getSosCardStage('Stage3_Hour2_SOS1')).toBe('stage4');
    expect(getSosCardStage('')).toBe('stage1');
    expect(getSosCardStage(null)).toBe('stage1');
    expect(getSosCardStage('SOS')).toBeNull();
  });

  it('tells SOS from NORMAL like EncounterTypeResolver', () => {
    expect(resolveEncounterKind('NORMAL')).toBe('NORMAL');
    expect(resolveEncounterKind(null)).toBe('NORMAL');
    expect(resolveEncounterKind('')).toBe('NORMAL');
    expect(resolveEncounterKind('SOS')).toBe('SOS');
    expect(resolveEncounterKind('sos')).toBe('SOS');
    expect(resolveEncounterKind('Stage1_Hour3_SOS2')).toBe('SOS');
    expect(resolveEncounterKind('Stage3_Hour1_sos1')).toBe('SOS');
    expect(resolveEncounterKind('Stage1_Hour3_2')).toBe('NORMAL');
  });
});
