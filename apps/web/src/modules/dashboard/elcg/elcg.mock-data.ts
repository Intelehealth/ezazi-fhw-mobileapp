import type {
  ElcgView,
  LcgColumn,
  LcgHour,
  LcgReading,
  LcgReadingKey,
  LcgStageValues,
  LcgVisitCompletion,
} from './elcg.types';

/**
 * Static sample data standing in for the visit fetch until the ELCG screen
 * is wired to the API — the same role dashboard.mock-data.ts played for the
 * dashboard. Shaped exactly as the future visit → ElcgView mapper will
 * produce it, so swapping this for a real fetch only changes the data source.
 *
 * The sample is three hours into the active first stage. Hour 2 has one SOS
 * encounter, which widens it from 2 sub-columns to 3, like readStageData().
 */

const STAGE1_SUB_COLUMNS = [2, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2];
const STAGE2_SUB_COLUMNS = [4, 4, 4, 4, 4];
const STAGE1_COLUMN_COUNT = STAGE1_SUB_COLUMNS.reduce((a, b) => a + b, 0);
const STAGE2_COLUMN_COUNT = STAGE2_SUB_COLUMNS.reduce((a, b) => a + b, 0);

/** Sub-column → encounter time; hour 2's third sub-column (index 4) is the SOS. */
const STAGE1_TIMES: Record<number, string> = {
  0: '2026-11-02T06:00:00+05:30',
  1: '2026-11-02T06:30:00+05:30',
  2: '2026-11-02T07:00:00+05:30',
  3: '2026-11-02T07:30:00+05:30',
  4: '2026-11-02T07:45:00+05:30',
  5: '2026-11-02T08:00:00+05:30',
  6: '2026-11-02T08:30:00+05:30',
};
const STAGE1_SOS_COLUMNS = new Set([4]);

function fill<T>(length: number, entries: Record<number, T>, empty: T): T[] {
  return Array.from({ length }, (_, index) => entries[index] ?? empty);
}

function columns(
  length: number,
  times: Record<number, string>,
  sos: Set<number>
): LcgColumn[] {
  return Array.from({ length }, (_, index) => ({
    time: times[index] ?? null,
    isSos: sos.has(index),
  }));
}

function hours(subColumns: number[], recorded: Partial<LcgHour>[]): LcgHour[] {
  return subColumns.map((count, index) => ({
    subColumns: count,
    initials: null,
    hasEncounter: false,
    assessments: [],
    plans: [],
    ...recorded[index],
  }));
}

/** A stage-1-only reading row (stage 2 not reached yet). */
function stage1Readings(
  entries: Record<number, LcgReading>
): LcgStageValues<LcgReading | null> {
  return {
    stage1: fill(STAGE1_COLUMN_COUNT, entries, null),
    stage2: fill(STAGE2_COLUMN_COUNT, {}, null),
  };
}

function emptyEntries<T>(): LcgStageValues<T[]> {
  return {
    stage1: fill<T[]>(STAGE1_COLUMN_COUNT, {}, []),
    stage2: fill<T[]>(STAGE2_COLUMN_COUNT, {}, []),
  };
}

const NURSE = 'Kavita Rao';
const DOCTOR = 'Dr. Sameer Joshi';

const ASSESSMENT_1 = {
  uuid: 'obs-assessment-1',
  value: 'Labour progressing normally',
  initial: DOCTOR,
  obsDatetime: '2026-11-02T06:40:00+05:30',
};
const ASSESSMENT_2 = {
  uuid: 'obs-assessment-2',
  value: 'Raised FHR — monitor closely',
  initial: DOCTOR,
  obsDatetime: '2026-11-02T07:50:00+05:30',
};
const PLAN_1 = {
  uuid: 'obs-plan-1',
  value: 'Encourage oral fluids and mobility',
  initial: DOCTOR,
  obsDatetime: '2026-11-02T06:42:00+05:30',
};
const MEDICINE_1 = {
  uuid: 'obs-medicine-1',
  value: 'Tablet | Paracetamol | 500 mg | 1::tablet | Once | Oral | 1::day',
  initial: DOCTOR,
  obsDatetime: '2026-11-02T07:05:00+05:30',
};
const OXYTOCIN_1 = {
  uuid: 'obs-oxytocin-1',
  value: { strength: '5', infusionRate: '10', infusionStatus: 'start' },
  initial: DOCTOR,
  obsDatetime: '2026-11-02T08:05:00+05:30',
};
const IV_FLUID_1 = {
  uuid: 'obs-iv-1',
  value: {
    type: 'Ringer Lactate',
    infusionRate: '20',
    infusionStatus: 'start',
  },
  initial: NURSE,
  obsDatetime: '2026-11-02T07:35:00+05:30',
};

