import { parseClinicalDate } from '../../../utils/date-format';
import type {
  OpenMrsValue,
  OpenMrsVisitDetail,
  OpenMrsVisitEncounter,
  OpenMrsVisitObs,
} from '../../../types/visit.types';
import type {
  ElcgView,
  LcgColumn,
  LcgCompletionReason,
  LcgDecisionHistory,
  LcgHour,
  LcgIvFluidEntry,
  LcgIvFluidValue,
  LcgMembraneRuptured,
  LcgNoteEntry,
  LcgOxytocinEntry,
  LcgOxytocinValue,
  LcgPatientInfo,
  LcgReading,
  LcgReadingKey,
  LcgStageNo,
  LcgStageValues,
  LcgVisitCompletion,
} from './elcg.types';

/** Hours on the guide per stage, and the sub-columns an hour starts with. */
const STAGE_HOURS: Record<LcgStageNo, number> = { 1: 15, 2: 5 };
const DEFAULT_SUB_COLUMNS: Record<LcgStageNo, number> = { 1: 2, 2: 4 };

/** The single-value concepts, plotted one reading per sub-column. */
const READING_CONCEPTS: Record<string, LcgReadingKey> = {
  Companion: 'companion',
  'Pain relief': 'painRelief',
  'Oral Fluid': 'oralFluid',
  Posture: 'posture',
  'Baseline FHR': 'baselineFhr',
  'FHR Deceleration': 'fhrDeceleration',
  'Amniotic fluid': 'amnioticFluid',
  'Fetal position': 'fetalPosition',
  Caput: 'caput',
  Moulding: 'moulding',
  PULSE: 'pulse',
  'Systolic BP': 'systolicBp',
  'Diastolic BP': 'diastolicBp',
  'TEMPERATURE (C)': 'temperature',
  'Urine protein': 'urineProtein',
  'Urine acetone': 'urineAcetone',
  'Contractions per 10 min': 'contractions',
  'Duration of contraction': 'contractionDuration',
  'Cervix 0 cm, 1 cm, 2 cm, 3 cm, 4 cm, 5 cm': 'cervix',
  'Descent 0-5': 'descent',
};

const CONCEPT = {
  assessment: 'Assessment',
  plan: 'Additional Comments',
  medicine: 'Medicine',
  medicinePrescribed: 'Medicine Prescribed',
  oxytocin: 'Oxytocin U/l, Drops per min',
  oxytocinPrescribed: 'Oxytocin U/l, Drops per min, Prescribed',
  ivFluids: 'IV fluids',
  ivFluidsPrescribed: 'IV fluids Prescribed',
  sosStageHour: 'SOS_Stage_Hour',
} as const;

const ENCOUNTER = {
  sos: 'LCG_SOS',
  admission: 'Admission',
  visitComplete: 'Visit Complete',
  stage3Outcome: 'DELIVERY_OUTCOME_STAGE3',
} as const;

const SOS_STAGE_HOUR = /Stage(\d+)_Hour(\d+)_SOS(\d+)/;

/** Admission obs that override the patient attributes in the header. */
const ADMISSION_CONCEPTS: Record<string, keyof AdmissionDetails> = {
  'Hospital ID': 'hospitalId',
  Parity: 'parity',
  GRAVIDA: 'gravida',
  'Labor Onset': 'labourOnset',
  'Active Labor Diagnosed': 'activeLabourDiagnosed',
  'Membrane Ruptured Timestamp': 'membraneRuptured',
  'Risk factors': 'riskFactors',
  'Last Menstrual Period (LMP)': 'lmp',
  'Estimated Date of Delivery (EDD)': 'edd',
};

/** The patient attribute each header detail falls back to. */
const DETAIL_ATTRIBUTES: Record<keyof AdmissionDetails, string> = {
  hospitalId: 'Hospital ID',
  parity: 'Parity',
  gravida: 'Gravida',
  labourOnset: 'Labor Onset',
  activeLabourDiagnosed: 'Active Labor Diagnosed',
  membraneRuptured: 'Membrane Ruptured Timestamp',
  riskFactors: 'Risk factors',
  lmp: 'Last Menstrual Period (LMP)',
  edd: 'Estimated Date of Delivery (EDD)',
};

