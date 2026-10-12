import type { VisitRow } from './dashboard.types';

/**
 * Static sample rows standing in for VisitService.getPriorityVisits() /
 * getInProgressVisits() / getCompletedVisits() until the eLCG visit API is
 * wired into @ezazi/api-client. Shaped to match dashboard.component.ts's
 * extractVisitDetail() output so swapping this for a real fetch later is a
 * drop-in — only the data source changes, not the components consuming it.
 */

export const PRIORITY_CASES: VisitRow[] = [
  {
    uuid: 'visit-pr-1',
    patient: {
      name: 'Asha Devi',
      identifier: 'ELCG-1042',
      gender: 'F',
      age: 27,
    },
    stage: 2,
    alertCount: 3,
    cervixPlotX: '6 cm',
    descentPlotO: '2',
    alarmingReadings: [
      { key: 'Baseline FHR', value: 168 },
      { key: 'Systolic BP', value: 148 },
    ],
    provider: 'Nurse Kavita Rao',
    isUnseen: true,
    inLabourDuration: '3h 20m',
  },
  {
    uuid: 'visit-pr-2',
    patient: {
      name: 'Meena Kumari',
      identifier: 'ELCG-1038',
      gender: 'F',
      age: 32,
    },
    stage: 3,
    alertCount: 1,
    cervixPlotX: '10 cm',
    descentPlotO: '4',
    alarmingReadings: [{ key: 'FHR Deceleration', value: 'Late' }],
    provider: 'Dr. Sameer Joshi',
    isUnseen: false,
    inLabourDuration: '6h 05m',
  },
  {
    uuid: 'visit-pr-3',
    patient: {
      name: 'Priya Sharma',
      identifier: 'ELCG-1051',
      gender: 'F',
      age: 24,
    },
    stage: 1,
    alertCount: 2,
    cervixPlotX: '4 cm',
    descentPlotO: '1',
    alarmingReadings: [{ key: 'Diastolic BP', value: 96 }],
    provider: 'Nurse Kavita Rao',
    isUnseen: true,
    inLabourDuration: '1h 45m',
  },
];

export const IN_PROGRESS_CASES: VisitRow[] = [
  {
    uuid: 'visit-ip-1',
    patient: {
      name: 'Sunita Yadav',
      identifier: 'ELCG-1029',
      gender: 'F',
      age: 29,
    },
    stage: 1,
    alertCount: 0,
    cervixPlotX: '3 cm',
    descentPlotO: '0',
    alarmingReadings: [],
    provider: 'Dr. Anjali Mehta',
    isUnseen: false,
    inLabourDuration: '0h 50m',
  },
  {
    uuid: 'visit-ip-2',
    patient: {
      name: 'Radha Patel',
      identifier: 'ELCG-1033',
      gender: 'F',
      age: 31,
    },
    stage: 2,
    alertCount: 0,
    cervixPlotX: '7 cm',
    descentPlotO: '3',
    alarmingReadings: [],
    provider: 'Nurse Kavita Rao',
    isUnseen: true,
    inLabourDuration: '4h 10m',
  },
  {
    uuid: 'visit-ip-3',
    patient: {
      name: 'Geeta Singh',
      identifier: 'ELCG-1045',
      gender: 'F',
      age: 22,
    },
    stage: 1,
    alertCount: 0,
    cervixPlotX: '2 cm',
    descentPlotO: '-',
    alarmingReadings: [],
    provider: 'Dr. Sameer Joshi',
    isUnseen: false,
    inLabourDuration: '1h 15m',
  },
];

export const COMPLETED_CASES: VisitRow[] = [
  {
    uuid: 'visit-co-1',
    patient: {
      name: 'Lakshmi Nair',
      identifier: 'ELCG-0998',
      gender: 'F',
      age: 26,
    },
    stage: 3,
    alertCount: 0,
    cervixPlotX: '10 cm',
    descentPlotO: '5',
    alarmingReadings: [{ key: 'Amniotic fluid', value: 'Clear' }],
    provider: 'Dr. Anjali Mehta',
    isUnseen: false,
    dateTimeOfBirth: '2026/09/22 08:14 am',
    birthOutcome: 'Live birth',
    completeReason: 'Newborn',
  },
  {
    uuid: 'visit-co-2',
    patient: {
      name: 'Fatima Sheikh',
      identifier: 'ELCG-1002',
      gender: 'F',
      age: 34,
    },
    stage: 3,
    alertCount: 1,
    cervixPlotX: '10 cm',
    descentPlotO: '5',
    alarmingReadings: [{ key: 'Moulding', value: '+1' }],
    provider: 'Nurse Kavita Rao',
    isUnseen: false,
    dateTimeOfBirth: '2026/09/21 11:42 pm',
    birthOutcome: 'Other',
    birthOutcomeOther: 'Referred post-delivery for neonatal care',
    completeReason: 'Newborn',
  },
];