const READINGS: Record<LcgReadingKey, LcgStageValues<LcgReading | null>> = {
  companion: stage1Readings({
    0: { value: 'Y' },
    2: { value: 'Y' },
    5: { value: 'N', alert: 'R' },
  }),
  painRelief: stage1Readings({
    0: { value: 'N', alert: 'R' },
    2: { value: 'Y' },
    5: { value: 'Y' },
  }),
  oralFluid: stage1Readings({
    0: { value: 'Y' },
    2: { value: 'Y' },
    5: { value: 'Y' },
  }),
  posture: stage1Readings({
    0: { value: 'MO' },
    2: { value: 'SP', alert: 'R' },
    5: { value: 'MO' },
  }),
  baselineFhr: stage1Readings({
    0: { value: '140' },
    1: { value: '142' },
    2: { value: '150' },
    3: { value: '162', alert: 'R' },
    4: { value: '158', alert: 'Y' },
    5: { value: '148' },
    6: { value: '146' },
  }),
  fhrDeceleration: stage1Readings({
    0: { value: 'N' },
    1: { value: 'N' },
    2: { value: 'E' },
    3: { value: 'L', alert: 'R' },
    4: { value: 'N' },
    5: { value: 'N' },
    6: { value: 'N' },
  }),
  amnioticFluid: stage1Readings({
    0: { value: 'I' },
    2: { value: 'C' },
    5: { value: 'C' },
  }),
  fetalPosition: stage1Readings({
    0: { value: 'A' },
    2: { value: 'A' },
    5: { value: 'P', alert: 'Y' },
  }),
  caput: stage1Readings({
    0: { value: '0' },
    2: { value: '+' },
    5: { value: '+' },
  }),
  moulding: stage1Readings({
    0: { value: '0' },
    2: { value: '+' },
    5: { value: '++' },
  }),
  pulse: stage1Readings({
    0: { value: '88' },
    2: { value: '96' },
    4: { value: '124', alert: 'R' },
    5: { value: '102' },
  }),
  systolicBp: stage1Readings({
    0: { value: '118' },
    2: { value: '124' },
    5: { value: '142', alert: 'R' },
  }),
  diastolicBp: stage1Readings({
    0: { value: '76' },
    2: { value: '80' },
    5: { value: '92', alert: 'R' },
  }),
  temperature: stage1Readings({
    0: { value: '98.4' },
    2: { value: '98.6' },
    5: { value: '99.6', alert: 'Y' },
  }),
  urineProtein: stage1Readings({ 0: { value: 'P-' }, 5: { value: 'P+' } }),
  urineAcetone: stage1Readings({ 0: { value: 'A-' }, 5: { value: 'A-' } }),
  contractions: stage1Readings({
    0: { value: '3' },
    1: { value: '3' },
    2: { value: '4' },
    3: { value: '4' },
    5: { value: '6', alert: 'R' },
    6: { value: '4' },
  }),
  contractionDuration: stage1Readings({
    0: { value: '30' },
    1: { value: '35' },
    2: { value: '40' },
    3: { value: '40' },
    5: { value: '65', alert: 'R' },
    6: { value: '45' },
  }),
  cervix: stage1Readings({
    0: { value: '5' },
    2: { value: '6' },
    5: { value: '7' },
  }),
  descent: stage1Readings({
    0: { value: '4' },
    2: { value: '3' },
    5: { value: '3' },
  }),
};

const medicine = emptyEntries<typeof MEDICINE_1>();
medicine.stage1[2] = [MEDICINE_1];
const oxytocin = emptyEntries<typeof OXYTOCIN_1>();
oxytocin.stage1[5] = [OXYTOCIN_1];
const ivFluids = emptyEntries<typeof IV_FLUID_1>();
ivFluids.stage1[3] = [IV_FLUID_1];

export const ELCG_MOCK_VIEW: ElcgView = {
  visitUuid: 'visit-pr-1',
  patient: {
    name: 'Asha Devi',
    openMrsId: 'ELCG-1042',
    hospitalId: 'HSP-2231',
    parity: '1',
    gravida: '2',
    labourOnset: 'Spontaneous',
    activeLabourDiagnosed: '2026-11-02T05:30:00+05:30',
    membraneRuptured: { kind: 'date', value: '2026-11-02T04:15:00+05:30' },
    riskFactors: 'Previous C-section',
    lmp: '2026-01-26',
    edd: '2026-11-02',
  },
  stage1: {
    hours: hours(STAGE1_SUB_COLUMNS, [
      {
        initials: NURSE,
        hasEncounter: true,
        assessments: [ASSESSMENT_1],
        plans: [PLAN_1],
      },
      { initials: NURSE, hasEncounter: true, assessments: [ASSESSMENT_2] },
      { initials: NURSE, hasEncounter: true },
    ]),
    columns: columns(STAGE1_COLUMN_COUNT, STAGE1_TIMES, STAGE1_SOS_COLUMNS),
  },
  stage2: {
    hours: hours(STAGE2_SUB_COLUMNS, []),
    columns: columns(STAGE2_COLUMN_COUNT, {}, new Set()),
  },
  readings: READINGS,
  medication: { oxytocin, medicine, ivFluids },
  history: {
    assessment: [ASSESSMENT_2, ASSESSMENT_1],
    plan: [PLAN_1],
    medication: [MEDICINE_1],
    oxytocin: [OXYTOCIN_1],
    ivFluids: [IV_FLUID_1],
  },
  completion: null,
  pastVisitsCount: 1,
};

/** The completed-visit variant: a live birth with a Stage 3 outcome recorded. */
export const ELCG_COMPLETED_MOCK_COMPLETION: LcgVisitCompletion = {
  reason: {
    kind: 'newborn',
    birthOutcome: 'Live Birth',
    birthOutcomeOther: null,
    motherDeceasedReason: null,
  },
  birth: {
    birthWeight: '3.1 kg',
    apgar1: '8',
    apgar5: '9',
    babySex: 'F',
    babyStatus: 'Live Birth',
  },
  hasStage3: false,
};
