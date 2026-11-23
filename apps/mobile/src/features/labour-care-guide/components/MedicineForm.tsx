import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import {
  MEDICINE_CATALOGUE,
  MEDICINE_DOSE_UNIT_OPTIONS,
  MEDICINE_DURATION_UNIT_OPTIONS,
  MEDICINE_FORM_OPTIONS,
  MEDICINE_ADD_REQUIRED_FIELDS,
  MEDICINE_FREQUENCY_OPTIONS,
  MEDICINE_ROUTE_OPTIONS,
  MEDICINE_STRENGTH_OPTIONS,
  catalogueLabel,
  filterDigits,
  filterFreeText,
  findCatalogueMedicine,
  javaTrim,
} from '@ezazi/clinical-rules';
import type { MedicineEntry } from '@ezazi/clinical-rules';

import { colors, spacing } from '@/core/config/theme';
import { AppButton } from '@/core/ui/AppButton';
import { ControlTextInput } from '@/core/ui/ControlTextInput';
import type { ChoiceOption } from '@/core/ui/controlLook';
import { FormField } from '@/core/ui/FormField';
import { useControlSizes } from '@/core/ui/hooks/useControlSizes';
import { PickerField } from '@/core/ui/PickerField';
import { Text } from '@/core/ui/Text';

type MedicineDraft = Required<MedicineEntry>;

const EMPTY: MedicineDraft = {
  name: '',
  form: '',
  strength: '',
  dosage: '',
  dosageUnit: '',
  frequency: '',
  route: '',
  duration: '',
  durationUnit: '',
  remark: '',
};

const asOptions = (values: readonly string[]): ChoiceOption[] => values.map((value) => ({ value, label: value }));
const NAME_OPTIONS = asOptions(MEDICINE_CATALOGUE.map(catalogueLabel));

// Add stays disabled until Android's `Medicine.isValidMedicine` parts and RN's Duration and its unit are filled
// (MEDICINE_ADD_REQUIRED_FIELDS), each after Java's trim.
const medicineSchema = z
  .object(Object.fromEntries(Object.keys(EMPTY).map((key) => [key, z.string()])) as Record<keyof MedicineDraft, z.ZodString>)
  .superRefine((draft, ctx) => {
    for (const key of MEDICINE_ADD_REQUIRED_FIELDS) {
      if (javaTrim(draft[key] ?? '') === '') ctx.addIssue({ code: 'custom', path: [key], message: 'required' });
    }
  });

interface MedicineFormProps {
  initial?: MedicineEntry; // set when editing a medicine already in the list
  onSubmit: (medicine: MedicineEntry) => void;
  onCancel: () => void;
}

/**
 * Android's Add Medicine form (`NewMedicineFragment`), all ten inputs in its order. Name and
 * Strength can be typed; picking a catalogue name fills form, strength, dose unit and route.
 */
export const MedicineForm: React.FC<MedicineFormProps> = ({ initial, onSubmit, onCancel }) => {
  const { t } = useTranslation();
  const sizes = useControlSizes();
  const { control, handleSubmit, setValue, formState, watch } = useForm<MedicineDraft>({
    defaultValues: { ...EMPTY, ...initial, remark: initial?.remark ?? '' },
    resolver: zodResolver(medicineSchema),
    mode: 'onChange',
  });

  const pickName = (label: string) => {
    const medicine = findCatalogueMedicine(label);
    setValue('name', medicine ? medicine.name : filterFreeText(label), { shouldValidate: true });
    if (!medicine) return;
    setValue('form', medicine.form, { shouldValidate: true });
    setValue('strength', medicine.strength, { shouldValidate: true });
    setValue('dosageUnit', medicine.dosageUnit, { shouldValidate: true });
    setValue('route', medicine.route, { shouldValidate: true });
  };

  const picker = (key: keyof MedicineDraft, values: readonly string[], freeText = false) => (
    <Controller
      control={control}
      name={key}
      render={({ field }) => (
        <FormField label={t(`capture.medicine.${key}`)} style={styles.half}>
          <PickerField
            label={t(`capture.medicine.${key}`)}
            options={asOptions(values)}
            value={field.value || null}
            onChange={(value) => field.onChange(freeText ? filterFreeText(value) : value)}
            placeholder={t('capture.selectPlaceholder')}
            freeText={freeText}
          />
        </FormField>
      )}
    />
  );

  const number = (key: 'dosage' | 'duration') => (
    <Controller
      control={control}
      name={key}
      render={({ field }) => (
        <FormField label={t(`capture.medicine.${key}`)} style={styles.half}>
          <ControlTextInput
            label={t(`capture.medicine.${key}`)}
            value={field.value}
            onChangeText={(text) => field.onChange(filterDigits(text))}
            keyboardType="number-pad"
          />
        </FormField>
      )}
    />
  );

  return (
    <View style={[styles.panel, { gap: sizes.gap * 2, borderRadius: sizes.radius }]}>
      <Text style={[styles.title, { fontSize: sizes.label }]}>{t('capture.medicine.title').toUpperCase()}</Text>
      <FormField label={t('capture.medicine.name')}>
        <PickerField
          label={t('capture.medicine.name')}
          options={NAME_OPTIONS}
          value={watch('name') || null}
          onChange={pickName}
          placeholder={t('capture.selectPlaceholder')}
          freeText
        />
      </FormField>
      <View style={[styles.row, { gap: sizes.gap * 2 }]}>
        {picker('form', MEDICINE_FORM_OPTIONS)}
        {picker('strength', MEDICINE_STRENGTH_OPTIONS, true)}
      </View>
      <View style={[styles.row, { gap: sizes.gap * 2 }]}>
        {number('dosage')}
        {picker('dosageUnit', MEDICINE_DOSE_UNIT_OPTIONS)}
      </View>
      <View style={[styles.row, { gap: sizes.gap * 2 }]}>
        {picker('frequency', MEDICINE_FREQUENCY_OPTIONS)}
        {picker('route', MEDICINE_ROUTE_OPTIONS)}
      </View>
      <View style={[styles.row, { gap: sizes.gap * 2 }]}>
        {number('duration')}
        {picker('durationUnit', MEDICINE_DURATION_UNIT_OPTIONS)}
      </View>
      <Controller
        control={control}
        name="remark"
        render={({ field }) => (
          <FormField label={t('capture.medicine.remark')}>
            <ControlTextInput
              label={t('capture.medicine.remark')}
              value={field.value}
              onChangeText={(text) => field.onChange(filterFreeText(text))}
            />
          </FormField>
        )}
      />
      <View style={[styles.row, { gap: sizes.gap * 2 }]}>
        <AppButton label={t('common.cancel')} variant="secondary" size="compact" onPress={onCancel} style={styles.half} />
        <AppButton
          label={t('capture.medicine.add')}
          size="compact"
          disabled={!formState.isValid}
          disabledTone="brand"
          onPress={handleSubmit((values) => onSubmit({ ...values, remark: values.remark || undefined }))}
          style={styles.half}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.controlSelectedBg,
    padding: spacing.md,
  },
  title: {
    color: colors.controlSelectedText,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
  },
  half: {
    flex: 1,
  },
});
