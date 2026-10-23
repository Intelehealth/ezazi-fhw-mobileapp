import { FIELD_ID } from '../constants';
import { deepFreeze } from '../internal/deepFreeze';
import type { AlertThresholdTable } from './types';

/**
 * When a number is red, with Android's exact comparisons (`PartogramAlertEngine.getAlertNameUpdated`,
 * whitelabel-master b3ddd15). The same for every client: thresholds are clinical meaning, not a range profile.
 */
export const ALERT_THRESHOLDS: AlertThresholdTable = deepFreeze({
  [FIELD_ID.BASELINE_FHR]: { below: 110, atOrAbove: 160, androidSource: 'PartogramAlertEngine.java:236' },
  [FIELD_ID.PULSE]: { below: 60, atOrAbove: 120, androidSource: 'PartogramAlertEngine.java:291' },
  [FIELD_ID.SYSTOLIC_BP]: { below: 80, atOrAbove: 140, androidSource: 'PartogramAlertEngine.java:300' },
  [FIELD_ID.DIASTOLIC_BP]: { atOrAbove: 90, androidSource: 'PartogramAlertEngine.java:307' },
  [FIELD_ID.TEMPERATURE]: { below: 95, atOrAbove: 99.5, androidSource: 'PartogramAlertEngine.java:314' },
  [FIELD_ID.CONTRACTIONS_PER_10MIN]: { atOrBelow: 2, above: 5, androidSource: 'PartogramAlertEngine.java:358' },
  [FIELD_ID.CONTRACTION_DURATION]: { below: 20, above: 60, androidSource: 'PartogramAlertEngine.java:372' },
});
