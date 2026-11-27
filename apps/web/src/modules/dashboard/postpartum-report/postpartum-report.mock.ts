import type {
  PostpartumColumn,
  PostpartumNote,
  PostpartumReportView,
} from './postpartum-report.types';

/*
 * Mock data for the Postpartum Report until real Stage 3 (postpartum)
 * encounters are available to test against. While this flag is on, the
 * report renders this mock instead of the visit's data, and the Add dialogs
 * save into it (in memory, until the page is left) instead of OpenMRS. Turn
 * it off once the API integration lands.
 */
export const USE_POSTPARTUM_MOCK = true;

/* stage3.component.ts's COL_OFFSETS / COL_LABELS — minutes after delivery. */
export const POSTPARTUM_CHECKS = [
  { offset: 0, label: '0 min' },
  { offset: 15, label: '+15m' },
  { offset: 30, label: '+30m' },
  { offset: 45, label: '+45m' },
  { offset: 75, label: '+1h 15m' },
  { offset: 105, label: '+1h 45m' },
  { offset: 165, label: '+2h 45m' },
  { offset: 225, label: '+3h 45m' },
] as const;

const DELIVERY = new Date('2026-11-26T08:10:00');
const MINUTE = 60_000;

function at(minutesAfterDelivery: number): string {
  return new Date(
    DELIVERY.getTime() + minutesAfterDelivery * MINUTE
  ).toISOString();
}

/*
 * Six checks recorded, an SOS reading between +45m and +1h 15m, and the last
 * two checks still due — so the grid shows every kind of column.
 */
const COLUMNS: PostpartumColumn[] = [
  ...POSTPARTUM_CHECKS.slice(0, 4).map((check, index) => ({
    label: check.label,
    time: at(check.offset),
    encounterUuid: `mock-enc-${index + 1}`,
    isSos: false,
  })),
  { label: 'SOS', time: at(58), encounterUuid: 'mock-enc-sos-1', isSos: true },
  ...POSTPARTUM_CHECKS.slice(4, 6).map((check, index) => ({
    label: check.label,
    time: at(check.offset),
    encounterUuid: `mock-enc-${index + 5}`,
    isSos: false,
  })),
  ...POSTPARTUM_CHECKS.slice(6).map(check => ({
    label: check.label,
    time: null,
    encounterUuid: null,
    isSos: false,
  })),
];

/* Pads a recorded row with nulls for the checks still due. */
function row(...recorded: (string | null)[]): (string | null)[] {
  return [...recorded, ...Array(COLUMNS.length - recorded.length).fill(null)];
}

const NURSE = 'Sita Sharma';
const DOCTOR = 'Dr. Anil Gupta';
type Author = typeof NURSE | typeof DOCTOR;
const CREATORS: Record<Author, string> = {
  [NURSE]: 'mock-user-nurse',
  [DOCTOR]: 'mock-user-doctor',
};

let noteCount = 0;
function note(value: string, initial: Author, minutes: number): PostpartumNote {
  noteCount += 1;
  return {
    uuid: `mock-note-${noteCount}`,
    value,
    initial,
    obsDatetime: at(minutes),
    creatorUuid: CREATORS[initial],
  };
}

/* Notes per column: column index → the notes recorded in it. */
function notes(byColumn: Record<number, PostpartumNote[]>): PostpartumNote[][] {
  return COLUMNS.map((_, index) => byColumn[index] ?? []);
}

const MOTHER_ASSESSMENT = notes({
  0: [note('Uterus well contracted, bleeding within normal limits.', NURSE, 2)],
  4: [
    note(
      'Increased bleeding (~550 ml), tachycardia. Suspected PPH.',
      DOCTOR,
      60
    ),
  ],
  6: [
    note(
      'Bleeding controlled after uterine massage and oxytocin.',
      DOCTOR,
      108
    ),
  ],
});
const MOTHER_PLAN = notes({
  0: [
    note('Continue 15-minute monitoring, encourage breastfeeding.', NURSE, 3),
  ],
  4: [
    note(
      'Start IV oxytocin 10 IU, uterine massage, monitor every 15 min.',
      DOCTOR,
      61
    ),
    note('Prepare for referral if bleeding persists.', DOCTOR, 62),
  ],
});
const NEWBORN_ASSESSMENT = notes({
  0: [note('Baby active, good cry, pink.', NURSE, 2)],
  4: [note('Mild fast breathing, no chest indrawing.', DOCTOR, 60)],
});
const NEWBORN_PLAN = notes({
  0: [note('Skin-to-skin contact, initiate breastfeeding.', NURSE, 3)],
  4: [note('Keep warm, recheck respiratory rate in 15 min.', DOCTOR, 61)],
});

