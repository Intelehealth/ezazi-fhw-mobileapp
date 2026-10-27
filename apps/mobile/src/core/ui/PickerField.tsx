import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, radii, spacing } from '@/core/config/theme';

import { ControlTextInput } from './ControlTextInput';
import { controlLook, type ChoiceOption } from './controlLook';
import { useControlSizes } from './hooks/useControlSizes';
import { AppIcon } from './icons';
import { Text } from './Text';

interface PickerFieldProps {
  /** The sheet's title and the field's name for screen readers, e.g. "Amniotic fluid". */
  label: string;
  options: readonly ChoiceOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder: string;
  error?: boolean;
  disabled?: boolean;
  /** Lets the nurse search the list or keep their own text, as Android's typeable dropdowns do. */
  freeText?: boolean;
}

// Case-insensitive "contains", as Android's AutoCompleteTextView filter.
const matches = (option: ChoiceOption, query: string) => option.label.toUpperCase().includes(query.toUpperCase());

/**
 * A choice from a longer list: a field showing the pick, opening a bottom sheet of options
 * (Figma "AMNIOTIC FLUID", "URINE PROTEIN"). The sheet has no frame yet, so its look is provisional.
 * With `freeText` the sheet opens with a search box, and typed text that matches no option can be kept.
 */
export const PickerField: React.FC<PickerFieldProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder,
  error,
  disabled,
  freeText,
}) => {
  const { t } = useTranslation();
  const sizes = useControlSizes();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const picked = options.find((option) => option.value === value);
  const shown = picked?.label ?? (freeText && value ? value : null);
  const look = controlLook({ disabled, alert: picked?.alert, error, focused: open });

  const typed = query.trim();
  const listed = freeText && typed ? options.filter((option) => matches(option, typed)) : options;
  const canKeepTyped = freeText && typed !== '' && !options.some((option) => option.label.toUpperCase() === typed.toUpperCase());

  const close = () => {
    setOpen(false);
    setQuery('');
  };
  const choose = (chosen: string) => {
    onChange(chosen);
    close();
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: shown ?? placeholder }}
        accessibilityState={{ disabled: !!disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[
          styles.field,
          { height: sizes.height, borderRadius: sizes.radius, backgroundColor: look.background, borderColor: look.border },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[styles.value, { fontSize: sizes.text, color: shown ? look.text : colors.placeholder }]}
        >
          {shown ?? placeholder}
        </Text>
        <AppIcon name="chevronDown" color={colors.icon} size={sizes.icon} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.a11y.close')} style={styles.backdrop} onPress={close} />
        <View style={[styles.sheet, { gap: sizes.gap }]}>
          <Text style={[styles.title, { fontSize: sizes.text }]}>{label}</Text>
          {freeText && (
            <ControlTextInput label={t('common.a11y.search', { label })} value={query} onChangeText={setQuery} placeholder={placeholder} />
          )}
          <ScrollView keyboardShouldPersistTaps="handled">
            {canKeepTyped && (
              <Pressable
                accessibilityRole="button"
                onPress={() => choose(typed)}
                style={[styles.option, { minHeight: sizes.height, borderRadius: sizes.radius }]}
              >
                <Text style={[styles.optionText, { fontSize: sizes.text, color: colors.controlSelectedText }]}>
                  {t('common.useTypedText', { text: typed })}
                </Text>
              </Pressable>
            )}
            {listed.map((option, index) => {
              const selected = option.value === value;
              const row = controlLook({ selected, alert: selected && option.alert });
              return (
                <Pressable
                  key={`${option.value}-${index}`}
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected }}
                  onPress={() => choose(option.value)}
                  style={[styles.option, { minHeight: sizes.height, borderRadius: sizes.radius, backgroundColor: row.background }]}
                >
                  <Text style={[styles.optionText, { fontSize: sizes.text, color: row.text }]}>{option.label}</Text>
                  {selected && <AppIcon name="check" color={row.text} size={sizes.icon} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  value: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: colors.dialogOverlay,
  },
  sheet: {
    maxHeight: '60%',
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  title: {
    color: colors.primaryTextFigma,
    fontWeight: '700',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  optionText: {
    flex: 1,
  },
});
