import { calculateAge } from '../../utils/age';
import { formatDateTime } from '../../utils/date-format';
import type {
  PortalEncounter,
  PortalObs,
  PortalPersonName,
  PortalVisit,
  PortalVisitAttribute,
} from '../../types/visit.types';
import type { VisitAlertNote, VisitRow, VisitStage } from './dashboard.types';

/** Concepts whose red-flagged readings appear under "Alarming readings". */
const ALLOWED_NOTE_KEYS = [
  'Baseline FHR',
  'FHR Deceleration',
  'Amniotic fluid',
  'Moulding',
  'Systolic BP',
  'Diastolic BP',
];

/*
 * The LCG concepts an obs is keyed by. A concept has one name per locale; the
 * first name on this list wins, otherwise the concept's first name is used.
 */
const OBS_CONCEPTS = [
  'Companion',
  'Pain relief',
  'Oral Fluid',
  'Posture',
  'Baseline FHR',
  'FHR Deceleration',
  'Amniotic fluid',
  'Fetal position',
  'Caput',
  'Moulding',
  'PULSE',
  'Systolic BP',
  'Diastolic BP',
  'TEMPERATURE (C)',
  'Urine protein',
  'Contractions per 10 min',
  'Duration of contraction',
  'Cervix 0 cm, 1 cm, 2 cm, 3 cm, 4 cm, 5 cm',
  'Descent 0-5',
  'Oxytocin U/l, Drops per min',
  'Medicine',
  'IV fluids',
  'Assessment',
  'Additional Comments',
  'Encounter status',
  'Urine acetone',
];

const CERVIX_CONCEPT = 'Cervix 0 cm, 1 cm, 2 cm, 3 cm, 4 cm, 5 cm';
const DESCENT_CONCEPT = 'Descent 0-5';
const RED_FLAG = 'R';
const STAGE3_ENCOUNTER = /^Stage3_Hour\d+/;

export interface VisitRowContext {
  /** The signed-in user's OpenMRS uuid — decides the row's seen/unseen highlight. */
  viewerUuid?: string;
  /** OpenMRS REST base URL, for the patient photo (`{base}/personimage/{personUuid}`). */
  openMrsBaseUrl: string;
}

/** Completion details read off the visit's "Visit Complete" encounter. */
interface CompletionDetails {
  completeReason: string;
  outOfTimeReason?: string;
  referTypeOtherReason?: string;
  birthOutcome?: string;
  birthOutcomeOther?: string;
  dateTimeOfBirth?: string;
}

function fullName(name: PortalPersonName | null | undefined): string {
  return [name?.given_name, name?.family_name]
    .filter(part => part && part.trim())
    .join(' ');
}

/** An obs's first concept name — what the "Visit Complete" lookups key on. */
function primaryConceptName(obs: PortalObs): string | undefined {
  return obs.concept?.concept_name?.[0]?.name;
}

/** An obs's LCG key: its first non-voided OBS_CONCEPTS name, else its first name. */
function obsKey(obs: PortalObs): string | undefined {
  const names = obs.concept?.concept_name ?? [];
  const known = names.find(c => !c.voided && OBS_CONCEPTS.includes(c.name));
  return (known ?? names[0])?.name?.trim() || undefined;
}

function obsValue(obs: PortalObs): string | number | null {
  return obs.value_text || obs.value_numeric;
}

function findObsText(
  obs: PortalObs[],
  conceptName: string
): string | undefined {
  return (
    obs.find(o => primaryConceptName(o) === conceptName)?.value_text ??
    undefined
  );
}

function activeAttribute(
  attributes: PortalVisitAttribute[],
  typeName: string
): PortalVisitAttribute | undefined {
  return attributes.find(a => a.attribute_type?.name === typeName && !a.voided);
}

function resolveStage(encounters: PortalEncounter[]): VisitStage {
  const typeNames = encounters.map(e => e.type?.name ?? '');
  if (
    typeNames.some(
      name => STAGE3_ENCOUNTER.test(name) || name === 'DELIVERY_OUTCOME_STAGE3'
    )
  ) {
    return 3;
  }
  return typeNames.some(name => name.includes('Stage2')) ? 2 : 1;
}

