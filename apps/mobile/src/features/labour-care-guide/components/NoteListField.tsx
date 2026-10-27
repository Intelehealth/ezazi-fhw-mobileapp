import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { colors, spacing } from '@/core/config/theme';
import { ControlTextInput } from '@/core/ui/ControlTextInput';
import { FormField } from '@/core/ui/FormField';
import { useControlSizes } from '@/core/ui/hooks/useControlSizes';
import { AppIcon } from '@/core/ui/icons';
import { Text } from '@/core/ui/Text';

import type { FieldView } from '../domain/captureFieldView';

interface NoteListFieldProps {
  field: FieldView; // Assessment or Plan
  notes: readonly string[]; // added on this card, not yet saved
  onAdd: (text: string) => void;
  onRemove: (index: number) => void;
}

/** Assessment or Plan (Android "Add Assessment" / "Add Plan"): type a note, Add, and it joins the list. */
export const NoteListField: React.FC<NoteListFieldProps> = ({ field, notes, onAdd, onRemove }) => {
  const { t } = useTranslation();
  const sizes = useControlSizes();
  const label = t(field.labelKey, { defaultValue: field.androidLabel });
  const { control, handleSubmit, reset, watch } = useForm({ defaultValues: { text: '' } });
  const canAdd = watch('text').trim() !== '';

  const add = handleSubmit(({ text }) => {
    onAdd(text.trim());
    reset();
  });

  return (
    <FormField label={label}>
      <View style={{ gap: sizes.gap }}>
        {notes.map((note, index) => (
          <View key={`${index}-${note}`} style={[styles.note, { borderRadius: sizes.radius }]}>
            <Text style={[styles.noteText, { fontSize: sizes.text }]}>{note}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t('capture.notes.remove', { label })} onPress={() => onRemove(index)}>
              <AppIcon name="close" color={colors.icon} size={sizes.icon} />
            </Pressable>
          </View>
        ))}
        <Controller
          control={control}
          name="text"
          render={({ field: input }) => (
            <ControlTextInput
              label={label}
              value={input.value}
              onChangeText={input.onChange}
              placeholder={t('capture.notes.placeholder')}
              onSubmitEditing={add}
              rightSlot={
                <Pressable accessibilityRole="button" accessibilityState={{ disabled: !canAdd }} disabled={!canAdd} onPress={add}>
                  <Text style={[styles.add, { fontSize: sizes.label }, !canAdd && styles.addDisabled]}>
                    {t('capture.notes.add')}
                  </Text>
                </Pressable>
              }
            />
          )}
        />
      </View>
    </FormField>
  );
};

const styles = StyleSheet.create({
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.controlSelectedBg,
  },
  noteText: {
    flex: 1,
    color: colors.primaryTextFigma,
  },
  add: {
    color: colors.controlSelectedText,
    fontWeight: '700',
  },
  addDisabled: {
    color: colors.textDisabled,
  },
});
