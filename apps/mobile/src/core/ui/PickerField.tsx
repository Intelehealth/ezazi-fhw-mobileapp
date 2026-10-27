import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, radii, spacing } from '@/core/config/theme';

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
}

/**
 * A choice from a longer list: a field showing the pick, opening a bottom sheet of options
 * (Figma "AMNIOTIC FLUID", "URINE PROTEIN"). The sheet has no frame yet, so its look is provisional.
 */
export const PickerField: React.FC<PickerFieldProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder,
  error,
  disabled,
}) => {
  const { t } = useTranslation();
  const sizes = useControlSizes();
  const [open, setOpen] = useState(false);
  const picked = options.find((option) => option.value === value);
  const look = controlLook({ disabled, alert: picked?.alert, error, focused: open });

  const pick = (option: ChoiceOption) => {
    onChange(option.value);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: picked?.label ?? placeholder }}
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
          style={[styles.value, { fontSize: sizes.text, color: picked ? look.text : colors.placeholder }]}
        >
          {picked?.label ?? placeholder}
        </Text>
        <AppIcon name="chevronDown" color={colors.icon} size={sizes.icon} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.a11y.close')}
          style={styles.backdrop}
          onPress={() => setOpen(false)}
        />
        <View style={styles.sheet}>
          <Text style={[styles.title, { fontSize: sizes.text }]}>{label}</Text>
          <ScrollView>
            {options.map((option) => {
              const selected = option.value === value;
              const row = controlLook({ selected, alert: selected && option.alert });
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected }}
                  onPress={() => pick(option)}
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
    marginBottom: spacing.sm,
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
