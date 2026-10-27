import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  ALERT_CODE,
  FIELD_ID,
  INFUSION_INPUT_ID,
  INFUSION_INPUT_LIMITS,
  checkDiastolicTyping,
  checkInfusionRateTyping,
  checkStrengthTyping,
  filterFreeText,
  getAlertCode,
  getCardErrors,
  getStepperSpec,
  systolicClearsDiastolic,
} from '@ezazi/clinical-rules';
import type {
  CardLayout,
  FieldId,
  InfusionEntry,
  InfusionInputId,
  RangeProfileId,
  SectionId,
  TypingCheck,
} from '@ezazi/clinical-rules';

import { errorsByTab, initialCaptureValues, toCardInput, type CaptureFormValues } from '../domain/captureForm';
import { createCaptureFormSchema, errorMessage } from '../domain/captureForm.schema';
import type { CaptureFormApi, InfusionFieldId, NoteFieldId, SummarySection } from '../domain/captureFormApi';

export interface CaptureForm {
  api: CaptureFormApi;
  /** Save errors per tab, shown once Save has been tried. */
  tabErrorCounts: Partial<Record<SectionId, number>>;
  /** Validates with Android's Save rules; calls `onValid`, or `onInvalid` with the first tab in error. */
  submit: (onValid: (values: CaptureFormValues) => void, onInvalid: (firstTab: SectionId | null) => void) => void;
}

const OTHER_TYPE_MAX = INFUSION_INPUT_LIMITS[INFUSION_INPUT_ID.OTHER_TYPE].maxLength;

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
export function useCaptureForm(layout: CardLayout, profile: RangeProfileId): CaptureForm {
  const { t } = useTranslation();
  const schema = useMemo(() => createCaptureFormSchema(layout, profile, t), [layout, profile, t]);
  const form = useForm<CaptureFormValues>({
    defaultValues: initialCaptureValues(layout),
    resolver: zodResolver(schema),
  });
  const values = form.watch();
  const submitted = form.formState.isSubmitted;
  const [typingErrors, setTypingErrors] = useState<Partial<Record<string, string>>>({});

  const showTyping = (key: string, check: TypingCheck) =>
    setTypingErrors((current) => ({
      ...current,
      [key]: check.kind === 'warn' || check.kind === 'clear' ? errorMessage(check.error, t) : undefined,
    }));

  const fieldValue = (id: FieldId) => values.values[id] ?? '';
  const writeValue = (id: FieldId, value: string) =>
    form.setValue(`values.${id}`, value, { shouldValidate: submitted, shouldDirty: true });

  const setValue = (id: FieldId, typed: string) => {
    const value = id === FIELD_ID.SUPERVISOR_DOCTOR ? filterFreeText(typed) : typed;
    if (id === FIELD_ID.DIASTOLIC_BP) {
      const check = checkDiastolicTyping(fieldValue(FIELD_ID.SYSTOLIC_BP), value);
      showTyping(id, check);
      writeValue(id, check.kind === 'clear' ? '' : value);
      return;
    }
    writeValue(id, value);
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
    form.setValue(id, { ...answer, entry: { ...answer.entry, [ENTRY_KEY[input]]: value } }, { shouldValidate: submitted });
  };

  const medicine = values[FIELD_ID.MEDICINE];
  const setMedicines = (medicines: CaptureFormValues['medicine']['medicines']) =>
    form.setValue(FIELD_ID.MEDICINE, { ...medicine, medicines }, { shouldValidate: submitted });

  const setNotes = (id: NoteFieldId, notes: string[]) => form.setValue('notes', { ...values.notes, [id]: notes });

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
    (id === FIELD_ID.MEDICINE ? errors.medicine?.message : errors.values?.[id as FieldId]?.message);

  const api: CaptureFormApi = {
    fieldValue,
    fieldAlert: (id) => getAlertCode(id, fieldValue(id)) === ALERT_CODE.RED,
    fieldError,
    setValue,
    infusionAnswer: (id) => values[id],
    infusionErrors: (id) => ({
      [id]: errors[id]?.message,
      [INFUSION_INPUT_ID.STRENGTH]: typingErrors[`${id}.${INFUSION_INPUT_ID.STRENGTH}`],
      [INFUSION_INPUT_ID.INFUSION_RATE]: typingErrors[`${id}.${INFUSION_INPUT_ID.INFUSION_RATE}`],
    }),
    setInfusionAnswer: (id, answer) => form.setValue(id, { ...values[id], answer }, { shouldValidate: submitted }),
    setInfusionInput,
    infusionBounds: {
      strength: getStepperSpec(INFUSION_INPUT_ID.STRENGTH, profile),
      rate: getStepperSpec(INFUSION_INPUT_ID.INFUSION_RATE, profile),
    },
    medicine,
    setMedicineAnswer: (answer) => form.setValue(FIELD_ID.MEDICINE, { ...medicine, answer }, { shouldValidate: submitted }),
    addMedicine: (entry) => setMedicines([...medicine.medicines, entry]),
    updateMedicine: (index, entry) => setMedicines(medicine.medicines.map((m, i) => (i === index ? entry : m))),
    removeMedicine: (index) => setMedicines(medicine.medicines.filter((_, i) => i !== index)),
    fieldNotes: (id) => values.notes[id],
    addNote: (id, text) => setNotes(id, [...values.notes[id], text]),
    removeNote: (id, index) => setNotes(id, values.notes[id].filter((_, i) => i !== index)),
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
  };
}
