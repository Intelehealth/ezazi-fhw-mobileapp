import { FIELD_ID } from '../constants';
import type { FieldId } from '../constants';
import { deepFreeze } from '../internal/deepFreeze';

/**
 * Which control each field is entered with, shared so mobile and web show the same choice
 * (Figma "Observation flow", decided 2026-10-23). Android used dialogs and text boxes; the
 * stored values do not change with the control.
 */
export type FieldControl =
  | 'segmented' // up to four options as buttons
  | 'chips' // a short numeric scale as one row of chips
  | 'picker' // five or more options in a bottom sheet
  | 'stepper' // a number with - / + and typing
  | 'infusion'
  | 'medicineList'
  | 'noteList'
  | 'text';

export const FIELD_CONTROLS: Readonly<Record<FieldId, FieldControl>> = deepFreeze({
  [FIELD_ID.COMPANION]: 'segmented',
  [FIELD_ID.PAIN_RELIEF]: 'segmented',
  [FIELD_ID.ORAL_FLUID]: 'segmented',
  [FIELD_ID.POSTURE]: 'segmented',
  [FIELD_ID.BASELINE_FHR]: 'stepper',
  [FIELD_ID.FHR_DECELERATION]: 'segmented',
  [FIELD_ID.AMNIOTIC_FLUID]: 'picker',
  [FIELD_ID.FETAL_POSITION]: 'segmented',
  [FIELD_ID.CAPUT]: 'segmented',
  [FIELD_ID.MOULDING]: 'segmented',
  [FIELD_ID.PULSE]: 'stepper',
  [FIELD_ID.SYSTOLIC_BP]: 'stepper',
  [FIELD_ID.DIASTOLIC_BP]: 'stepper',
  [FIELD_ID.TEMPERATURE]: 'stepper',
  [FIELD_ID.URINE_PROTEIN]: 'picker',
  [FIELD_ID.URINE_ACETONE]: 'picker',
  [FIELD_ID.CONTRACTIONS_PER_10MIN]: 'stepper',
  [FIELD_ID.CONTRACTION_DURATION]: 'stepper',
  [FIELD_ID.CERVIX]: 'chips',
  [FIELD_ID.DESCENT]: 'chips',
  [FIELD_ID.OXYTOCIN]: 'infusion',
  [FIELD_ID.MEDICINE]: 'medicineList',
  [FIELD_ID.IV_FLUIDS]: 'infusion',
  [FIELD_ID.ASSESSMENT]: 'noteList',
  [FIELD_ID.PLAN]: 'noteList',
  [FIELD_ID.SUPERVISOR_DOCTOR]: 'text',
});

/** The control a field is entered with. */
export function getFieldControl(id: FieldId): FieldControl {
  return FIELD_CONTROLS[id];
}