/** "Membrane Ruptured Timestamp" holds a status code when there is no rupture time to record. */
const MEMBRANE_STATUS: Record<string, string> = { I: 'Intact', U: 'Unknown' };

type AdmissionDetails = Record<
  | 'hospitalId'
  | 'parity'
  | 'gravida'
  | 'labourOnset'
  | 'activeLabourDiagnosed'
  | 'membraneRuptured'
  | 'riskFactors'
  | 'lmp'
  | 'edd',
  string | null
>;

export interface ElcgViewContext {
  /** The patient's other visits, for "View Past Details". */
  pastVisitsCount: number;
  /** Stage 3 is offered to the Nepal client only (Angular's `environment.hasStage3`). */
  hasStage3: boolean;
}

/** One encounter's place on the grid. */
interface Slot {
  encounter: OpenMrsVisitEncounter;
  stage: LcgStageNo;
  hour: number;
  isSos: boolean;
  /** 1-based position among the hour's sub-columns. */
  subColumn: number;
}

/** A per-sub-column grid of `T`, for both stages. */
type StageGrid<T> = Record<LcgStageNo, T[]>;

/** An obs or attribute value as display text — a coded answer by its name. */
export function valueText(value: OpenMrsValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return value.display ?? '';
  return String(value);
}

/** Structured oxytocin / IV-fluid values are stored as JSON text; anything else stays text. */
function parseStructured<T>(text: string): T | string {
  if (!text.startsWith('{')) return text;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text;
  }
}

function byTime<T>(time: (item: T) => string, direction: 1 | -1) {
  return (a: T, b: T) =>
    direction * (new Date(time(a)).getTime() - new Date(time(b)).getTime());
}

const newestFirst = byTime<{ obsDatetime: string }>(e => e.obsDatetime, -1);

/** Angular's getInitials(): the recorder's display name, trimmed. */
function initialsOf(name: string | null | undefined): string {
  return name ? name.trim() : '';
}

function signedEntry(obs: OpenMrsVisitObs): LcgNoteEntry {
  return {
    uuid: obs.uuid,
    value: valueText(obs.value),
    initial: initialsOf(obs.creator?.person?.display),
    obsDatetime: obs.obsDatetime,
  };
}

/**
 * Where an encounter belongs on the grid: an LCG_SOS encounter by its
 * `SOS_Stage_Hour` obs (`Stage1_Hour3_SOS1`), an hourly one by its type
 * (`Stage1_Hour3_2`). Null for anything else — admission, stage 3, or an
 * hour past the guide's end.
 */
function placeOf(
  encounter: OpenMrsVisitEncounter
): { stage: LcgStageNo; hour: number; isSos: boolean } | null {
  let stage: number;
  let hour: number;
  let isSos = false;

  if (encounter.encounterType.display === ENCOUNTER.sos) {
    const sosObs = encounter.obs.find(
      obs =>
        obs.concept.display.toLowerCase() === CONCEPT.sosStageHour.toLowerCase()
    );
    const match = SOS_STAGE_HOUR.exec(valueText(sosObs?.value ?? null));
    if (!match) return null;
    stage = Number(match[1]);
    hour = Number(match[2]);
    isSos = true;
  } else if (encounter.display.includes('Stage')) {
    [stage, hour] = encounter.encounterType.display
      .replace('Stage', '')
      .replace('Hour', '')
      .split('_')
      .map(Number);
  } else {
    return null;
  }

  if (stage !== 1 && stage !== 2) return null;
  if (!(hour >= 1 && hour <= STAGE_HOURS[stage])) return null;
  return { stage, hour, isSos };
}

/**
 * readStageData()'s layout: each hour gets one sub-column per encounter in
 * time order, never fewer than its default, so an SOS check widens its hour
 * instead of overwriting another reading.
 */
