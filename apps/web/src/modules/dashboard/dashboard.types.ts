/**
 * Domain shapes for the ELCG dashboard's three case sections — what
 * dashboard.component.html renders per column. Built from the portal's raw
 * OpenMRS visit tree by visit-row.mapper.ts (the port of
 * dashboard.component.ts's extractVisitDetail()).
 */

export type VisitStage = 1 | 2 | 3;

export interface VisitPatientSummary {
  name: string;
  identifier: string;
  gender: string;
  /** Null when OpenMRS has no (parseable) birthdate for the patient. */
  age: number | null;
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
  /** The visit's "Visit Risk" score — what the "No. of Alerts" column shows. */
  alertCount: number;
  cervixPlotX: string | null;
  descentPlotO: string | null;
  alarmingReadings: VisitAlertNote[];
  provider: string;
  /** True when the signed-in provider hasn't opened this visit yet — drives the `.unseen` row highlight. */
  isUnseen: boolean;
  /**
   * Priority/in-progress only. Despite the column's "In-labour duration"
   * heading this is the visit's formatted start date-time — exactly what the
   * Angular dashboard puts there (`in_labour_duration = getCreatedAt(date_started)`).
   */
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
