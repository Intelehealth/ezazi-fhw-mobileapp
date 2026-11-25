import { describe, expect, it } from 'vitest';

import { RISK_FIELD_IDS, computeVisitRisk, formatVisitRisk, type CervixReading, type RiskObs } from '../riskScore';
import { FIELD_ID } from '../../constants';

// A literal port of Android VisitAlertProcessor + AlertScoreCalculator.calculateUpdated +
// CervixHistoryResolver + CervixPlotEvaluator (whitelabel-master b3ddd15), independent of the package.
function androidRisk(latest: RiskObs[], cervix: CervixReading[], stage3: boolean, now: number): number {
  const calc = (c: string | null) => ((c ?? '').trim().toUpperCase() === 'R' ? 1.0 : 0.0);
  const bpIds = new Set<string>(['systolicBp', 'diastolicBp']);
  let total = 0.0;
  latest.filter((o) => !bpIds.has(o.fieldId)).forEach((o) => { total += calc(o.comment); });
  const bp = latest.filter((o) => bpIds.has(o.fieldId)).map((o) => calc(o.comment));
  if (bp.length > 0) total += Math.max(...bp);
  if (!stage3 && cervix.length > 0) {
    const sorted = [...cervix].sort((a, b) => a.at - b.at);
    const last = sorted[sorted.length - 1];
    const value = /^[+-]?\d+$/.test(last.value) ? Number(last.value) : null;
    if (value !== null) {
      let start = last.at;
      for (let i = sorted.length - 2; i >= 0; i--) {
        if (sorted[i].value === last.value) start = sorted[i].at;
        else break;
      }
      const thresholdHours: Record<number, number> = { 9: 2.0, 8: 2.5, 7: 3.0, 6: 5.0, 5: 6.0 };
      const threshold = thresholdHours[value];
      if (threshold !== undefined && (now - start) / (1000 * 60 * 60) >= threshold) total += 2.0;
    }
  }
  return total;
}

const HOUR = 3_600_000;
const NOW = Date.UTC(2026, 9, 23, 12, 0, 0);

// Deterministic pseudo-random cases, so a failure is reproducible.
let seed = 42;
const random = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)];

describe('computeVisitRisk', () => {
  it('matches Android on 2,000 generated visits', () => {
    for (let n = 0; n < 2000; n++) {
      const latest = RISK_FIELD_IDS.filter(() => random() < 0.6).map((fieldId) => ({
        fieldId,
        comment: pick(['R', 'G', '', null, ' r ', 'Y']),
      }));
      const cervix = Array.from({ length: Math.floor(random() * 5) }, (_, i) => ({
        value: pick(['5', '6', '7', '8', '9', '10', 'P', '7']),
        at: NOW - Math.floor(random() * 10 * HOUR) - i,
      }));
      const stage3 = random() < 0.2;
      expect([latest, cervix, stage3, computeVisitRisk(latest, cervix, stage3, NOW)])
        .toEqual([latest, cervix, stage3, androidRisk(latest, cervix, stage3, NOW)]);
    }
  });

  it('counts the blood-pressure pair once', () => {
    const latest = [
      { fieldId: FIELD_ID.SYSTOLIC_BP, comment: 'R' },
      { fieldId: FIELD_ID.DIASTOLIC_BP, comment: 'R' },
      { fieldId: FIELD_ID.BASELINE_FHR, comment: 'R' },
    ];
    expect(computeVisitRisk(latest, [], false, NOW)).toBe(2);
  });

  it('adds 2 once cervix has stayed at a value for its limit, measured from when it started', () => {
    const at7 = (hoursAgo: number) => ({ value: '7', at: NOW - hoursAgo * HOUR });
    expect(computeVisitRisk([], [at7(3)], false, NOW)).toBe(2);
    expect(computeVisitRisk([], [at7(2.9)], false, NOW)).toBe(0);
    expect(computeVisitRisk([], [at7(3), at7(1)], false, NOW)).toBe(2);
    expect(computeVisitRisk([], [at7(5), { value: '6', at: NOW - 4 * HOUR }, at7(1)], false, NOW)).toBe(0);
    expect(computeVisitRisk([], [{ value: '10', at: NOW - 9 * HOUR }], false, NOW)).toBe(0);
  });

  it('stops counting cervix once Stage 3 has started', () => {
    expect(computeVisitRisk([], [{ value: '9', at: NOW - 5 * HOUR }], true, NOW)).toBe(0);
  });

  it('ignores fields that are not risk fields', () => {
    expect(computeVisitRisk([{ fieldId: FIELD_ID.SUPERVISOR_DOCTOR, comment: 'R' }], [], false, NOW)).toBe(0);
  });
});

describe('formatVisitRisk', () => {
  it('writes the score as Java String.valueOf(double)', () => {
    expect(formatVisitRisk(0)).toBe('0.0');
    expect(formatVisitRisk(3)).toBe('3.0');
    expect(formatVisitRisk(2.5)).toBe('2.5');
  });
});
