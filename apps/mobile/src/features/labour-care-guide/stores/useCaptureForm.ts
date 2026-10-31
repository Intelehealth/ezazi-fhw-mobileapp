import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  ALERT_CODE,
  FIELD_ID,
  INFUSION_INPUT_ID,
  INFUSION_INPUT_LIMITS,
  IV_FLUID_OTHER_VALUE,
  checkDiastolicTyping,
  checkInfusionRateOnBlur,
  checkInfusionRateTyping,
  checkStrengthTyping,
  filterFreeText,
  getAlertCode,
  getCardErrors,
  getStepperSpec,
  getValidationRanges,
  systolicClearsDiastolic,
} from '@ezazi/clinical-rules';
import type {
  CardLayout,
  FieldId,
  InfusionEntry,
  InfusionInputId,
  RangeId,
  RangeProfileId,
  SectionId,
  StoredObs,
  TypingCheck,
} from '@ezazi/clinical-rules';

import { utcIsoTimestamp } from '@/core/utils/datetime';

import {
  errorsByTab,
  initialCaptureValues,
  savedNotesFrom,
  toCardInput,
  withMedicationShown,
  type AddedAt,
  type CaptureFormValues,
} from '../domain/captureForm';
import { createCaptureFormSchema, errorMessage } from '../domain/captureForm.schema';
import type { CaptureFormApi, InfusionFieldId, NoteFieldId, SummarySection } from '../domain/captureFormApi';

export interface CaptureForm {
  api: CaptureFormApi;
  /** Save errors per tab, shown once Save has been tried. */
  tabErrorCounts: Partial<Record<SectionId, number>>;
  /** Validates with Android's Save rules; calls `onValid`, or `onInvalid` with the first tab in error. */
  submit: (onValid: (values: CaptureFormValues) => void, onInvalid: (firstTab: SectionId | null) => void) => void;
  /** The Medication tab was shown: its unanswered answers become "No", as Android's defaultNo. */
  showMedication: () => void;
}

const OTHER_TYPE_MAX = INFUSION_INPUT_LIMITS[INFUSION_INPUT_ID.OTHER_TYPE].maxLength;

/**
 * The infusion entry after one input changes. IV fluid type as Android (adapter 778-807): a listed
 * fluid clears the Other text; "Other" is stored only with its text, so choosing it alone stores no type.
 */
function nextEntry(entry: InfusionEntry, input: InfusionInputId, value: string): InfusionEntry {
  if (input === INFUSION_INPUT_ID.IV_FLUID_TYPE) {
    return value === IV_FLUID_OTHER_VALUE
      ? { ...entry, type: entry.otherType ? IV_FLUID_OTHER_VALUE : undefined }
      : { ...entry, type: value, otherType: undefined };
  }
  if (input === INFUSION_INPUT_ID.OTHER_TYPE) {
    return { ...entry, otherType: value || undefined, type: value ? IV_FLUID_OTHER_VALUE : undefined };
  }
  return { ...entry, [ENTRY_KEY[input]]: value };
}

// The entry key each sub-input is stored under (Android `Medication`).
const ENTRY_KEY: Record<InfusionInputId, keyof InfusionEntry> = {
  [INFUSION_INPUT_ID.STRENGTH]: 'strength',
  [INFUSION_INPUT_ID.INFUSION_RATE]: 'infusionRate',
  [INFUSION_INPUT_ID.INFUSION_STATUS]: 'infusionStatus',
  [INFUSION_INPUT_ID.IV_FLUID_TYPE]: 'type',
  [INFUSION_INPUT_ID.OTHER_TYPE]: 'otherType',
};

/**
 * The capture form (react-hook-form + the package's Save rules through zod). Android's typing
 * checks (diastolic, Oxytocin strength, infusion rate) show their message under the input instead
 * of a toast (decided 2026-10-23); a check that clears the value clears it, as Android does.
 */
