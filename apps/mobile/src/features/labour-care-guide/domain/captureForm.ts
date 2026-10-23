import { FIELD_ID, decodeInfusion, decodeMedicine, isNoResponse } from '@ezazi/clinical-rules';
import type {
  CardInput,
  CardLayout,
  CardNotes,
  FieldId,
  InfusionAnswer,
  MedicineAnswer,
  SectionId,
  StoredObs,
  ValidationError,
} from '@ezazi/clinical-rules';

/** The capture screen's form: one value per field, the three Medication answers, and new notes. */
export interface CaptureFormValues {
  values: Partial<Record<FieldId, string>>;
  [FIELD_ID.OXYTOCIN]: InfusionAnswer;
  [FIELD_ID.IV_FLUIDS]: InfusionAnswer;
  [FIELD_ID.MEDICINE]: MedicineAnswer;
  notes: Record<keyof CardNotes, string[]>;
}

const fieldsOf = (layout: CardLayout): FieldId[] => layout.sections.flatMap((s) => s.fields.map((f) => f.id));

// Android's Medication radios start on "No" (handleRadioCheckListener, defaultNo = true).
const NO_INFUSION: InfusionAnswer = { answer: 'no', entry: {} };

function infusionFrom(rows: readonly StoredObs[]): InfusionAnswer {
  const latest = rows[0];
  if (!latest || isNoResponse(latest.value)) return NO_INFUSION;
  return { answer: 'yes', entry: decodeInfusion(latest.value) ?? {} };
}

function medicineFrom(rows: readonly StoredObs[]): MedicineAnswer {
  const medicines = rows.filter((row) => !isNoResponse(row.value)).flatMap((row) => decodeMedicine(row.value) ?? []);
  return medicines.length > 0 ? { answer: 'yes', medicines } : { answer: 'no', medicines: [] };
}

/**
 * Starting values. A new card is empty with the Medication answers on "No"; an edited card shows
 * the newest stored value of each field (`stored` newest first). Notes start empty: they are add-only.
 */
export function initialCaptureValues(layout: CardLayout, stored: readonly StoredObs[] = []): CaptureFormValues {
  const rowsOf = (id: FieldId) => stored.filter((row) => row.fieldId === id);
  const values: Partial<Record<FieldId, string>> = {};
  for (const field of layout.sections.flatMap((s) => s.fields)) {
    if (field.storage === 'value') values[field.id] = rowsOf(field.id)[0]?.value ?? '';
  }
  return {
    values,
    [FIELD_ID.OXYTOCIN]: infusionFrom(rowsOf(FIELD_ID.OXYTOCIN)),
    [FIELD_ID.IV_FLUIDS]: infusionFrom(rowsOf(FIELD_ID.IV_FLUIDS)),
    [FIELD_ID.MEDICINE]: medicineFrom(rowsOf(FIELD_ID.MEDICINE)),
    notes: { [FIELD_ID.ASSESSMENT]: [], [FIELD_ID.PLAN]: [] },
  };
}

/** The package's `CardInput` for this card: only the fields the card shows. */
export function toCardInput(form: CaptureFormValues, layout: CardLayout): CardInput {
  const shown = new Set(fieldsOf(layout));
  const values: Partial<Record<FieldId, string>> = {};
  for (const [id, value] of Object.entries(form.values) as [FieldId, string][]) {
    if (shown.has(id)) values[id] = value;
  }
  return {
    values,
    ...(shown.has(FIELD_ID.OXYTOCIN) && { [FIELD_ID.OXYTOCIN]: form[FIELD_ID.OXYTOCIN] }),
    ...(shown.has(FIELD_ID.IV_FLUIDS) && { [FIELD_ID.IV_FLUIDS]: form[FIELD_ID.IV_FLUIDS] }),
    ...(shown.has(FIELD_ID.MEDICINE) && { [FIELD_ID.MEDICINE]: form[FIELD_ID.MEDICINE] }),
  };
}

/** Error count per tab, and the first tab with an error (to jump to on Save), in tab order. */
export function errorsByTab(
  errors: readonly ValidationError[],
  layout: CardLayout,
): { counts: Partial<Record<SectionId, number>>; firstTab: SectionId | null } {
  const counts: Partial<Record<SectionId, number>> = {};
  for (const error of errors) {
    const tab = layout.sections.find((s) => s.fields.some((f) => f.id === error.id))?.section.id;
    if (tab) counts[tab] = (counts[tab] ?? 0) + 1;
  }
  const firstTab = layout.sections.find((s) => counts[s.section.id])?.section.id ?? null;
  return { counts, firstTab };
}
