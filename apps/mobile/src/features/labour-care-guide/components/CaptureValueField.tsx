import React from 'react';
import { useTranslation } from 'react-i18next';
import type { StyleProp, ViewStyle } from 'react-native';

import { ControlTextInput } from '@/core/ui/ControlTextInput';
import type { ChoiceOption } from '@/core/ui/controlLook';
import { FormField } from '@/core/ui/FormField';
import { NumberChips } from '@/core/ui/NumberChips';
import { PickerField } from '@/core/ui/PickerField';
import { SegmentedChoice } from '@/core/ui/SegmentedChoice';
import { StepperInput } from '@/core/ui/StepperInput';

import type { FieldView } from '../domain/captureFieldView';

interface CaptureValueFieldProps {
  field: FieldView;
  value: string;
  onChange: (value: string) => void;
  alert: boolean; // the value is an Android alert (stored with comment "R")
  error?: string;
  /** Placement only (flex, margins). */
  style?: StyleProp<ViewStyle>;
}

/** One single-value field of a capture tab, drawn with the control the rules package names. */
export const CaptureValueField: React.FC<CaptureValueFieldProps> = ({ field, value, onChange, alert, error, style }) => {
  const { t } = useTranslation();
  const label = t(field.labelKey, { defaultValue: field.androidLabel });
  const options: ChoiceOption[] = field.options.map((option) => ({
    value: option.value,
    label: t(option.labelKey, { defaultValue: option.androidLabel }),
    alert: option.alert,
  }));
  const choice = { options, value: value || null, onChange, error: !!error };

  const control = (() => {
    switch (field.control) {
      case 'segmented':
        return <SegmentedChoice {...choice} />;
      case 'chips':
        return <NumberChips {...choice} />;
      case 'picker':
        return <PickerField {...choice} label={label} placeholder={t('capture.selectPlaceholder')} />;
      case 'stepper':
        return field.bounds ? (
          <StepperInput label={label} value={value} onChange={onChange} bounds={field.bounds} alert={alert} error={!!error} />
        ) : null;
      default:
        return <ControlTextInput label={label} value={value} onChangeText={onChange} error={!!error} />;
    }
  })();

  return (
    <FormField label={label} error={error} style={style}>
      {control}
    </FormField>
  );
};