export function useCaptureForm(
  layout: CardLayout,
  profile: RangeProfileId,
  stored: readonly StoredObs[] = [],
): CaptureForm {
  const { t } = useTranslation();
  const schema = useMemo(() => createCaptureFormSchema(layout, profile, t), [layout, profile, t]);
  const form = useForm<CaptureFormValues>({
    defaultValues: initialCaptureValues(layout, stored),
    resolver: zodResolver(schema),
  });
  const values = form.watch();
  const submitted = form.formState.isSubmitted;
  const [typingErrors, setTypingErrors] = useState<Partial<Record<string, string>>>({});
  const [rangeErrors, setRangeErrors] = useState<Partial<Record<FieldId, string>>>({});
  const ranges = useMemo(() => getValidationRanges(profile), [profile]);

  const showTyping = (key: string, check: TypingCheck) =>
    setTypingErrors((current) => ({
      ...current,
      [key]: check.kind === 'warn' || check.kind === 'clear' ? errorMessage(check.error, t) : undefined,
    }));

  const fieldValue = (id: FieldId) => values.values[id] ?? '';
  const writeValue = (id: FieldId, value: string) =>
    form.setValue(`values.${id}`, value, { shouldValidate: submitted, shouldDirty: true });

  // Typed far enough to judge: as many whole digits as the range's maximum (FHR: 3).
  const isComplete = (id: FieldId, value: string) => {
    const range = ranges[id as RangeId];
    const wholeDigits = value.split('.')[0].length;
    return range !== undefined && wholeDigits >= String(Math.trunc(range.max)).length;
  };

  /**
   * The field's Save error shown as soon as the value is complete, or when the box is left
   * (Figma "Record 24"): the package's Android range rules, run on the card as it stands.
   */
  const checkRange = (id: FieldId, value: string, leaving: boolean) => {
    const current = form.getValues();
    const card = toCardInput({ ...current, values: { ...current.values, [id]: value } }, layout);
    const error = leaving || isComplete(id, value) ? getCardErrors(card, profile).find((e) => e.id === id) : undefined;
    setRangeErrors((errors) => ({ ...errors, [id]: error ? errorMessage(error, t) : undefined }));
  };

  const setValue = (id: FieldId, typed: string) => {
    const value = id === FIELD_ID.SUPERVISOR_DOCTOR ? filterFreeText(typed) : typed;
    if (id === FIELD_ID.DIASTOLIC_BP) {
      const check = checkDiastolicTyping(fieldValue(FIELD_ID.SYSTOLIC_BP), value);
      showTyping(id, check);
      const kept = check.kind === 'clear' ? '' : value;
      writeValue(id, kept);
      checkRange(id, kept, false);
      return;
    }
    writeValue(id, value);
    checkRange(id, value, false);
    if (id === FIELD_ID.SYSTOLIC_BP && systolicClearsDiastolic(value, fieldValue(FIELD_ID.DIASTOLIC_BP))) {
      writeValue(FIELD_ID.DIASTOLIC_BP, '');
    }
  };

  const setInfusionInput = (id: InfusionFieldId, input: InfusionInputId, typed: string) => {
    let value = typed;
    if (input === INFUSION_INPUT_ID.OTHER_TYPE) value = filterFreeText(typed).slice(0, OTHER_TYPE_MAX);
    if (input === INFUSION_INPUT_ID.STRENGTH || input === INFUSION_INPUT_ID.INFUSION_RATE) {
      const check =
        input === INFUSION_INPUT_ID.STRENGTH ? checkStrengthTyping(typed, profile) : checkInfusionRateTyping(typed, profile);
      showTyping(`${id}.${input}`, check);
      if (check.kind === 'clear') value = '';
    }
    const answer = values[id];
    form.setValue(id, { ...answer, entry: nextEntry(answer.entry, input, value) }, { shouldValidate: submitted });
  };

  // Android adapter 986-995: on leaving the rate, a value still below the minimum is cleared.
  const checkInfusionRateOnLeave = (id: InfusionFieldId) => {
    const answer = form.getValues(id);
    const check = checkInfusionRateOnBlur(answer.entry.infusionRate ?? null, profile);
    showTyping(`${id}.${INFUSION_INPUT_ID.INFUSION_RATE}`, check);
    if (check.kind !== 'clear') return;
    form.setValue(id, { ...answer, entry: { ...answer.entry, infusionRate: '' } }, { shouldValidate: submitted });
  };

  const medicine = values[FIELD_ID.MEDICINE];
  const setMedicines = (medicines: CaptureFormValues['medicine']['medicines']) =>
    form.setValue(FIELD_ID.MEDICINE, { ...medicine, medicines }, { shouldValidate: submitted });

  const setNotes = (id: NoteFieldId, notes: string[]) => form.setValue('notes', { ...values.notes, [id]: notes });
  // Android stamps a medicine on add and on edit, and a note on add (NewMedicineFragment, NewPlanFragment).
  const setAddedAt = (id: keyof AddedAt, times: string[]) => form.setValue('addedAt', { ...values.addedAt, [id]: times });
  const stampAt = (id: keyof AddedAt, index: number) =>
    setAddedAt(id, values.addedAt[id].map((time, i) => (i === index ? utcIsoTimestamp() : time)));
  const dropAt = (id: keyof AddedAt, index: number) => setAddedAt(id, values.addedAt[id].filter((_, i) => i !== index));

  const optionLabel = (id: FieldId, value: string) => {
    const option = layout.sections.flatMap((s) => s.fields).find((f) => f.id === id)?.input;
    const match = option?.kind === 'select' ? option.options.find((o) => o.value === value) : undefined;
    return match ? t(match.labelKey, { defaultValue: match.androidLabel }) : value;
  };

  const summary: SummarySection[] = layout.sections.map(({ section, fields }) => ({
    labelKey: section.labelKey,
    androidLabel: section.androidLabel,
    items: fields
      .filter((field) => field.storage === 'value' && getAlertCode(field.id, fieldValue(field.id)) === ALERT_CODE.RED)
      .map((field) => ({ labelKey: field.labelKey, androidLabel: field.androidLabel, value: optionLabel(field.id, fieldValue(field.id)) })),
  }));

  const errors = form.formState.errors;
  const fieldError = (id: FieldId | InfusionInputId): string | undefined =>
    typingErrors[id] ??
    rangeErrors[id as FieldId] ??
    (id === FIELD_ID.MEDICINE ? errors.medicine?.message : errors.values?.[id as FieldId]?.message);

  const savedNotes = useMemo(() => savedNotesFrom(stored), [stored]);

  const api: CaptureFormApi = {
    fieldValue,
    fieldAlert: (id) => getAlertCode(id, fieldValue(id)) === ALERT_CODE.RED,
    fieldError,
    setValue,
    leaveField: (id) => checkRange(id, fieldValue(id), true),
    infusionAnswer: (id) => values[id],
    infusionErrors: (id) => ({
      [id]: errors[id]?.message,
      [INFUSION_INPUT_ID.STRENGTH]: typingErrors[`${id}.${INFUSION_INPUT_ID.STRENGTH}`],
      [INFUSION_INPUT_ID.INFUSION_RATE]: typingErrors[`${id}.${INFUSION_INPUT_ID.INFUSION_RATE}`],
    }),
    setInfusionAnswer: (id, answer) => form.setValue(id, { ...values[id], answer }, { shouldValidate: submitted }),
    setInfusionInput,
    checkInfusionRateOnLeave,
    infusionBounds: {
      strength: getStepperSpec(INFUSION_INPUT_ID.STRENGTH, profile),
      rate: getStepperSpec(INFUSION_INPUT_ID.INFUSION_RATE, profile),
    },
    medicine,
    setMedicineAnswer: (answer) => form.setValue(FIELD_ID.MEDICINE, { ...medicine, answer }, { shouldValidate: submitted }),
    addMedicine: (entry) => {
      setMedicines([...medicine.medicines, entry]);
      setAddedAt(FIELD_ID.MEDICINE, [...values.addedAt[FIELD_ID.MEDICINE], utcIsoTimestamp()]);
    },
    updateMedicine: (index, entry) => {
      setMedicines(medicine.medicines.map((m, i) => (i === index ? entry : m)));
      stampAt(FIELD_ID.MEDICINE, index);
    },
    removeMedicine: (index) => {
      setMedicines(medicine.medicines.filter((_, i) => i !== index));
      dropAt(FIELD_ID.MEDICINE, index);
    },
    fieldNotes: (id) => values.notes[id],
    savedNotes: (id) => savedNotes[id],
    addNote: (id, text) => {
      setNotes(id, [...values.notes[id], text]);
      setAddedAt(id, [...values.addedAt[id], utcIsoTimestamp()]);
    },
    removeNote: (id, index) => {
      setNotes(id, values.notes[id].filter((_, i) => i !== index));
      dropAt(id, index);
    },
    summary,
  };

  const saveErrors = submitted ? getCardErrors(toCardInput(values, layout), profile) : [];

  return {
    api,
    tabErrorCounts: errorsByTab(saveErrors, layout).counts,
    submit: (onValid, onInvalid) =>
      void form.handleSubmit((valid) => onValid(valid), () =>
        onInvalid(errorsByTab(getCardErrors(toCardInput(form.getValues(), layout), profile), layout).firstTab),
      )(),
    showMedication: () => {
      const shown = withMedicationShown(form.getValues());
      for (const id of [FIELD_ID.OXYTOCIN, FIELD_ID.IV_FLUIDS, FIELD_ID.MEDICINE] as const) form.setValue(id, shown[id]);
    },
  };
}
