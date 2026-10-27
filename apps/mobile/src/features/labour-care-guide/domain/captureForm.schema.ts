import { z } from 'zod';
import { FIELD_ID, getCardErrors } from '@ezazi/clinical-rules';
import type { CardLayout, RangeProfileId, ValidationError } from '@ezazi/clinical-rules';

import { toCardInput, type CaptureFormValues } from './captureForm';

type Translate = (key: string, options?: Record<string, unknown>) => string;

// Where RHF keeps each error: value fields under `values`, the Medication answers at the top.
const OWN_PATH = new Set<string>([FIELD_ID.OXYTOCIN, FIELD_ID.IV_FLUIDS, FIELD_ID.MEDICINE]);
const errorPath = (error: ValidationError) => (OWN_PATH.has(error.id) ? [error.id] : ['values', error.id]);

/** An error's message, filled with its range as Android's toasts are. */
export const errorMessage = (error: ValidationError, t: Translate): string =>
  t(error.messageKey, { min: error.range?.min, max: error.range?.max });

/**
 * The capture form's Save rules: the clinical rules package's `getCardErrors` (Android `saveObs`)
 * for the fields this card shows, reported on each field's path.
 */
export function createCaptureFormSchema(layout: CardLayout, profile: RangeProfileId, t: Translate) {
  return z.custom<CaptureFormValues>().superRefine((form, context) => {
    for (const error of getCardErrors(toCardInput(form, layout), profile)) {
      context.addIssue({ code: 'custom', path: errorPath(error), message: errorMessage(error, t) });
    }
  });
}
