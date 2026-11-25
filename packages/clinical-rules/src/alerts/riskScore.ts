import { ALERT_CODE, FIELD_ID } from '../constants';
import type { FieldId } from '../constants';
import { deepFreeze } from '../internal/deepFreeze';
import { parseJavaInt } from '../internal/javaNumbers';
import { javaTrim } from '../internal/javaTrim';
import { RISK_SCORE } from '../ranges/riskScore';

/** The Stage 1 / 2 fields that count towards the risk score (Android `RiskConcepts.STAGE_1_2_CONCEPTS`). */
export const RISK_FIELD_IDS: readonly FieldId[] = deepFreeze([
  FIELD_ID.COMPANION,
  FIELD_ID.PAIN_RELIEF,
  FIELD_ID.ORAL_FLUID,
  FIELD_ID.POSTURE,
  FIELD_ID.BASELINE_FHR,
  FIELD_ID.FHR_DECELERATION,
  FIELD_ID.AMNIOTIC_FLUID,
  FIELD_ID.FETAL_POSITION,
  FIELD_ID.CAPUT,
  FIELD_ID.MOULDING,
  FIELD_ID.PULSE,
  FIELD_ID.SYSTOLIC_BP,
  FIELD_ID.DIASTOLIC_BP,
  FIELD_ID.TEMPERATURE,
  FIELD_ID.URINE_PROTEIN,
  FIELD_ID.URINE_ACETONE,
  FIELD_ID.CONTRACTIONS_PER_10MIN,
  FIELD_ID.CONTRACTION_DURATION,
]);

/** The newest obs of one risk field across the visit, as the app's latest-per-concept read returns it. */
export interface RiskObs {
  readonly fieldId: FieldId;
  readonly comment: string | null;
}

/** One stored Cervix value and its card's time (epoch ms). */
export interface CervixReading {
  readonly value: string;
  readonly at: number;
}

const BLOOD_PRESSURE: readonly FieldId[] = [FIELD_ID.SYSTOLIC_BP, FIELD_ID.DIASTOLIC_BP];
const MS_PER_HOUR = 3_600_000;

const obsScore = (obs: RiskObs) =>
  javaTrim(obs.comment ?? '').toUpperCase() === ALERT_CODE.RED ? RISK_SCORE.redObs : 0;

// Android `CervixHistoryResolver` + `CervixPlotEvaluator`: +2 once the latest value has lasted its limit.
function cervixScore(readings: readonly CervixReading[], now: number): number {
  if (readings.length === 0) return 0;
  const sorted = [...readings].sort((a, b) => a.at - b.at);
  const latest = sorted[sorted.length - 1];
  const centimetres = parseJavaInt(latest.value);
  if (centimetres === null) return 0;

  let start = latest.at;
  for (let i = sorted.length - 2; i >= 0 && sorted[i].value === latest.value; i -= 1) start = sorted[i].at;

  const limitHours = RISK_SCORE.cervixLimitHoursByCm[centimetres];
  if (limitHours === undefined) return 0;
  return (now - start) / MS_PER_HOUR >= limitHours ? RISK_SCORE.cervixStalled : 0;
}

/**
 * The visit risk score, as Android's `VisitAlertProcessor` (whitelabel-master b3ddd15): each red
 * risk field scores 1, Systolic and Diastolic together at most 1, plus the cervix score until Stage 3.
 */
export function computeVisitRisk(
  latest: readonly RiskObs[],
  cervixReadings: readonly CervixReading[],
  stage3Started: boolean,
  now: number,
): number {
  const risk = latest.filter((obs) => RISK_FIELD_IDS.includes(obs.fieldId));
  const others = risk.filter((obs) => !BLOOD_PRESSURE.includes(obs.fieldId));
  const pressure = risk.filter((obs) => BLOOD_PRESSURE.includes(obs.fieldId)).map(obsScore);

  const total = others.reduce((sum, obs) => sum + obsScore(obs), 0) + (pressure.length ? Math.max(...pressure) : 0);
  return stage3Started ? total : total + cervixScore(cervixReadings, now);
}

/** The `VISIT_RISK` attribute text, as Java `String.valueOf(double)`: `3.0`, `2.5`. */
export function formatVisitRisk(score: number): string {
  return Number.isInteger(score) ? `${score}.0` : String(score);
}
