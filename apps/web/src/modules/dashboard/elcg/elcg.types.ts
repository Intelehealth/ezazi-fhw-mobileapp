/**
 * View-model shapes for the WHO Labour Care Guide (ELCG) screen — what
 * partogram.component.html renders, already laid out into columns. The
 * Angular component builds this in place (readStageData() fills its
 * `parameters[n].stage1values/stage2values` arrays by magic index); here a
 * future mapper will produce one typed `ElcgView` from the visit instead, so
 * the components only ever render.
 */

export type LcgStageNo = 1 | 2;

/** An alert-tracked observation's `comment`: R(ed) or Y(ellow). */
export type LcgAlertLevel = 'R' | 'Y';

/** One plotted reading in a sub-column. */
export interface LcgReading {
  value: string;
  alert?: LcgAlertLevel | null;
}

/** A note-style observation, signed by whoever recorded it. */
export interface LcgSignedEntry<TValue = string> {
  uuid: string;
  value: TValue;
  /** The recorder's name — Angular's getInitials() just trims the display name. */
  initial: string;
  obsDatetime: string;
}

export interface LcgOxytocinValue {
  strength: string;
  infusionRate: string;
  infusionStatus: string;
}

export interface LcgIvFluidValue {
  type: string;
  otherType?: string;
  infusionRate: string;
  infusionStatus: string;
}

export type LcgNoteEntry = LcgSignedEntry;
/** Structured when the obs value was JSON, the raw string otherwise (e.g. "NO"). */
export type LcgOxytocinEntry = LcgSignedEntry<LcgOxytocinValue | string>;
export type LcgIvFluidEntry = LcgSignedEntry<LcgIvFluidValue | string>;

/** One time sub-column — the slot of one hourly or SOS encounter. */
export interface LcgColumn {
  /** The encounter's datetime; null for a slot nothing has been recorded in yet. */
  time: string | null;
  isSos: boolean;
}

/** One hour of a stage. */
export interface LcgHour {
  /**
   * Sub-columns this hour spans: 2 per stage-1 hour and 4 per stage-2 hour,
   * widened by each SOS encounter recorded in that hour.
   */
  subColumns: number;
  /** Who recorded the hour's (first) Stage encounter. */
  initials: string | null;
  /** The hour has a Stage encounter — only then do its assessment/plan cells render. */
  hasEncounter: boolean;
  /** Every sub-column's entries for the hour, oldest first. */
  assessments: LcgNoteEntry[];
  plans: LcgNoteEntry[];
}

export interface LcgStage {
  hours: LcgHour[];
  /** Every hour's sub-columns, flattened in order: `columns.length` is the sum of `hours[].subColumns`. */
  columns: LcgColumn[];
}

/** One grid row's per-sub-column values, for both stages. */
export interface LcgStageValues<T> {
  stage1: T[];
  stage2: T[];
}

/** The single-value rows of the guide, each plotted one reading per sub-column. */
export type LcgReadingKey =
  | 'companion'
  | 'painRelief'
  | 'oralFluid'
  | 'posture'
  | 'baselineFhr'
  | 'fhrDeceleration'
  | 'amnioticFluid'
  | 'fetalPosition'
  | 'caput'
  | 'moulding'
  | 'pulse'
  | 'systolicBp'
  | 'diastolicBp'
  | 'temperature'
  | 'urineProtein'
  | 'urineAcetone'
  | 'contractions'
  | 'contractionDuration'
  | 'cervix'
  | 'descent';

/**
 * Prescribed entries (the doctor's) and recorded ones (the nurse's) share a
 * cell in the Angular grid, prescribed first — merged into one list here.
 */
export interface LcgMedication {
  oxytocin: LcgStageValues<LcgOxytocinEntry[]>;
  medicine: LcgStageValues<LcgNoteEntry[]>;
  ivFluids: LcgStageValues<LcgIvFluidEntry[]>;
}

/** The "Membrane Ruptured Timestamp" obs: a real time, or a status code's label (Intact/Unknown). */
export type LcgMembraneRuptured =
  { kind: 'date'; value: string } | { kind: 'status'; value: string };

/** The guide's header block (admission obs take precedence over patient attributes). */
export interface LcgPatientInfo {
  name: string;
  openMrsId: string | null;
  hospitalId: string | null;
  parity: string | null;
  gravida: string | null;
  labourOnset: string | null;
  activeLabourDiagnosed: string | null;
  membraneRuptured: LcgMembraneRuptured | null;
  riskFactors: string | null;
  lmp: string | null;
  edd: string | null;
}

/** Shared-decision-making history, every list newest first. */
export interface LcgDecisionHistory {
  assessment: LcgNoteEntry[];
  plan: LcgNoteEntry[];
  medication: LcgNoteEntry[];
  oxytocin: LcgOxytocinEntry[];
  ivFluids: LcgIvFluidEntry[];
}

export type LcgDecisionKind = keyof LcgDecisionHistory;

/** Why the visit was completed — the Visit Complete encounter's reading. */
export type LcgCompletionReason =
  | { kind: 'out-of-time'; reason: string }
  | { kind: 'other'; reason: string }
  /** Any other "Refer Type", shown as recorded. */
  | { kind: 'referred'; referType: string }
  | {
      kind: 'newborn';
      birthOutcome: string;
      birthOutcomeOther: string | null;
      /** Set only when the mother died. */
      motherDeceasedReason: string | null;
    };

/** The DELIVERY_OUTCOME_STAGE3 encounter's baby details. */
export interface LcgBirthDetails {
  birthWeight: string | null;
  apgar1: string | null;
  apgar5: string | null;
  babySex: string | null;
  babyStatus: string | null;
}

export interface LcgVisitCompletion {
  /** Null when only a Stage 3 outcome exists (no Visit Complete encounter). */
  reason: LcgCompletionReason | null;
  birth: LcgBirthDetails | null;
  /** A Stage 3 outcome was recorded — offers "View Stage 3" instead of the in-grid outcome. */
  hasStage3: boolean;
}

export interface ElcgView {
  visitUuid: string;
  patient: LcgPatientInfo;
  stage1: LcgStage;
  stage2: LcgStage;
  readings: Record<LcgReadingKey, LcgStageValues<LcgReading | null>>;
  medication: LcgMedication;
  history: LcgDecisionHistory;
  /** Null while the visit is still in progress. */
  completion: LcgVisitCompletion | null;
  /** The patient's other visits — "View Past Details" is disabled at 0. */
  pastVisitsCount: number;
}