function layOutSlots(encounters: OpenMrsVisitEncounter[]) {
  const subColumns: StageGrid<number> = {
    1: Array(STAGE_HOURS[1]).fill(DEFAULT_SUB_COLUMNS[1]),
    2: Array(STAGE_HOURS[2]).fill(DEFAULT_SUB_COLUMNS[2]),
  };
  const used: StageGrid<number> = {
    1: Array(STAGE_HOURS[1]).fill(0),
    2: Array(STAGE_HOURS[2]).fill(0),
  };
  const slots: Slot[] = [];

  const inTimeOrder = [...encounters].sort(byTime(e => e.encounterDatetime, 1));
  for (const encounter of inTimeOrder) {
    const place = placeOf(encounter);
    if (!place) continue;
    const { stage, hour } = place;
    const subColumn = ++used[stage][hour - 1];
    subColumns[stage][hour - 1] = Math.max(
      subColumns[stage][hour - 1],
      subColumn
    );
    slots.push({ encounter, subColumn, ...place });
  }

  /* Each hour's first sub-column, counting across the stage. */
  const hourStart: StageGrid<number> = { 1: [], 2: [] };
  for (const stage of [1, 2] as const) {
    let start = 0;
    for (const count of subColumns[stage]) {
      hourStart[stage].push(start);
      start += count;
    }
  }

  return { slots, subColumns, hourStart };
}

function emptyGrid<T>(
  columnCounts: Record<LcgStageNo, number>,
  empty: () => T
): StageGrid<T> {
  return {
    1: Array.from({ length: columnCounts[1] }, empty),
    2: Array.from({ length: columnCounts[2] }, empty),
  };
}

function toStageValues<T>(grid: StageGrid<T>): LcgStageValues<T> {
  return { stage1: grid[1], stage2: grid[2] };
}

/** Each sub-column's entries from `first`, then from `second`. */
function concatGrids<T>(
  first: StageGrid<T[]>,
  second: StageGrid<T[]>
): StageGrid<T[]> {
  return {
    1: first[1].map((list, i) => [...list, ...second[1][i]]),
    2: first[2].map((list, i) => [...list, ...second[2][i]]),
  };
}

/** Every entry of the grid, both stages. */
function allEntries<T>(grid: StageGrid<T[]>): T[] {
  return [...grid[1], ...grid[2]].flat();
}

function readPatientInfo(visit: OpenMrsVisitDetail): LcgPatientInfo {
  const { patient } = visit;
  const details = {} as AdmissionDetails;
  for (const [key, attributeName] of Object.entries(DETAIL_ATTRIBUTES)) {
    const attribute = patient.attributes.find(
      a => a.attributeType.display === attributeName
    );
    details[key as keyof AdmissionDetails] = attribute
      ? valueText(attribute.value)
      : null;
  }

  const admission = visit.encounters.find(
    e => e.encounterType.display === ENCOUNTER.admission
  );
  for (const obs of admission?.obs ?? []) {
    const key = ADMISSION_CONCEPTS[obs.concept.display];
    const text = valueText(obs.value).trim();
    if (key && text) details[key] = text;
  }

  return {
    name: patient.person.display,
    openMrsId: patient.identifiers[0]?.identifier ?? null,
    hospitalId: details.hospitalId,
    parity: details.parity,
    gravida: details.gravida,
    labourOnset: details.labourOnset,
    activeLabourDiagnosed:
      parseClinicalDate(details.activeLabourDiagnosed)?.toISOString() ?? null,
    membraneRuptured: readMembraneRuptured(details.membraneRuptured),
    riskFactors: details.riskFactors,
    lmp: looseDate(details.lmp),
    edd: looseDate(details.edd),
  };
}

function readMembraneRuptured(
  value: string | null
): LcgMembraneRuptured | null {
  const text = value?.trim();
  if (!text) return null;
  const date = parseClinicalDate(text);
  if (date) return { kind: 'date', value: date.toISOString() };
  const code = text.toUpperCase();
  return { kind: 'status', value: MEMBRANE_STATUS[code] ?? code };
}

