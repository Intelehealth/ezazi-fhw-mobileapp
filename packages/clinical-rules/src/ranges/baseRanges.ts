import { FIELD_ID, INFUSION_INPUT_ID } from '../constants';
import { deepFreeze } from '../internal/deepFreeze';
import type { RangeTable } from './types';

/**
 * THE min/max of every field, as Android enforces them: `ValidationConstants.kt` (labelled
 * "Stage 3", used for every stage) and `AppConstants.java`, not the disagreeing comments.
 * Change a value here and every rule that uses it follows. Per-client changes: `rangeProfiles.ts`.
 */
export const BASE_RANGES: RangeTable = deepFreeze({
  [FIELD_ID.BASELINE_FHR]: {
    min: 90,
    max: 220,
    unit: 'bpm',
    checkedOn: 'save',
    androidSource: 'AppConstants.java:58-59',
  },
  [FIELD_ID.PULSE]: {
    min: 30,
    max: 250,
    unit: 'bpm',
    checkedOn: 'save',
    androidSource: 'ValidationConstants.kt:26-27',
  },
  [FIELD_ID.SYSTOLIC_BP]: {
    min: 30,
    max: 300,
    unit: 'mmHg',
    checkedOn: 'save',
    androidSource: 'ValidationConstants.kt:29-30',
  },
  [FIELD_ID.DIASTOLIC_BP]: {
    min: 20,
    max: 180,
    unit: 'mmHg',
    checkedOn: 'save',
    androidSource: 'ValidationConstants.kt:32-33',
  },
  [FIELD_ID.TEMPERATURE]: {
    min: 89.6,
    max: 109.0,
    unit: 'degF',
    checkedOn: 'save',
    androidSource: 'ValidationConstants.kt:35-36',
  },
  [FIELD_ID.CONTRACTION_DURATION]: {
    min: 0,
    max: 100,
    unit: 'seconds',
    checkedOn: 'save',
    androidSource: 'AppConstants.java:55-56',
  },
  [INFUSION_INPUT_ID.STRENGTH]: {
    min: 1,
    max: 10,
    unit: 'iuPerL',
    checkedOn: 'typing', // save checks only "not empty" (Medication.java:108-110)
    androidSource: 'PartogramQueryListingAdapter.java:1250',
  },
  [INFUSION_INPUT_ID.INFUSION_RATE]: {
    min: 5,
    max: 60,
    unit: 'dropsPerMin',
    checkedOn: 'saveAndTyping',
    androidSource: 'Medication.java:117',
  },
});
