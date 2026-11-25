import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { filterFreeText } from '@ezazi/clinical-rules';

import { colors, spacing } from '@/core/config/theme';
import { ControlTextInput } from '@/core/ui/ControlTextInput';
import { FormField } from '@/core/ui/FormField';
import { useControlSizes } from '@/core/ui/hooks/useControlSizes';
import { Text } from '@/core/ui/Text';

import type { FieldView } from '../domain/captureFieldView';

interface NoteListFieldProps {
  field: FieldView; // Assessment or Plan
  notes: readonly string[]; // added on this card, not yet saved
  savedNotes?: readonly string[]; // already saved on this card (Show): listed first
  onAdd: (text: string) => void;
  readOnly?: boolean;
}

/**
 * Assessment or Plan (Android "Add Assessment" / "Add Plan"): type a note, Add, and it joins the list.
 * Typing keeps Android's characters with the first letter upper-case; the note is stored as typed.
 * No note can be removed, saved or not, as in Android (Kaveri, 2026-11-06, open point 14); text typed
 * but not added is not saved, as Android's Cancel.
 */
export const NoteListField: React.FC<NoteListFieldProps> = ({
  field,
  notes,
  savedNotes = [],
  onAdd,
  readOnly = false,
}) => {
  const { t } = useTranslation();
  const sizes = useControlSizes();
  const label = t(field.labelKey, { defaultValue: field.androidLabel });
  const { control, handleSubmit, reset, watch } = useForm({ defaultValues: { text: '' } });
  const canAdd = watch('text').trim() !== '';

  const add = handleSubmit(({ text }) => {
    onAdd(text);
    reset();
  });

  return (
    <FormField label={label}>
      <View style={{ gap: sizes.gap }}>
        {savedNotes.map((note, index) => (
          <View key={`saved-${index}-${note}`} style={[styles.note, { borderRadius: sizes.radius }]}>
            <Text style={[styles.noteText, { fontSize: sizes.text }]}>{note}</Text>
          </View>
        ))}
        {notes.map((note, index) => (
          <View key={`${index}-${note}`} style={[styles.note, { borderRadius: sizes.radius }]}>
            <Text style={[styles.noteText, { fontSize: sizes.text }]}>{note}</Text>
          </View>
        ))}
        {!readOnly && (
          <Controller
            control={control}
            name="text"
            render={({ field: input }) => (
              <ControlTextInput
                label={label}
                value={input.value}
                onChangeText={(text) => input.onChange(filterFreeText(text))}
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
        )}
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
