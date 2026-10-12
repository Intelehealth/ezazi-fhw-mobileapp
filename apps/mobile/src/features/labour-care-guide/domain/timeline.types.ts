/** One of the four stages shown in the timeline's stage stepper. */
export type LabourStage = 'stage1' | 'stage2' | 'delivery' | 'earlyPostpartum';

export const LABOUR_STAGES: readonly LabourStage[] = [
  'stage1',
  'stage2',
  'delivery',
  'earlyPostpartum',
];

/** A checkpoint's state relative to "now" — drives the card's color/content/interactivity. */
export type CheckpointStatus = 'completed' | 'missed' | 'dueNow' | 'upcoming';

export interface TimelineCheckpoint {
  id: string;
  /** When this observation was scheduled to be captured. */
  scheduledAt: string;
  status: CheckpointStatus;
  /** Only set when status === 'completed'. */
  recordedAt?: string;
}

export interface PatientSummary {
  id: string;
  name: string;
  ezId: string;
  ageYears: number;
  /** Obstetric gravida/para shorthand, e.g. "G1". */
  gravidaLabel: string;
}
