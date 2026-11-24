import { z } from 'zod';

type Translate = (key: string) => string;

/**
 * Step 1 of patient registration.
 *
 * Rules mirror `AddNewPatientActivity` / `PatientPersonalInfoFragment` exactly,
 * with three of its bugs deliberately left behind (see below). `superRefine`
 * rather than chained `.min()` so every field reports the legacy's own message
 * and never a zod default.
 *
 * EVERY FIELD IS A STRING. The form holds no `Date` and no `number`: the date
 * picker writes `yyyy-MM-dd` text, and age is typed digits. Only `photoPath` is
 * nullable, because "no photo" is a real state and `''` is not a path.
 *
 * `gender` is absent on purpose — it is a constant the user cannot touch, so it
 * is not a form field. `createPatient` hardcodes `'F'` on the write side.
 */

const NAMESPACE = 'patient.errors';

/**
 * 13, and 13 PASSES. The legacy's message says "greater than 13" while its
 * check is `< 13`, so the two have always disagreed. Both are carried as they
 * are: changing user-facing copy is not this port's call, and tightening the
 * check would start rejecting patients the legacy accepted.
 */
const MIN_AGE = 13;

/** No country code is captured anywhere, so this is the whole number. */
const PHONE_LENGTH = 10;

/**
 * FIRST NAME and LAST NAME.
 *
 * `.trim()` is the one deliberate fix. The legacy trims live in its TextWatcher
 * but gates the submit with `TextUtils.isEmpty`, so a field holding only spaces
 * passes and a space lands in `first_name`.
 */
function requiredText(t: Translate, messageKey: string) {
  return z.string().superRefine((value, ctx) => {
    if (!value.trim()) {
      ctx.addIssue({ code: 'custom', message: t(`${NAMESPACE}.${messageKey}`) });
    }
  });
}

/**
 * MOBILE NUMBER and ALTERNATE MOBILE NUMBER — identical rule, identical
 * message, so they share one shape the way `credentialsFieldSchema.ts` shares
 * username/password across Login and Setup.
 *
 * Optional, but exact when filled: empty passes, anything else must be exactly
 * ten characters. The field strips non-digits on change, so length is the only
 * check left to make here.
 */
function phoneField(t: Translate) {
  return z.string().superRefine((value, ctx) => {
    if (value.length > 0 && value.length !== PHONE_LENGTH) {
      ctx.addIssue({ code: 'custom', message: t(`${NAMESPACE}.mobileLength`) });
    }
  });
}

export function createPersonalInfoFormSchema(t: Translate) {
  return z.object({
    // Written by capturePhoto, never typed, never validated.
    photoPath: z.string().nullable(),

    firstName: requiredText(t, 'firstNameRequired'),
    middleName: z.string(),
    lastName: requiredText(t, 'lastNameRequired'),

    // Never typed either — the field is read-only and opens the picker. Empty
    // is the only failure, which is why the message is "please SELECT".
    dateOfBirth: z.string().superRefine((value, ctx) => {
      if (!value) {
        ctx.addIssue({ code: 'custom', message: t(`${NAMESPACE}.dobRequired`) });
      }
    }),

    /**
     * AGE — empty, non-numeric and below-13 all report the same key, because
     * the legacy has exactly one age message and `patient.errors` is a thirteen
     * key object agreed across both screens.
     *
     * `Number('')` is 0 and `Number('abc')` is NaN, so the guard answers all
     * three without ever throwing. This is the ONLY place >= 13 is enforced:
     * the picker's maxDate stops a chosen date, but a typed age can still break
     * the rule, and typing "1" on the way to "13" must not flash an error —
     * which is what `reValidateMode: 'onSubmit'` buys.
     */
    age: z.string().superRefine((value, ctx) => {
      const years = Number(value);
      if (!value || !Number.isInteger(years) || years < MIN_AGE) {
        ctx.addIssue({ code: 'custom', message: t(`${NAMESPACE}.ageMinimum`) });
      }
    }),

    mobileNumber: phoneField(t),
    alternateMobileNumber: phoneField(t),
  });
}

/**
 * Structurally matches `PersonalDraft` in `stores/registrationDraft.store.ts` —
 * tsc says so at the `setPersonal` call site if it ever stops matching.
 */
export type PersonalInfoFormValues = z.infer<ReturnType<typeof createPersonalInfoFormSchema>>;
