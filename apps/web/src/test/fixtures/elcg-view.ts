import type {
  ElcgView,
  LcgColumn,
  LcgHour,
  LcgReading,
  LcgReadingKey,
  LcgStageValues,
} from '../../modules/dashboard/elcg/elcg.types';

/**
 * Small, empty ELCG views for component tests — two first-stage hours (4
 * sub-columns) and one second-stage hour (4 sub-columns) — with helpers to
 * place values. Independent of elcg.mock-data.ts, which goes away once the
 * screen reads the real visit.
 */

export const STAGE1_COLUMNS = 4;
export const STAGE2_COLUMNS = 4;

const READING_KEYS: LcgReadingKey[] = [
  'companion',
  'painRelief',
  'oralFluid',
  'posture',
  'baselineFhr',
  'fhrDeceleration',
  'amnioticFluid',
  'fetalPosition',
  'caput',
  'moulding',
  'pulse',
  'systolicBp',
  'diastolicBp',
  'temperature',
  'urineProtein',
  'urineAcetone',
  'contractions',
  'contractionDuration',
  'cervix',
  'descent',
];

/** A local-time ISO string, so formatted dates/times don't depend on the test machine's zone. */
export function localIso(
  year: number,
  monthIndex: number,
  day: number,
  hours = 0,
  minutes = 0
): string {
  return new Date(year, monthIndex, day, hours, minutes).toISOString();
}

export function buildHour(overrides: Partial<LcgHour> = {}): LcgHour {
  return {
    subColumns: 2,
    initials: null,
    hasEncounter: false,
    assessments: [],
    plans: [],
    ...overrides,
  };
}

function emptyColumns(count: number): LcgColumn[] {
  return Array.from({ length: count }, () => ({ time: null, isSos: false }));
}

/** A reading row with values placed at the given sub-column indexes. */
export function readingValues(
  stage1: Record<number, LcgReading> = {},
  stage2: Record<number, LcgReading> = {}
): LcgStageValues<LcgReading | null> {
  return {
    stage1: Array.from(
      { length: STAGE1_COLUMNS },
      (_, index) => stage1[index] ?? null
    ),
    stage2: Array.from(
      { length: STAGE2_COLUMNS },
      (_, index) => stage2[index] ?? null
    ),
  };
}

export function entryValues<T>(
  stage1: Record<number, T[]> = {},
  stage2: Record<number, T[]> = {}
): LcgStageValues<T[]> {
  return {
    stage1: Array.from(
      { length: STAGE1_COLUMNS },
      (_, index) => stage1[index] ?? []
    ),
    stage2: Array.from(
      { length: STAGE2_COLUMNS },
      (_, index) => stage2[index] ?? []
    ),
  };
}

export function buildElcgView(overrides: Partial<ElcgView> = {}): ElcgView {
  return {
    visitUuid: 'visit-1',
    patient: {
      name: 'Asha Devi',
      openMrsId: 'ELCG-1042',
      hospitalId: null,
      parity: null,
      gravida: null,
      labourOnset: null,
      activeLabourDiagnosed: null,
      membraneRuptured: null,
      riskFactors: null,
      lmp: null,
      edd: null,
    },
    stage1: {
      hours: [buildHour(), buildHour()],
      columns: emptyColumns(STAGE1_COLUMNS),
    },
    stage2: {
      hours: [buildHour({ subColumns: 4 })],
      columns: emptyColumns(STAGE2_COLUMNS),
    },
    readings: Object.fromEntries(
      READING_KEYS.map(key => [key, readingValues()])
    ) as ElcgView['readings'],
    medication: {
      oxytocin: entryValues(),
      medicine: entryValues(),
      ivFluids: entryValues(),
    },
    history: {
      assessment: [],
      plan: [],
      medication: [],
      oxytocin: [],
      ivFluids: [],
    },
    completion: null,
    pastVisitsCount: 0,
    ...overrides,
  };
}