/* A postpartum report as it would read an hour and three quarters after delivery. */
export function buildMockPostpartumReport(
  visitUuid: string
): PostpartumReportView {
  return {
    visitUuid,
    patientUuid: 'mock-patient',
    patient: { name: 'Priya Devi', openMrsId: '10045-6' },
    deliveryOutcome: {
      deliveryDate: DELIVERY.toISOString(),
      deliveryTime: DELIVERY.toISOString(),
      deliveryMode: 'Spontaneous Vaginal Delivery',
      placentaMembraneDelivery: 'Complete',
      placentaDeliveryTime: at(9),
      placentaCordAbnormality: 'No',
      perinealLaceration: 'Yes',
      degreeOfTear: '1st degree',
      amtslMedication: ['Oxytocin 10 IU IM', 'Misoprostol 600 mcg'],
      babyStatus: 'Live Birth',
      babyGender: 'Female',
      babyWeight: '2950',
      apgar1: '8',
      apgar5: '9',
      resuscitation: 'No',
      skinToSkin: 'Yes',
      breastfeedingInOneHour: 'Yes',
      gestationWeeks: '39',
      congenitalDisorders: [],
    },
    columns: COLUMNS,
    maternal: [
      {
        kind: 'reading',
        key: 'pulse',
        label: 'Pulse',
        values: row('88', '86', '90', '96', '124', '110', '98'),
      },
      {
        kind: 'reading',
        key: 'bp',
        label: 'BP',
        values: row(
          '118/76',
          '116/74',
          '120/78',
          '112/72',
          '96/60',
          '104/66',
          '110/70'
        ),
      },
      {
        kind: 'reading',
        key: 'respiratoryRate',
        label: 'Respiratory Rate',
        values: row('18', '18', '20', '20', '26', '22', '20'),
      },
      {
        kind: 'reading',
        key: 'temperature',
        label: 'Temperature °F',
        values: row('98.4', null, '98.6', null, '98.8', '98.6', '98.6'),
      },
      {
        kind: 'reading',
        key: 'bloodLoss',
        label: 'Blood Loss (ml)',
        values: row('250', '300', '320', '350', '550', '580', '600'),
      },
      {
        kind: 'reading',
        key: 'uterusContracted',
        label: 'Uterus Contracted',
        values: row('Y', 'Y', 'Y', 'Y', 'N', 'Y', 'Y'),
      },
      {
        kind: 'reading',
        key: 'urinePassed',
        label: 'Urine Passed',
        values: row('N', 'N', 'N', 'Y', 'N', 'N', 'Y'),
      },
      {
        kind: 'reading',
        key: 'hematoma',
        label: 'Hematoma',
        values: row('N', 'N', 'N', 'N', 'N', 'N', 'N'),
      },
      {
        kind: 'reading',
        key: 'complication',
        label: 'Complication',
        values: row('N', 'N', 'N', 'N', 'PPH', 'PPH', 'N'),
      },
      {
        kind: 'notes',
        key: 'assessment',
        label: 'Assessment (Mother)',
        values: MOTHER_ASSESSMENT,
      },
      {
        kind: 'notes',
        key: 'plan',
        label: 'Plan (Mother)',
        values: MOTHER_PLAN,
      },
    ],
    newborn: [
      {
        kind: 'reading',
        key: 'respiratoryRate',
        label: 'Respiratory Rate',
        values: row('48', '50', '52', '54', '64', '56', '50'),
      },
      {
        kind: 'reading',
        key: 'spo2',
        label: 'SPO2',
        values: row('94', '95', '96', '96', '91', '95', '97'),
      },
      {
        kind: 'reading',
        key: 'temperature',
        label: 'Temperature °F',
        values: row('98.2', '98.4', '98.6', '98.6', '97.5', '98.2', '98.4'),
      },
      {
        kind: 'reading',
        key: 'grunting',
        label: 'Grunting',
        values: row('N', 'N', 'N', 'N', 'N', 'N', 'N'),
      },
      {
        kind: 'reading',
        key: 'chestIndrawing',
        label: 'Chest Indrawing',
        values: row('N', 'N', 'N', 'N', 'N', 'N', 'N'),
      },
      {
        kind: 'reading',
        key: 'fastBreathing',
        label: 'Fast Breathing',
        values: row('N', 'N', 'N', 'N', 'Y', 'N', 'N'),
      },
      {
        kind: 'reading',
        key: 'feetWarm',
        label: 'Feet (warm)',
        values: row('Y', 'Y', 'Y', 'Y', 'N', 'Y', 'Y'),
      },
      {
        kind: 'reading',
        key: 'skinColor',
        label: 'Skin Color (abnormal)',
        values: row('N', 'N', 'N', 'N', 'N', 'N', 'N'),
      },
      {
        kind: 'reading',
        key: 'umbilicalCordOozing',
        label: 'Umbilical Cord Oozing',
        values: row('N', 'N', 'N', 'N', 'N', 'N', 'N'),
      },
      {
        kind: 'reading',
        key: 'suckingFeeding',
        label: 'Sucking / Feeding',
        values: row('Y', 'Y', 'Y', 'Y', 'Y', 'Y', 'Y'),
      },
      {
        kind: 'reading',
        key: 'complication',
        label: 'Complications',
        values: row('N', 'N', 'N', 'N', 'N', 'N', 'N'),
      },
      {
        kind: 'notes',
        key: 'assessment',
        label: 'Assessment (Newborn)',
        values: NEWBORN_ASSESSMENT,
      },
      {
        kind: 'notes',
        key: 'plan',
        label: 'Plan (Newborn)',
        values: NEWBORN_PLAN,
      },
    ],
  };
}