/**
 * Why the visit was completed, from its "Visit Complete" encounter: ran out
 * of time, referred (with a reason), or a birth (with its outcome). A visit
 * with no such encounter was simply ended.
 */
function readCompletion(encounter: PortalEncounter): CompletionDetails {
  const { obs } = encounter;

  if (obs.some(o => primaryConceptName(o) === 'OUT_OF_TIME')) {
    return {
      completeReason: 'Out Of Time',
      outOfTimeReason: findObsText(obs, 'OUT_OF_TIME'),
    };
  }

  if (obs.some(o => primaryConceptName(o) === 'Refer Type')) {
    const referType = findObsText(obs, 'Refer Type') ?? 'Ended';
    return {
      completeReason: referType,
      referTypeOtherReason:
        referType === 'Other'
          ? findObsText(obs, 'Refer Type Other')
          : undefined,
    };
  }

  const birthOutcome = findObsText(obs, 'Birth Outcome');
  return {
    completeReason: 'Newborn',
    birthOutcome,
    birthOutcomeOther:
      birthOutcome === 'Other' || birthOutcome === 'OTHER'
        ? findObsText(obs, 'Birth Outcome Other')
        : undefined,
    dateTimeOfBirth: formatDateTime(encounter.encounter_datetime) ?? undefined,
  };
}

/**
 * Maps one portal visit into a dashboard row — the port of
 * dashboard.component.ts's extractVisitDetail(). Unlike the Angular original
 * it never throws on a partial record (a missing encounter type, concept
 * name, provider or patient name): one malformed visit must not take the
 * whole section down with it.
 */
export function mapVisitToRow(
  visit: PortalVisit,
  { viewerUuid, openMrsBaseUrl }: VisitRowContext
): VisitRow {
  const encounters = visit.encounters ?? [];
  const attributes = visit.attributes ?? [];

  /*
   * "Visit Read" lists who has opened the visit, by the first segment of
   * each viewer's uuid.
   */
  const readBy = activeAttribute(attributes, 'Visit Read')?.value_reference;
  const viewerPrefix = viewerUuid?.split('-')[0];
  const isSeen = Boolean(
    readBy && viewerPrefix && readBy.includes(viewerPrefix)
  );

  const riskValue = activeAttribute(attributes, 'Visit Risk')?.value_reference;
  const score = riskValue ? parseFloat(riskValue) || 0 : 0;

  const redFlags = new Map<string, string | number>();
  let cervixPlotX: string | null = null;
  let descentPlotO: string | null = null;
  let completion: CompletionDetails | null = null;

  for (const encounter of encounters) {
    if (encounter.voided || !Array.isArray(encounter.obs)) continue;

    for (const obs of encounter.obs) {
      if (obs.voided) continue;
      const key = obsKey(obs);
      if (!key) continue;
      const value = obsValue(obs);

      if (obs.comments === RED_FLAG && ALLOWED_NOTE_KEYS.includes(key)) {
        redFlags.set(key, value ?? '-');
      }
      if (key === CERVIX_CONCEPT)
        cervixPlotX = value == null ? null : String(value);
      if (key === DESCENT_CONCEPT)
        descentPlotO = value == null ? null : String(value);
    }

    if (encounter.type?.name === 'Visit Complete') {
      completion = readCompletion(encounter);
    }
  }

  const alarmingReadings: VisitAlertNote[] = [...redFlags.entries()]
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const providerName = fullName(
    encounters[0]?.encounter_provider?.provider?.person?.person_name
  );
  const personUuid = visit.person?.uuid;
  const birthdate = visit.person?.birthdate?.slice(0, 10) ?? '';

  return {
    uuid: visit.uuid,
    patient: {
      name: fullName(visit.patient_name) || '-',
      identifier: visit.patient?.identifier ?? '-',
      gender: visit.person?.gender ?? '-',
      age: calculateAge(birthdate),
      avatarUrl: personUuid
        ? `${openMrsBaseUrl}/personimage/${personUuid}`
        : undefined,
    },
    stage: resolveStage(encounters),
    alertCount: score,
    cervixPlotX,
    descentPlotO,
    alarmingReadings,
    provider: providerName || '-',
    isUnseen: !isSeen,
    inLabourDuration: formatDateTime(visit.date_started) ?? undefined,
    ...(completion ?? { completeReason: 'Ended' }),
  };
}
