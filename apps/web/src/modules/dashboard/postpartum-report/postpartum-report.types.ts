/*
 * View-model shapes for the Postpartum Report opened from the LCG view —
 * ports the reference app's stage3.component (Early PostPartum Monitoring
 * Report): a delivery outcome summary (the DELIVERY_OUTCOME_STAGE3
 * encounter), the maternal and newborn monitoring grid (the Stage3_Hour*
 * encounters and Stage 3 SOS readings), and the mother / newborn assessment
 * and plan history.
 */

import type { LcgNoteEntry, LcgOwnedEntry } from '../elcg/elcg.types';

export type PostpartumSection = 'maternal' | 'newborn';

/* The delivery outcome summary at the top of the report; null fields render as "-". */
export interface PostpartumDeliveryOutcome {
  deliveryDate: string | null;
  deliveryTime: string | null;
  deliveryMode: string | null;
  placentaMembraneDelivery: string | null;
  placentaDeliveryTime: string | null;
  placentaCordAbnormality: string | null;
  perinealLaceration: string | null;
  degreeOfTear: string | null;
  /* One medication per entry — the reference lists them one per line. */
  amtslMedication: string[];
  babyStatus: string | null;
  babyGender: string | null;
  babyWeight: string | null;
  apgar1: string | null;
  apgar5: string | null;
  resuscitation: string | null;
  skinToSkin: string | null;
  breastfeedingInOneHour: string | null;
  gestationWeeks: string | null;
  congenitalDisorders: string[];
}

/* One monitoring column: a scheduled check (0 min … +3h 45m) or an SOS reading. */
export interface PostpartumColumn {
  label: string;
  /* The encounter's datetime; null for a check not recorded yet. */
  time: string | null;
  /* The Stage3_Hour* / SOS encounter recorded in this column; null while due. */
  encounterUuid: string | null;
  isSos: boolean;
}

/*
 * A note-style observation (assessment / plan), signed by whoever recorded
 * it — the LCG's own note entry, with its creator so only they may edit it.
 */
export type PostpartumNote = LcgOwnedEntry<LcgNoteEntry>;

/* Whose decision a note is — the report's two Shared Decision Making columns. */
export type PostpartumPatient = 'mother' | 'newborn';

export type PostpartumNoteKind = 'assessment' | 'plan';

/* A single-value row: one reading (or nothing) per column. */
export interface PostpartumReadingRow {
  kind: 'reading';
  /* Matched by the alert rules in postpartum-report.alerts.ts. */
  key: PostpartumReadingKey;
  label: string;
  values: (string | null)[];
}

/* A free-text row (assessment / plan): any number of signed notes per column. */
export interface PostpartumNoteRow {
  kind: 'notes';
  key: PostpartumNoteKind;
  label: string;
  values: PostpartumNote[][];
}

export type PostpartumRow = PostpartumReadingRow | PostpartumNoteRow;

export type PostpartumReadingKey =
  /* Shared by both sections. */
  | 'respiratoryRate'
  | 'temperature'
  | 'complication'
  /* Maternal. */
  | 'pulse'
  | 'bp'
  | 'bloodLoss'
  | 'uterusContracted'
  | 'urinePassed'
  | 'hematoma'
  /* Newborn. */
  | 'spo2'
  | 'grunting'
  | 'chestIndrawing'
  | 'fastBreathing'
  | 'feetWarm'
  | 'skinColor'
  | 'umbilicalCordOozing'
  | 'suckingFeeding';

export interface PostpartumReportView {
  visitUuid: string;
  /* The patient's OpenMRS uuid — the person new decision obs are recorded for. */
  patientUuid: string;
  patient: { name: string; openMrsId: string | null };
  deliveryOutcome: PostpartumDeliveryOutcome;
  columns: PostpartumColumn[];
  /* Each row's `values` has one entry per column. */
  maternal: PostpartumRow[];
  newborn: PostpartumRow[];
}
