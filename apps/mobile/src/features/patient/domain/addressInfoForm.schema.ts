import { z } from 'zod';
import { clientConfig } from '@/core/config/clients';
import { isKnownDistrict, isKnownState, stateHasDistricts } from './addressMaster';

/**
 * Step 2 of patient registration.
 *
 * Rules mirror `PatientAddressInfoFragment.areValidFields()`, with two of its
 * holes deliberately closed — see `provinceInvalid` and the village regex.
 * `superRefine` rather than chained validators so every field reports the
 * legacy's own message and never a zod default.
 *
 * SIX FIELDS, NOT SEVEN. Country is not in the form: it is never interactive
 * and its value is never read off the widget — it comes from
 * `clientConfig.countryName` and the save mapper writes it from there. A form
 * field that cannot be wrong or empty is a field that only has to be kept in
 * step with something else.
 *
 * `district` and `village` both land in ONE column, `city_village`, joined by
 * `addressMaster`'s codec at save time. They stay separate here because the
 * form collects them separately and the cascade rules differ.
 */

// `t` takes interpolation values here, unlike the other form schemas: the
// postal-code message names the length it is demanding.
type Translate = (key: string, vars?: Record<string, unknown>) => string;

const NAMESPACE = 'patient.errors';

/**
 * ONE value drives the input's `maxLength`, the rule and the message.
 *
 * Two lengths exist because one codebase shipped both countries — India 6,
 * Nepal 5 — and that part was right. What went wrong is that the number lived
 * in code and the wording in a string resource: `strings.xml` carries two
 * `enter_postal_limit` entries and the later one ("5 digits", added for Nepal)
 * won for every flavour, so an India build demanded 6 digits and said 5.
 * Reading both off one config value is what makes that drift impossible.
 */
export const POSTAL_CODE_LENGTH = clientConfig.postalCodeLength;

export const POSTAL_CODE_REGEX = new RegExp(`^\\d{${POSTAL_CODE_LENGTH}}$`);

/**
 * VILLAGE / TOWN / CITY — letters, spaces, hyphens and apostrophes, starting
 * with a letter.
 *
 * The legacy restricted this field to the 52 ASCII letters with
 * `android:digits`, so "Navi Mumbai" could not be typed at all. That is the fix
 * the port asked for. `\p{L}` rather than `A-Za-z` so a non-Latin name is
 * accepted too.
 *
 * `\p{M}` IS NOT OPTIONAL, and this is the trap. A Devanagari word is letters
 * plus combining marks: `पुणे` is प + ु + ण + े, where the two vowel signs are
 * category Mn, not L. `\p{L}` alone therefore rejects almost every real
 * Devanagari place name while accepting the handful written without a vowel
 * sign — which is worse than rejecting the script outright, because it looks
 * like it works. Marks can never START the value: the first character is
 * `\p{L}`.
 *
 * It excludes the COLON on purpose, and that is load-bearing rather than
 * tidiness: `city_village` stores `District:Village`, so a colon typed into
 * the village is a value that cannot be decoded back. Our own writes can never
 * carry two colons because of this rule.
 */
export const VILLAGE_REGEX = /^\p{L}[\p{L}\p{M} '-]*$/u;

export function createAddressInfoFormSchema(t: Translate) {
  return z
    .object({
      state: z.string(),
      district: z.string(),
      village: z.string(),
      addressLine1: z.string(),
      addressLine2: z.string(),
      postalCode: z.string(),
    })
    /**
     * One top-level `superRefine` with explicit `path`s, not six per-field
     * ones: the district rule has to read the state, and a per-field refine
     * cannot see its siblings. Same shape `forgotPasswordResetForm.schema.ts`
     * uses for its confirm-password rule.
     *
     * Every field reports AT MOST ONE issue — "required" or "invalid", never
     * both — which is why these read as if/else rather than as separate
     * guards.
     */
    .superRefine((data, ctx) => {
      const state = data.state.trim();
      const district = data.district.trim();
      const village = data.village.trim();

      // ── PROVINCE / STATE ──────────────────────────────────────────────────
      if (!state) {
        ctx.addIssue({
          code: 'custom',
          message: t(`${NAMESPACE}.provinceRequired`),
          path: ['state'],
        });
      } else if (!isKnownState(state)) {
        // Closes a legacy hole rather than adding a rule. `areValidFields()`
        // computed `searchForState(stateText)` and then never read it, so the
        // placeholder row's literal `Select` passed the gate and was written
        // into `state_province`. The dropdown can only hand back a real entry,
        // so in practice this fires on a restored draft naming a state the
        // asset no longer has.
        ctx.addIssue({
          code: 'custom',
          message: t(`${NAMESPACE}.provinceInvalid`),
          path: ['state'],
        });
      }

      // ── DISTRICT ──────────────────────────────────────────────────────────
      // Required only when the chosen state lists districts — which is the
      // same condition that puts the field on screen at all, so the rule and
      // the render cannot disagree. With no state picked there is no field and
      // no rule.
      if (stateHasDistricts(state)) {
        if (!district) {
          ctx.addIssue({
            code: 'custom',
            message: t(`${NAMESPACE}.districtRequired`),
            path: ['district'],
          });
        } else if (!isKnownDistrict(state, district)) {
          ctx.addIssue({
            code: 'custom',
            message: t(`${NAMESPACE}.districtInvalid`),
            path: ['district'],
          });
        }
      } else if (district) {
        // A district under a state that lists none. Unreachable through the
        // UI — the cascade clears it when the state changes — but a draft or a
        // future asset can produce it, and writing it would encode a district
        // that does not belong to the row.
        ctx.addIssue({
          code: 'custom',
          message: t(`${NAMESPACE}.districtInvalid`),
          path: ['district'],
        });
      }

      // ── VILLAGE / TOWN / CITY ─────────────────────────────────────────────
      if (!village) {
        // Trimmed, so a field of spaces fails. The legacy gated with
        // `TextUtils.isEmpty` and let one through.
        ctx.addIssue({
          code: 'custom',
          message: t(`${NAMESPACE}.cityVillageRequired`),
          path: ['village'],
        });
      } else if (!VILLAGE_REGEX.test(village)) {
        ctx.addIssue({
          code: 'custom',
          message: t(`${NAMESPACE}.cityVillageInvalid`),
          path: ['village'],
        });
      }

      // ── ADDRESS LINE 1 and 2 have no rules at all ────────────────────────
      // Optional and unconstrained in the legacy, and nothing downstream reads
      // them. Listed here so their absence reads as a decision.

      // ── POSTAL CODE ───────────────────────────────────────────────────────
      // Optional, but exact when filled. The message names the length it is
      // demanding, from the same constant as the rule.
      if (data.postalCode && !POSTAL_CODE_REGEX.test(data.postalCode)) {
        ctx.addIssue({
          code: 'custom',
          message: t(`${NAMESPACE}.postalCodeLength`, { length: POSTAL_CODE_LENGTH }),
          path: ['postalCode'],
        });
      }
    });
}

/**
 * Structurally matches `AddressDraft` in `stores/registrationDraft.store.ts` —
 * including `addressLine1` / `addressLine2`, which the store named first. tsc
 * says so at the `setAddress` call site if it ever stops matching.
 */
export type AddressInfoFormValues = z.infer<ReturnType<typeof createAddressInfoFormSchema>>;
