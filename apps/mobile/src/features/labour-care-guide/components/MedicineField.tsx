import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { MedicineAnswer, MedicineEntry } from '@ezazi/clinical-rules';

import { colors, spacing } from '@/core/config/theme';
import { FormField } from '@/core/ui/FormField';
import { useControlSizes } from '@/core/ui/hooks/useControlSizes';
import { AppIcon } from '@/core/ui/icons';
import { Text } from '@/core/ui/Text';

import type { FieldView } from '../domain/captureFieldView';
import { MedicineForm } from './MedicineForm';
import { YesNoChoice } from './YesNoChoice';

interface MedicineFieldProps {
  field: FieldView;
  answer: MedicineAnswer;
  onAnswer: (answer: 'yes' | 'no') => void;
  onAdd: (medicine: MedicineEntry) => void;
  onUpdate: (index: number, medicine: MedicineEntry) => void;
  onRemove: (index: number) => void;
  error?: string;
}

// Which form is open: none, a new medicine, or the list row being edited.
type Editing = null | 'new' | number;

/**
 * Medicine administered? (Android `PartogramQueryListingAdapter` + `NewMedicineFragment`): after
 * Yes, the medicines added so far, each editable and removable, and the Add Medicine form.
 */
export const MedicineField: React.FC<MedicineFieldProps> = ({
  field,
  answer,
  onAnswer,
  onAdd,
  onUpdate,
  onRemove,
  error,
}) => {
  const { t } = useTranslation();
  const sizes = useControlSizes();
  const [editing, setEditing] = useState<Editing>(null);
  const [formVersion, setFormVersion] = useState(0); // bumped to empty the form on Cancel
  const formOpen = editing !== null || (answer.answer === 'yes' && answer.medicines.length === 0);

  const submit = (medicine: MedicineEntry) => {
    if (typeof editing === 'number') onUpdate(editing, medicine);
    else onAdd(medicine);
    close();
  };

  // Android's Cancel clears the form and leaves the answer as it is.
  const close = () => {
    setEditing(null);
    setFormVersion((version) => version + 1);
  };

  return (
    <View style={{ gap: sizes.gap * 2 }}>
      <FormField label={t(field.labelKey, { defaultValue: field.androidLabel })} error={error}>
        <YesNoChoice value={answer.answer} onChange={onAnswer} />
      </FormField>

      {answer.answer === 'yes' && (
        <>
          {answer.medicines.map((medicine, index) => (
            <View
              key={`${medicine.name}-${index}`}
              style={[styles.row, { minHeight: sizes.height, borderRadius: sizes.radius }]}
            >
              <Text style={[styles.rowText, { fontSize: sizes.text }]}>
                {t('capture.medicine.summary', {
                  name: medicine.name,
                  strength: medicine.strength,
                  dose: `${medicine.dosage} ${medicine.dosageUnit}`,
                  route: medicine.route,
                })}
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel={t('capture.medicine.edit')} onPress={() => setEditing(index)}>
                <AppIcon name="edit" color={colors.controlSelectedText} size={sizes.icon} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t('capture.medicine.remove')} onPress={() => onRemove(index)}>
                <AppIcon name="delete" color={colors.alertFigma} size={sizes.icon} />
              </Pressable>
            </View>
          ))}

          {formOpen ? (
            <MedicineForm
              key={`${String(editing)}-${formVersion}`}
              initial={typeof editing === 'number' ? answer.medicines[editing] : undefined}
              onSubmit={submit}
              onCancel={close}
            />
          ) : (
            <Pressable accessibilityRole="button" onPress={() => setEditing('new')} style={styles.addLink}>
              <Text style={[styles.addText, { fontSize: sizes.text }]}>{t('capture.medicine.addAnother')}</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderFigma,
    backgroundColor: colors.white,
  },
  rowText: {
    flex: 1,
    color: colors.primaryTextFigma,
  },
  addLink: {
    alignSelf: 'flex-start',
  },
  addText: {
    color: colors.controlSelectedText,
    fontWeight: '700',
  },
});
