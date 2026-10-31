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
  /** When each medicine and note was added (UTC), saved as its `created_date`, as Android. */
  addedAt: AddedAt;
}

export type AddedAt = Record<typeof FIELD_ID.MEDICINE | keyof CardNotes, string[]>;

const fieldsOf = (layout: CardLayout): FieldId[] => layout.sections.flatMap((s) => s.fields.map((f) => f.id));

// Unanswered until the Medication tab is shown, which sets "No" (Android `handleRadioCheckListener`,
// defaultNo, runs when the section is drawn); never shown, nothing is saved.
const NO_INFUSION: InfusionAnswer = { answer: null, entry: {} };

function infusionFrom(rows: readonly StoredObs[]): InfusionAnswer {
  const latest = rows[0];
  if (!latest) return NO_INFUSION;
  if (isNoResponse(latest.value)) return { answer: 'no', entry: {} };
  return { answer: 'yes', entry: decodeInfusion(latest.value) ?? {} };
}

const savedMedicineRows = (rows: readonly StoredObs[]) => rows.filter((row) => !isNoResponse(row.value) && decodeMedicine(row.value));

function medicineFrom(rows: readonly StoredObs[]): MedicineAnswer {
  const medicines = savedMedicineRows(rows).flatMap((row) => decodeMedicine(row.value) ?? []);
  return medicines.length > 0 ? { answer: 'yes', medicines } : { answer: rows.length > 0 ? 'no' : null, medicines: [] };
}

/**
 * Starting values. A new card is empty with the Medication answers unanswered; an edited card shows
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
    addedAt: {
      [FIELD_ID.MEDICINE]: savedMedicineRows(rowsOf(FIELD_ID.MEDICINE)).map((row) => row.createdAt),
      [FIELD_ID.ASSESSMENT]: [],
      [FIELD_ID.PLAN]: [],
    },
  };
}

// Android never stores a strength still being typed ("1."): it keeps the value before the point.
function completeStrength(answer: InfusionAnswer): InfusionAnswer {
  const strength = answer.entry.strength;
  return strength?.endsWith('.') ? { ...answer, entry: { ...answer.entry, strength: strength.slice(0, -1) } } : answer;
}

/** Medication answers still unanswered become "No": their tab has now been shown (Android defaultNo). */
export function withMedicationShown(form: CaptureFormValues): CaptureFormValues {
  const shown = (answer: InfusionAnswer): InfusionAnswer => (answer.answer === null ? { ...answer, answer: 'no' } : answer);
  const medicine = form[FIELD_ID.MEDICINE];
  return {
    ...form,
    [FIELD_ID.OXYTOCIN]: shown(form[FIELD_ID.OXYTOCIN]),
    [FIELD_ID.IV_FLUIDS]: shown(form[FIELD_ID.IV_FLUIDS]),
    [FIELD_ID.MEDICINE]: medicine.answer === null ? { ...medicine, answer: 'no' } : medicine,
  };
}

/** The Assessment and Plan notes already saved on a card, oldest first, shown above any new ones. */
export function savedNotesFrom(stored: readonly StoredObs[]): Record<keyof CardNotes, string[]> {
  const notesOf = (id: keyof CardNotes) =>
    stored.filter((row) => row.fieldId === id).map((row) => row.value).reverse();
  return { [FIELD_ID.ASSESSMENT]: notesOf(FIELD_ID.ASSESSMENT), [FIELD_ID.PLAN]: notesOf(FIELD_ID.PLAN) };
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
    ...(shown.has(FIELD_ID.OXYTOCIN) && { [FIELD_ID.OXYTOCIN]: completeStrength(form[FIELD_ID.OXYTOCIN]) }),
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
