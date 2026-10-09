/**
 * Domain shapes for the ELCG dashboard's three case sections. Mirrors the
 * fields dashboard.component.ts's extractVisitDetail()/getPriorityVisits()
 * family read off a raw OpenMRS visit — trimmed to what dashboard.component.html
 * actually renders per column, since this pass has no visit API to consume yet.
 */

export type VisitStage = 1 | 2 | 3;

export interface VisitPatientSummary {
  name: string;
  identifier: string;
  gender: string;
  age: number;
  avatarUrl?: string;
}

/** One row of dashboard.component.html's "Alarming readings" notes list. */
export interface VisitAlertNote {
  key: string;
  value: string | number;
}

export interface VisitRow {
  uuid: string;
  patient: VisitPatientSummary;
  stage: VisitStage;
  alertCount: number;
  cervixPlotX: string | null;
  descentPlotO: string | null;
  alarmingReadings: VisitAlertNote[];
  provider: string;
  /** True when the signed-in provider hasn't opened this visit yet — drives the `.unseen` row highlight. */
  isUnseen: boolean;
  /** Priority/in-progress only — blank for completed cases. */
  inLabourDuration?: string;
  /** Completed only. */
  dateTimeOfBirth?: string;
  birthOutcome?: string;
  birthOutcomeOther?: string;
  completeReason?: string;
  outOfTimeReason?: string;
  referTypeOtherReason?: string;
}

export type CaseSectionKey = 'priority' | 'in-progress' | 'completed';

export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}
