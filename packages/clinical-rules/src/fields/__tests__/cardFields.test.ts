import { describe, it, expect } from 'vitest';
import {
  EXAM_CARD_NAMES,
  getCardLayout,
  getField,
  getFieldOptions,
  getSosLayout,
} from '../cardFields';
import { STAGE1_CARDS, STAGE2_CARDS, findCard } from '../../cards/schedule';
import type { MonitoringStage } from '../../cards/types';
import type { CardLayout, FieldDefinition } from '../types';

// ── Android oracle ─────────────────────────────────────────────────────────
// The five ParamInfo flags per field, copied from PartogramConstants.java:120-481.
type Flag = 'onlyOneHour' | 'halfHour' | 'fifteenMin' | 'fiveHour' | 'eachEncounter';
const SECTION_ORDER = ['supportiveCare', 'baby', 'woman', 'labourProgress', 'medication', 'sharedDecisionMaking'];
const ANDROID_FIELDS: { id: string; section: string; flags: Record<MonitoringStage, Flag[]> }[] = [
  ...['companion', 'painRelief', 'oralFluid', 'posture'].map((id) => ({
    id, section: 'supportiveCare', flags: { stage1: ['onlyOneHour'], stage2: ['onlyOneHour'] } as Record<MonitoringStage, Flag[]>,
  })),
  ...['baselineFhr', 'fhrDeceleration'].map((id) => ({
    id, section: 'baby', flags: { stage1: ['halfHour', 'fifteenMin'], stage2: ['halfHour', 'fifteenMin'] } as Record<MonitoringStage, Flag[]>,
  })),
  ...['amnioticFluid', 'fetalPosition', 'caput', 'moulding'].map((id) => ({
    id, section: 'baby', flags: { stage1: ['fiveHour'], stage2: ['fiveHour'] } as Record<MonitoringStage, Flag[]>,
  })),
  ...['pulse', 'systolicBp', 'diastolicBp', 'temperature', 'urineProtein', 'urineAcetone'].map((id) => ({
    id, section: 'woman', flags: { stage1: ['fiveHour'], stage2: ['fiveHour'] } as Record<MonitoringStage, Flag[]>,
  })),
  ...['contractionsPer10Min', 'contractionDuration'].map((id) => ({
    id, section: 'labourProgress', flags: { stage1: ['halfHour', 'fifteenMin'], stage2: ['halfHour', 'fifteenMin'] } as Record<MonitoringStage, Flag[]>,
  })),
  ...['cervix', 'descent'].map((id) => ({
    id, section: 'labourProgress', flags: { stage1: ['fiveHour'], stage2: ['fifteenMin'] } as Record<MonitoringStage, Flag[]>,
  })),
  ...['oxytocin', 'medicine', 'ivFluids'].map((id) => ({
    id, section: 'medication', flags: { stage1: ['eachEncounter'], stage2: ['eachEncounter'] } as Record<MonitoringStage, Flag[]>,
  })),
  ...['assessment', 'plan', 'supervisorDoctor'].map((id) => ({
    id, section: 'sharedDecisionMaking', flags: { stage1: ['eachEncounter'], stage2: ['eachEncounter'] } as Record<MonitoringStage, Flag[]>,
  })),
];
const ANDROID_FIVE_HOUR_CARDS = ['Stage1_Hour1_1', 'Stage1_Hour5_1', 'Stage1_Hour9_1', 'Stage1_Hour13_1', 'Stage2_Hour2_2'];

/** TimelineAdapter.nextIntent + the three PartogramDataCaptureActivity.prepareDataFor* filters. */
function androidCardFieldIds(cardName: string, sos: { stage: MonitoringStage } | null): string[][] {
  const stage: MonitoringStage = sos ? sos.stage : cardName.startsWith('Stage2') ? 'stage2' : 'stage1';
  const slot = sos ? 1 : Number(cardName.split('_')[2]);
  const type = sos ? 'HOURLY' : stage === 'stage1' ? (slot === 2 ? 'HALF_HOUR' : 'HOURLY') : slot === 1 ? 'HOURLY' : 'FIFTEEN_MIN';
  const isNormal = !sos;
  const isFiveHourCard = ANDROID_FIVE_HOUR_CARDS.includes(cardName);
  const has = (f: (typeof ANDROID_FIELDS)[number], flag: Flag) => f.flags[stage].includes(flag);

  return SECTION_ORDER.map((section) =>
    ANDROID_FIELDS.filter((f) => f.section === section)
      .filter((f) => {
        if (type === 'HOURLY') {
          const base = has(f, 'onlyOneHour') || has(f, 'halfHour') || has(f, 'fifteenMin') || has(f, 'eachEncounter');
          return isNormal ? base || (isFiveHourCard && has(f, 'fiveHour')) : base || has(f, 'fiveHour');
        }
        if (type === 'HALF_HOUR') {
          return stage === 'stage1' && !has(f, 'fiveHour') && (has(f, 'halfHour') || has(f, 'eachEncounter'));
        }
        const base = has(f, 'fifteenMin') || has(f, 'eachEncounter');
        return base || (isNormal && isFiveHourCard && has(f, 'fiveHour'));
      })
      .map((f) => f.id),
  ).filter((ids) => ids.length > 0);
}

const layoutIds = (layout: CardLayout | null): string[][] =>
  (layout?.sections ?? []).map((group) => group.fields.map((field) => field.id));

