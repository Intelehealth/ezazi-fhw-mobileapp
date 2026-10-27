import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SECTION_ID } from '@ezazi/clinical-rules';

import { colors, spacing } from '@/core/config/theme';
import { useControlSizes } from '@/core/ui/hooks/useControlSizes';

import { toFieldRows, type FieldView, type TabView } from '../domain/captureFieldView';
import type { CaptureFormApi, InfusionFieldId, NoteFieldId } from '../domain/captureFormApi';
import { AlertSummary } from './AlertSummary';
import { CaptureValueField } from './CaptureValueField';
import { InfusionField } from './InfusionField';
import { MedicineField } from './MedicineField';
import { NoteListField } from './NoteListField';

interface CaptureTabPageProps {
  tab: TabView;
  form: CaptureFormApi;
}

/**
 * One capture tab (Figma 251:556): its fields in Android order inside a card, two steppers to
 * a row. Medication puts each answer in its own card; Shared decision opens with the alert summary.
 */
export const CaptureTabPage: React.FC<CaptureTabPageProps> = ({ tab, form }) => {
  const sizes = useControlSizes();
  const card = [styles.card, { borderRadius: sizes.radius, gap: sizes.gap * 2 }];

  const renderField = (field: FieldView, half = false) => {
    switch (field.control) {
      case 'infusion': {
        const id = field.id as InfusionFieldId;
        return (
          <InfusionField
            key={field.id}
            field={field}
            answer={form.infusionAnswer(id)}
            onAnswer={(answer) => form.setInfusionAnswer(id, answer)}
            onInput={(input, value) => form.setInfusionInput(id, input, value)}
            bounds={form.infusionBounds}
            errors={form.infusionErrors(id)}
          />
        );
      }
      case 'medicineList':
        return (
          <MedicineField
            key={field.id}
            field={field}
            answer={form.medicine}
            onAnswer={form.setMedicineAnswer}
            onAdd={form.addMedicine}
            onUpdate={form.updateMedicine}
            onRemove={form.removeMedicine}
            error={form.fieldError(field.id)}
          />
        );
      case 'noteList': {
        const id = field.id as NoteFieldId;
        return (
          <NoteListField
            key={field.id}
            field={field}
            notes={form.fieldNotes(id)}
            onAdd={(text) => form.addNote(id, text)}
            onRemove={(index) => form.removeNote(id, index)}
          />
        );
      }
      default:
        return (
          <CaptureValueField
            key={field.id}
            field={field}
            value={form.fieldValue(field.id)}
            onChange={(value) => form.setValue(field.id, value)}
            alert={form.fieldAlert(field.id)}
            error={form.fieldError(field.id)}
            style={half && styles.half}
          />
        );
    }
  };

  const rows = toFieldRows(tab.fields).map((row) =>
    row.length === 1 ? (
      renderField(row[0])
    ) : (
      <View key={row.map((field) => field.id).join('-')} style={[styles.row, { gap: sizes.gap * 2 }]}>
        {row.map((field) => renderField(field, true))}
      </View>
    ),
  );

  return (
    <ScrollView contentContainerStyle={[styles.content, { gap: sizes.gap * 2 }]} keyboardShouldPersistTaps="handled">
      {tab.id === SECTION_ID.SHARED_DECISION_MAKING && <AlertSummary sections={form.summary} />}
      {tab.id === SECTION_ID.MEDICATION ? (
        tab.fields.map((field) => (
          <View key={field.id} style={card}>
            {renderField(field)}
          </View>
        ))
      ) : (
        <View style={card}>{rows}</View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderFigma,
    padding: spacing.md,
  },
  row: {
    flexDirection: 'row',
  },
  half: {
    flex: 1,
  },
});
