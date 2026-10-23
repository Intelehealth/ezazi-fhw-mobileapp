import type { MonitoringStage } from '../cards/types';
import type { ConceptKey, FIELD_ID, FieldId, SectionId } from '../constants';
import type { DecimalLimits, IntegerLimits } from '../ranges/types';

/**
 * Which cards show a field (replaces Android's five boolean flags):
 * `hourlyCards` = `_1` cards (`onlyOneHour`); `everyCard` (`halfHour`/`fifteenMin`/`eachEncounter`);
 * `examCards` = the four-hourly exam cards only (`fiveHour`). SOS cards show every field.
 */
export type FieldFrequency = 'hourlyCards' | 'everyCard' | 'examCards';

/** Android `FirstLetterUpperCaseInputFilter`: ASCII letters, digits, punctuation and space only. */
export type TextCharacters = 'asciiLettersDigitsPunctuationSpace';

/** A choice: `value` is stored in the obs exactly as Android stores it; the label is for display. */
export interface OptionDefinition {
  readonly value: string;
  readonly labelKey: string;
  readonly androidLabel: string; // Android's English text, the default label
  readonly alert?: true; // Android's alert engine stores "R" for this value
}

/**
 * How Android saves (`saveObs`). `value`: one obs, alert code in `comment`; skipped when
 * empty, but a cleared value on an edited card is saved empty. `infusion`: "No" or one JSON
 * obs. `medicineList`: "No" or one obs per medicine. `noteList`: one obs per note.
 */
export type StorageFormat = 'value' | 'infusion' | 'medicineList' | 'noteList';

export type InputSpec =
  | { readonly kind: 'select'; readonly options: readonly OptionDefinition[] }
  | { readonly kind: 'integer'; readonly limits: IntegerLimits } // range: `getRangeFor(profile, id)`
  | { readonly kind: 'decimal'; readonly limits: DecimalLimits }
  | { readonly kind: 'text'; readonly characters: TextCharacters; readonly capitalizeFirst: boolean }
  | { readonly kind: 'infusion'; readonly variant: typeof FIELD_ID.OXYTOCIN | typeof FIELD_ID.IV_FLUIDS }
  | { readonly kind: 'medicineList' }
  | { readonly kind: 'noteList' };

/** One partogram field. Pure data: no logic, no uuid. */
export interface FieldDefinition {
  readonly id: FieldId;
  readonly section: SectionId;
  readonly conceptKey: ConceptKey;
  readonly labelKey: string;
  readonly androidLabel: string;
  readonly input: InputSpec;
  readonly storage: StorageFormat;
  readonly frequency: Readonly<Record<MonitoringStage, FieldFrequency>>;
  /** Replaces `input.options` for one stage (Android: Cervix in Stage 2). */
  readonly optionsByStage?: Readonly<Partial<Record<MonitoringStage, readonly OptionDefinition[]>>>;
  readonly androidSource: string;
}

export interface SectionDefinition {
  readonly id: SectionId;
  readonly labelKey: string;
  readonly androidLabel: string;
}

/** One section of a card, with the fields that card shows, in Android order. */
export interface CardSection {
  readonly section: SectionDefinition;
  readonly fields: readonly FieldDefinition[];
}

/** What a card shows. `stage` picks the options (see `getFieldOptions`). */
export interface CardLayout {
  readonly stage: MonitoringStage;
  readonly sections: readonly CardSection[];
}