/** formatDateByClient()'s parse: the clinical formats, else whatever Date accepts. */
function looseDate(value: string | null): string | null {
  if (!value) return null;
  const date = parseClinicalDate(value) ?? new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function obsValue(
  encounter: OpenMrsVisitEncounter | undefined,
  concept: string
): string | null {
  const obs = encounter?.obs.find(o => o.concept.display === concept);
  return obs ? valueText(obs.value) : null;
}

/**
 * The Visit Complete and Stage 3 outcome encounters. A visit is complete with
 * either; only the Visit Complete encounter carries the reason.
 */
function readCompletion(
  visit: OpenMrsVisitDetail,
  hasStage3Feature: boolean
): LcgVisitCompletion | null {
  const complete = visit.encounters.find(
    e => e.encounterType.display === ENCOUNTER.visitComplete
  );
  const stage3 = visit.encounters.find(
    e => e.encounterType.display === ENCOUNTER.stage3Outcome
  );
  if (!complete && !stage3) return null;

  const hasStage3 = hasStage3Feature && Boolean(stage3);
  if (!complete) return { reason: null, birth: null, hasStage3 };

  let reason: LcgCompletionReason;
  const outOfTime = obsValue(complete, 'OUT OF TIME');
  const referType = obsValue(complete, 'Refer Type');
  if (outOfTime !== null) {
    reason = { kind: 'out-of-time', reason: outOfTime };
  } else if (referType === 'Other') {
    reason = {
      kind: 'other',
      reason: obsValue(complete, 'Refer Type Other') ?? '',
    };
  } else if (referType !== null) {
    reason = { kind: 'referred', referType };
  } else {
    const birthOutcome = obsValue(complete, 'Birth Outcome') ?? '';
    reason = {
      kind: 'newborn',
      birthOutcome,
      birthOutcomeOther:
        birthOutcome.toUpperCase() === 'OTHER'
          ? obsValue(complete, 'Birth Outcome Other')
          : null,
      motherDeceasedReason:
        obsValue(complete, 'MOTHER DECEASED REASON') || null,
    };
  }

  /* A visit can be completed without a Stage 3 outcome (e.g. self discharge). */
  const birth = stage3
    ? {
        birthWeight: obsValue(stage3, 'BirthWeight'),
        apgar1: obsValue(stage3, 'Apgar at 1 min'),
        apgar5: obsValue(stage3, 'Apgar at 5 min'),
        babySex: obsValue(stage3, 'Sex'),
        babyStatus: obsValue(stage3, 'BIRTH_TYPE'),
      }
    : null;

  return { reason, birth, hasStage3 };
}

/**
 * Ports partogram.component.ts's reading of a visit — readStageData(),
 * readPatientAttributes() / readAdmissionEncounterInfo(), the Visit Complete
 * handling and getPastData()'s history — into the one ElcgView the screen
 * renders. Everything Angular keeps in `parameters[n]` by magic index is
 * keyed by concept here.
 */
export function mapVisitToElcgView(
  visit: OpenMrsVisitDetail,
  { pastVisitsCount, hasStage3 }: ElcgViewContext
): ElcgView {
  const { slots, subColumns, hourStart } = layOutSlots(visit.encounters);
  const columnCounts = {
    1: subColumns[1].reduce((a, b) => a + b, 0),
    2: subColumns[2].reduce((a, b) => a + b, 0),
  };

  const columns = emptyGrid<LcgColumn>(columnCounts, () => ({
    time: null,
    isSos: false,
  }));
  const hours: StageGrid<LcgHour> = {
    1: subColumns[1].map(count => emptyHour(count)),
    2: subColumns[2].map(count => emptyHour(count)),
  };
  const readings = Object.fromEntries(
    Object.values(READING_CONCEPTS).map(key => [
      key,
      emptyGrid<LcgReading | null>(columnCounts, () => null),
    ])
  ) as Record<LcgReadingKey, StageGrid<LcgReading | null>>;

  const assessments = emptyGrid<LcgNoteEntry[]>(columnCounts, () => []);
  const plans = emptyGrid<LcgNoteEntry[]>(columnCounts, () => []);
  const medicinePrescribed = emptyGrid<LcgNoteEntry[]>(columnCounts, () => []);
  const medicine = emptyGrid<LcgNoteEntry[]>(columnCounts, () => []);
  const oxytocinPrescribed = emptyGrid<LcgOxytocinEntry[]>(
    columnCounts,
    () => []
  );
  /* The nurse records at most one oxytocin / IV-fluid entry per slot: the last wins. */
  const oxytocin = emptyGrid<LcgOxytocinEntry[]>(columnCounts, () => []);
  const ivPrescribed = emptyGrid<LcgIvFluidEntry[]>(columnCounts, () => []);
  const ivFluids = emptyGrid<LcgIvFluidEntry[]>(columnCounts, () => []);

  for (const { encounter, stage, hour, isSos, subColumn } of slots) {
    const column = hourStart[stage][hour - 1] + subColumn - 1;
    columns[stage][column] = { time: encounter.encounterDatetime, isSos };

    if (!isSos) {
      /* The hour's last Stage encounter signs it off, as in Angular. */
      const hourRow = hours[stage][hour - 1];
      hourRow.hasEncounter = true;
      hourRow.initials = initialsOf(
        encounter.encounterProviders[0]?.provider?.person?.display
      );
    }

    const inTimeOrder = [...encounter.obs].sort(byTime(o => o.obsDatetime, 1));
    for (const obs of inTimeOrder) {
      const concept = obs.concept.display;
      const readingKey = READING_CONCEPTS[concept];
      if (readingKey) {
        const alert =
          obs.comment === 'R' || obs.comment === 'Y' ? obs.comment : null;
        readings[readingKey][stage][column] = {
          value: valueText(obs.value),
          alert,
        };
        continue;
      }

      const entry = signedEntry(obs);
      switch (concept) {
        case CONCEPT.assessment:
          assessments[stage][column].push(entry);
          break;
        case CONCEPT.plan:
          plans[stage][column].push(entry);
          break;
        case CONCEPT.medicinePrescribed:
          medicinePrescribed[stage][column].push(entry);
          break;
        case CONCEPT.medicine:
          medicine[stage][column].push(entry);
          break;
        case CONCEPT.oxytocinPrescribed:
          oxytocinPrescribed[stage][column].push({
            ...entry,
            value: parseStructured<LcgOxytocinValue>(entry.value),
          });
          break;
        case CONCEPT.oxytocin:
          oxytocin[stage][column] = [
            { ...entry, value: parseStructured<LcgOxytocinValue>(entry.value) },
          ];
          break;
        case CONCEPT.ivFluidsPrescribed:
          ivPrescribed[stage][column].push({
            ...entry,
            value: parseStructured<LcgIvFluidValue>(entry.value),
          });
          break;
        case CONCEPT.ivFluids:
          ivFluids[stage][column] = [
            { ...entry, value: parseStructured<LcgIvFluidValue>(entry.value) },
          ];
          break;
      }
    }
  }

  /* An hour's assessment and plan cells gather every one of its sub-columns. */
  for (const stage of [1, 2] as const) {
    hours[stage].forEach((hourRow, index) => {
      const start = hourStart[stage][index];
      const end = start + hourRow.subColumns;
      hourRow.assessments = assessments[stage].slice(start, end).flat();
      hourRow.plans = plans[stage].slice(start, end).flat();
    });
  }

  /* Prescribed entries first, then the nurse's, as the Angular cells list them. */
  const medication = {
    oxytocin: toStageValues(concatGrids(oxytocinPrescribed, oxytocin)),
    medicine: toStageValues(concatGrids(medicinePrescribed, medicine)),
    ivFluids: toStageValues(concatGrids(ivPrescribed, ivFluids)),
  };

  /* A "NO" means nothing was given; the grid still shows it, the history does not. */
  const given = (entry: { value: unknown }) => entry.value !== 'NO';

  const history: LcgDecisionHistory = {
    assessment: allEntries(assessments).sort(newestFirst),
    plan: allEntries(plans).sort(newestFirst),
    medication: [
      ...allEntries(medicinePrescribed),
      ...allEntries(medicine),
    ].sort(newestFirst),
    oxytocin: [...allEntries(oxytocinPrescribed), ...allEntries(oxytocin)]
      .filter(given)
      .sort(newestFirst),
    ivFluids: [...allEntries(ivPrescribed), ...allEntries(ivFluids)]
      .filter(given)
      .sort(newestFirst),
  };

  return {
    visitUuid: visit.uuid,
    patient: readPatientInfo(visit),
    stage1: { hours: hours[1], columns: columns[1] },
    stage2: { hours: hours[2], columns: columns[2] },
    readings: Object.fromEntries(
      Object.entries(readings).map(([key, grid]) => [key, toStageValues(grid)])
    ) as ElcgView['readings'],
    medication,
    history,
    completion: readCompletion(visit, hasStage3),
    pastVisitsCount,
  };
}

function emptyHour(subColumns: number): LcgHour {
  return {
    subColumns,
    initials: null,
    hasEncounter: false,
    assessments: [],
    plans: [],
  };
}
