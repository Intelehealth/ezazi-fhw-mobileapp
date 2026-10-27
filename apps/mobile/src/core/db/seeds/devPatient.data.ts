import { ALERT_CODE, STAGE, formatCardName } from '@ezazi/clinical-rules';

import {
  BASELINE_FHR,
  CONTRACTIONS_PER_10MIN,
  DIASTOLIC_BP,
  DURATION_OF_CONTRACTION,
  OBS_GRAVIDA,
  OBS_PARITY,
  PULSE,
  SYSTOLIC_BP,
  TEMPERATURE,
} from '../constants/obs';

/**
 * The fake labour patient for development builds (EXPO_PUBLIC_DEV_SEED).
 * Fictional data only — never a real patient, never real credentials.
 */

const { RED, GREEN } = ALERT_CODE;

export interface DevObs {
  readonly concept: string;
  readonly value: string;
  /** `tbl_obs.comment`; left out means `''`. */
  readonly alert?: string | null;
}

export interface DevCard {
  readonly name: string;
  readonly minutesAgo: number;
  readonly obs: readonly DevObs[];
  readonly missed?: boolean;
}

export interface DevSos {
  readonly hour: number;
  readonly index: number;
  readonly minutesAgo: number;
  readonly obs: readonly DevObs[];
}

export const DEV_PATIENT = {
  uuid: 'b7d4f2a0-5c1e-4f3a-9a6b-2d8e7c0f1a01',
  openmrsId: 'EZ-DEV-0001',
  firstName: 'Test',
  lastName: 'Patient',
  dateOfBirth: '1998-04-12',
  gender: 'F',
} as const;

export const DEV_VISIT_UUID = 'b7d4f2a0-5c1e-4f3a-9a6b-2d8e7c0f1a02';

export const DEV_ADMITTED_MINUTES_AGO = 125;

export const DEV_ADMISSION_VALUES: readonly DevObs[] = [
  { concept: OBS_GRAVIDA, value: '1' },
  { concept: OBS_PARITY, value: '0' },
];

/** One card per timeline state: two submitted, one missed, the due card last (next one in 10 min). */
export const DEV_CARDS: readonly DevCard[] = [
  {
    name: formatCardName(STAGE.STAGE1, 1, 1),
    minutesAgo: 120,
    obs: [
      { concept: BASELINE_FHR, value: '150', alert: GREEN },
      { concept: PULSE, value: '88', alert: GREEN },
      { concept: SYSTOLIC_BP, value: '145', alert: RED },
      { concept: DIASTOLIC_BP, value: '92', alert: RED },
      { concept: TEMPERATURE, value: '98.6', alert: GREEN },
      { concept: CONTRACTIONS_PER_10MIN, value: '3', alert: GREEN },
      { concept: DURATION_OF_CONTRACTION, value: '40', alert: GREEN },
    ],
  },
  {
    name: formatCardName(STAGE.STAGE1, 1, 2),
    minutesAgo: 90,
    obs: [
      { concept: BASELINE_FHR, value: '165', alert: RED },
      { concept: CONTRACTIONS_PER_10MIN, value: '4', alert: GREEN },
      { concept: DURATION_OF_CONTRACTION, value: '45', alert: GREEN },
    ],
  },
  { name: formatCardName(STAGE.STAGE1, 2, 1), minutesAgo: 60, obs: [], missed: true },
  { name: formatCardName(STAGE.STAGE1, 2, 2), minutesAgo: 20, obs: [] },
];

export const DEV_SOS: DevSos = {
  hour: 2,
  index: 1,
  minutesAgo: 45,
  obs: [{ concept: BASELINE_FHR, value: '105', alert: RED }],
};
