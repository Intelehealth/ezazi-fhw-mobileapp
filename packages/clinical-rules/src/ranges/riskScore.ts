import { deepFreeze } from '../internal/deepFreeze';

/**
 * Risk score numbers, as Android (whitelabel-master b3ddd15): `AlertScoreCalculator.calculateUpdated`
 * (R = 1), `CervixPlotConfig` (cervix limits, +2) and `VisitQueryResultBinder` (list order cut-offs).
 */
export const RISK_SCORE = deepFreeze({
  redObs: 1,
  cervixStalled: 2,
  cervixLimitHoursByCm: { 9: 2, 8: 2.5, 7: 3, 6: 5, 5: 6 } as Readonly<Record<number, number>>,
  highAbove: 3.5,
  mediumFrom: 0.5,
});