describe('card fields', () => {

  // ── Android parity, every card ───────────────────────────────────────────

  it.each([...STAGE1_CARDS, ...STAGE2_CARDS].map((card) => card.name))(
    '%s shows exactly the fields Android shows, section by section',
    (cardName) => {
      expect(layoutIds(getCardLayout(cardName))).toEqual(androidCardFieldIds(cardName, null));
    },
  );

  it.each(['stage1', 'stage2'] as const)('an SOS card in %s shows every field, like Android', (stage) => {
    expect(layoutIds(getSosLayout(stage))).toEqual(androidCardFieldIds('LCG_SOS', { stage }));
  });

  // ── Literal expected tabs per card type (independent of the oracle) ──────

  it.each([
    ['Stage1_Hour1_1', ['supportiveCare:4', 'baby:6', 'woman:6', 'labourProgress:4', 'medication:3', 'sharedDecisionMaking:3']],
    ['Stage1_Hour1_2', ['baby:2', 'labourProgress:2', 'medication:3', 'sharedDecisionMaking:3']],
    ['Stage1_Hour2_1', ['supportiveCare:4', 'baby:2', 'labourProgress:2', 'medication:3', 'sharedDecisionMaking:3']],
    ['Stage1_Hour15_2', ['baby:2', 'labourProgress:2', 'medication:3', 'sharedDecisionMaking:3']],
    ['Stage2_Hour1_1', ['supportiveCare:4', 'baby:2', 'labourProgress:4', 'medication:3', 'sharedDecisionMaking:3']],
    ['Stage2_Hour1_2', ['baby:2', 'labourProgress:4', 'medication:3', 'sharedDecisionMaking:3']],
    ['Stage2_Hour2_2', ['baby:6', 'woman:6', 'labourProgress:4', 'medication:3', 'sharedDecisionMaking:3']],
    ['Stage2_Hour5_4', ['baby:2', 'labourProgress:4', 'medication:3', 'sharedDecisionMaking:3']],
  ])('%s shows these tabs (section:fields)', (cardName, tabs) => {
    const layout = getCardLayout(cardName);
    expect(layout?.sections.map((s) => `${s.section.id}:${s.fields.length}`)).toEqual(tabs);
  });

  it('shows the exact fields of a half-hour card', () => {
    expect(layoutIds(getCardLayout('Stage1_Hour3_2'))).toEqual([
      ['baselineFhr', 'fhrDeceleration'],
      ['contractionsPer10Min', 'contractionDuration'],
      ['oxytocin', 'medicine', 'ivFluids'],
      ['assessment', 'plan', 'supervisorDoctor'],
    ]);
  });

  // ── Readable spot checks of the same rules ───────────────────────────────

  it('shows supportive care on hourly cards but not on half-hour or 15-minute cards', () => {
    const sectionsOf = (name: string) => getCardLayout(name)?.sections.map((s) => s.section.id);
    expect(sectionsOf('Stage1_Hour2_1')).toContain('supportiveCare');
    expect(sectionsOf('Stage1_Hour2_2')).not.toContain('supportiveCare');
    expect(sectionsOf('Stage2_Hour1_3')).not.toContain('supportiveCare');
  });

  it('shows the Woman section only on the four-hourly exam cards', () => {
    const hasWoman = (name: string) => getCardLayout(name)?.sections.some((s) => s.section.id === 'woman');
    expect(EXAM_CARD_NAMES.filter(hasWoman)).toEqual(EXAM_CARD_NAMES);
    expect(hasWoman('Stage1_Hour2_1')).toBe(false);
    expect(hasWoman('Stage2_Hour2_1')).toBe(false);
  });

  it('shows cervix and descent on every Stage 2 card but only exam cards in Stage 1', () => {
    const hasCervix = (name: string) =>
      getCardLayout(name)?.sections.some((s) => s.fields.some((f) => f.id === 'cervix'));
    expect(hasCervix('Stage2_Hour3_4')).toBe(true);
    expect(hasCervix('Stage1_Hour5_1')).toBe(true);
    expect(hasCervix('Stage1_Hour6_1')).toBe(false);
  });

  it('returns the stage, so the right options are used', () => {
    expect(getCardLayout('Stage2_Hour1_1')?.stage).toBe('stage2');
    expect(getSosLayout('stage1').stage).toBe('stage1');
  });

  // ── Options per stage ────────────────────────────────────────────────────

  it('offers Cervix 10..5 in Stage 1 and Pushing/10 in Stage 2, stored as Android does', () => {
    const cervix = getField('cervix') as FieldDefinition;
    expect(getFieldOptions(cervix, 'stage1').map((o) => o.value)).toEqual(['10', '9', '8', '7', '6', '5']);
    expect(getFieldOptions(cervix, 'stage2').map((o) => o.value)).toEqual(['P', '10']);
    expect(getFieldOptions(getField('pulse') as FieldDefinition, 'stage1')).toEqual([]);
  });

  // ── Lookups ──────────────────────────────────────────────────────────────

  it('has no layout for something that is not a Stage 1/2 card', () => {
    for (const name of ['Stage3_Hour1_1', 'LCG_SOS', 'stage1_hour1_1', 'Stage1_Hour16_1', 'Stage2_Hour1_5', '']) {
      expect(getCardLayout(name)).toBeNull();
    }
    expect(getField('nope')).toBeNull();
  });

  it('lists exam cards that all exist in the schedule', () => {
    expect(EXAM_CARD_NAMES.every((name) => findCard(name) !== null)).toBe(true);
  });
});
