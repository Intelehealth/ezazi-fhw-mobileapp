import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  FIELD_ID,
  INFUSION_INPUT_ID,
  INFUSION_INPUT_LABELS,
  INFUSION_STATUS_OPTIONS,
  IV_FLUID_OTHER_VALUE,
  IV_FLUID_TYPE_OPTIONS,
} from '@ezazi/clinical-rules';
import type { InfusionAnswer, InfusionInputId, OptionDefinition } from '@ezazi/clinical-rules';

import { ControlTextInput } from '@/core/ui/ControlTextInput';
import { FormField } from '@/core/ui/FormField';
import { useControlSizes } from '@/core/ui/hooks/useControlSizes';
import { SegmentedChoice } from '@/core/ui/SegmentedChoice';
import { StepperInput } from '@/core/ui/StepperInput';

import type { FieldView } from '../domain/captureFieldView';
import type { InfusionBounds } from '../domain/captureFormApi';
import { YesNoChoice } from './YesNoChoice';

interface InfusionFieldProps {
  field: FieldView; // Oxytocin or IV Fluids
  answer: InfusionAnswer;
  onAnswer: (answer: 'yes' | 'no') => void;
  onInput: (id: InfusionInputId, value: string) => void;
  bounds: InfusionBounds;
  /** Messages by field or sub-input id, e.g. "infusionRate". */
  errors: Partial<Record<string, string>>;
}

/**
 * Oxytocin or IV Fluids (Android `PartogramQueryListingAdapter`): Yes / No, and after Yes the
 * inputs Android asks for. Oxytocin: strength, rate, status. IV Fluids: type (Other: free text), rate, status.
 */
export const InfusionField: React.FC<InfusionFieldProps> = ({ field, answer, onAnswer, onInput, bounds, errors }) => {
  const { t } = useTranslation();
  const sizes = useControlSizes();
  const entry = answer.entry;
  const isOxytocin = field.id === FIELD_ID.OXYTOCIN;

  const labelOf = (id: keyof typeof INFUSION_INPUT_LABELS) =>
    t(INFUSION_INPUT_LABELS[id].labelKey, { defaultValue: INFUSION_INPUT_LABELS[id].androidLabel });
  const choicesOf = (options: readonly OptionDefinition[]) =>
    options.map((option) => ({ value: option.value, label: t(option.labelKey, { defaultValue: option.androidLabel }) }));

  const stepper = (id: typeof INFUSION_INPUT_ID.STRENGTH | typeof INFUSION_INPUT_ID.INFUSION_RATE, value?: string) => (
    <FormField label={labelOf(id)} error={errors[id]} style={styles.half}>
      <StepperInput
        label={labelOf(id)}
        value={value ?? ''}
        onChange={(text) => onInput(id, text)}
        bounds={id === INFUSION_INPUT_ID.STRENGTH ? bounds.strength : bounds.rate}
        error={!!errors[id]}
      />
    </FormField>
  );

  return (
    <View style={{ gap: sizes.gap * 2 }}>
      <FormField label={t(field.labelKey, { defaultValue: field.androidLabel })} error={errors[field.id]}>
        <YesNoChoice value={answer.answer} onChange={onAnswer} />
      </FormField>

      {answer.answer === 'yes' && (
        <>
          {!isOxytocin && (
            <FormField label={labelOf(INFUSION_INPUT_ID.IV_FLUID_TYPE)} error={errors[INFUSION_INPUT_ID.IV_FLUID_TYPE]}>
              <SegmentedChoice
                options={choicesOf(IV_FLUID_TYPE_OPTIONS)}
                value={entry.type ?? null}
                onChange={(value) => onInput(INFUSION_INPUT_ID.IV_FLUID_TYPE, value)}
                error={!!errors[INFUSION_INPUT_ID.IV_FLUID_TYPE]}
              />
            </FormField>
          )}
          {!isOxytocin && entry.type === IV_FLUID_OTHER_VALUE && (
            <ControlTextInput
              label={labelOf(INFUSION_INPUT_ID.IV_FLUID_TYPE)}
              value={entry.otherType ?? ''}
              onChangeText={(text) => onInput(INFUSION_INPUT_ID.OTHER_TYPE, text)}
              error={!!errors[INFUSION_INPUT_ID.OTHER_TYPE]}
            />
          )}
          <View style={[styles.row, { gap: sizes.gap * 2 }]}>
            {isOxytocin && stepper(INFUSION_INPUT_ID.STRENGTH, entry.strength)}
            {stepper(INFUSION_INPUT_ID.INFUSION_RATE, entry.infusionRate)}
          </View>
          <FormField label={labelOf(INFUSION_INPUT_ID.INFUSION_STATUS)} error={errors[INFUSION_INPUT_ID.INFUSION_STATUS]}>
            <SegmentedChoice
              options={choicesOf(INFUSION_STATUS_OPTIONS)}
              value={entry.infusionStatus ?? null}
              onChange={(value) => onInput(INFUSION_INPUT_ID.INFUSION_STATUS, value)}
              error={!!errors[INFUSION_INPUT_ID.INFUSION_STATUS]}
            />
          </FormField>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  half: {
    flex: 1,
  },
});
