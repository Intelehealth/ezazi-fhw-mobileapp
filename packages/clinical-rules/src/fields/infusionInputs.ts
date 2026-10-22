import { INFUSION_INPUT_ID, IV_FLUID_OTHER_VALUE, infusionInputLabelKey, optionLabelKey } from '../constants';
import type { InfusionInputId } from '../constants';
import { deepFreeze } from '../internal/deepFreeze';
import type { OptionDefinition, TextCharacters } from './types';

/**
 * The inputs inside the Oxytocin and IV Fluids fields (`PartogramQueryListingAdapter`),
 * saved together as one JSON obs (`storage/infusionJson.ts`). Both open with a Yes/No
 * choice that defaults to No; No saves "No" (`NO_RESPONSE_VALUE`). Limits: `INFUSION_INPUT_LIMITS`.
 */

const option = (owner: InfusionInputId, value: string, slug: string, androidLabel: string): OptionDefinition => ({
  value,
  labelKey: optionLabelKey(owner, slug),
  androidLabel,
});

/** `PartogramConstants.infusionStatus`; the stored value is the label itself. */
export const INFUSION_STATUS_OPTIONS: readonly OptionDefinition[] = deepFreeze([
  option(INFUSION_INPUT_ID.INFUSION_STATUS, 'Started', 'started', 'Started'),
  option(INFUSION_INPUT_ID.INFUSION_STATUS, 'Continued', 'continued', 'Continued'),
  option(INFUSION_INPUT_ID.INFUSION_STATUS, 'Stopped', 'stopped', 'Stopped'),
]);

/** IV fluid type. "Other IV Fluid*" is a text box: it stores type `Other` + `otherType` text. */
export const IV_FLUID_TYPE_OPTIONS: readonly OptionDefinition[] = deepFreeze([
  option(INFUSION_INPUT_ID.IV_FLUID_TYPE, 'Ringer Lactate', 'ringerLactate', 'Ringer Lactate'),
  option(INFUSION_INPUT_ID.IV_FLUID_TYPE, 'Normal Saline', 'normalSaline', 'Normal Saline'),
  option(INFUSION_INPUT_ID.IV_FLUID_TYPE, 'Dextrose 5% (D5)', 'dextrose5', 'Dextrose 5% (D5)'),
  option(INFUSION_INPUT_ID.IV_FLUID_TYPE, IV_FLUID_OTHER_VALUE, 'other', 'Other IV Fluid*'),
]);

const label = (id: InfusionInputId, androidLabel: string) => ({ labelKey: infusionInputLabelKey(id), androidLabel });

/** Sub-input labels, from `res/values/strings.xml` 1074-1078 (adapter 952-954, 1211-1213). */
export const INFUSION_INPUT_LABELS = deepFreeze({
  [INFUSION_INPUT_ID.STRENGTH]: label(INFUSION_INPUT_ID.STRENGTH, 'Strength (U/L)*'),
  [INFUSION_INPUT_ID.INFUSION_RATE]: label(INFUSION_INPUT_ID.INFUSION_RATE, 'IV Infusion Rate*\n(drops/minute)'),
  [INFUSION_INPUT_ID.INFUSION_STATUS]: label(INFUSION_INPUT_ID.INFUSION_STATUS, 'IV Infusion Status*'),
  [INFUSION_INPUT_ID.IV_FLUID_TYPE]: label(INFUSION_INPUT_ID.IV_FLUID_TYPE, 'Type of IV Fluid*'),
});

/** "Other" IV fluid text (adapter :756-757); its length is in `INFUSION_INPUT_LIMITS`. */
export const OTHER_TYPE_TEXT = deepFreeze({
  characters: 'asciiLettersDigitsPunctuationSpace' as TextCharacters,
  capitalizeFirst: true,
});
