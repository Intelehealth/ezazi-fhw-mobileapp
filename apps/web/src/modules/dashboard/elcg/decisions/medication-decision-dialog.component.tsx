import { ComboboxComponent } from '../../../../components/common/combobox.component';
import {
  AddRowButton,
  DecisionDialogComponent,
  DecisionField,
  DecisionSelect,
  DeleteRowButton,
  FIELD_CLASS,
} from '../../../../components/elcg/decision-dialog.component';
import type { LcgNoteEntry } from '../elcg.types';
import {
  DOSAGE_UNITS,
  DURATION_UNITS,
  MEDICINE_FORMS,
  MEDICINE_FREQUENCIES,
  MEDICINE_PRESETS,
  MEDICINE_ROUTES,
  MEDICINE_STRENGTHS,
  medicinePresetLabel,
  type MedicinePreset,
} from './decision.catalog';
import {
  emptyMedicationRow,
  medicationLabel,
  medicationRow,
  serializeMedication,
  type MedicationRow,
  recordedBy,
} from './decision.rows';
import { medicationFormSchema } from './decision.validation';
import type { DecisionDialogProps } from './decision-dialog.types';
import { useDecisionForm } from './use-decision-form';

const MEDICINE_OPTIONS = MEDICINE_PRESETS.map(preset => ({
  key: String(preset.id),
  label: medicinePresetLabel(preset),
}));

const PRESETS_BY_KEY = new Map(
  MEDICINE_PRESETS.map(preset => [String(preset.id), preset])
);

const STRENGTH_OPTIONS = MEDICINE_STRENGTHS.map(strength => ({
  key: strength,
  label: strength,
}));

type TextField = Exclude<keyof MedicationRow, 'obsUuid' | 'isDeleted'>;

/**
 * Ports prescribe-medication.component — one prescription per row: picking
 * a listed medicine fills in its form, strength, dosage unit and route (all
 * still editable), and a medicine or strength not on the list can be typed
 * in. "Prescribe New" adds a row.
 */
export function MedicationDecisionDialogComponent({
  source,
  viewerUuid,
  isSaving,
  onSave,
  onClose,
}: DecisionDialogProps<LcgNoteEntry>) {
  const { form, fields, addRow, removeRow, setField, submit } = useDecisionForm<
    MedicationRow,
    LcgNoteEntry
  >({
    current: source.current,
    viewerUuid,
    toRow: medicationRow,
    emptyRow: emptyMedicationRow,
    serialize: serializeMedication,
    schema: medicationFormSchema,
    onSave,
  });
  const rows = form.watch('rows');
  const errors = form.formState.errors.rows;

  function pickPreset(index: number, key: string) {
    /* The key comes from MEDICINE_OPTIONS, so it always names a preset. */
    const preset = PRESETS_BY_KEY.get(key) as MedicinePreset;
    setField(index, 'medicineName', preset.name);
    setField(index, 'typeOfMedicine', preset.form);
    setField(index, 'strength', preset.strength);
    setField(index, 'dosageUnit', preset.doseUnit);
    setField(index, 'routeOfMedicine', preset.route);
  }

  return (
    <DecisionDialogComponent
      title="MEDICATION"
      isSaving={isSaving}
      onSubmit={submit}
      onClose={onClose}
      history={source.history.map(entry => ({
        uuid: entry.uuid,
        label: medicationLabel(entry.value),
        meta: recordedBy(entry),
      }))}
    >
      {fields.map((field, index) => {
        const row = rows[index];
        if (row.isDeleted) return null;
        const rowErrors = errors?.[index];
        const id = (name: string) => `medication-${index}-${name}`;
        const error = (name: TextField) => rowErrors?.[name]?.message;
        const invalid = (name: TextField) => Boolean(rowErrors?.[name]);

        /* A listed choice, from the styled dropdown. */
        const select = (
          name: TextField,
          options: string[],
          placeholder: string
        ) => (
          <DecisionSelect
            id={id(name)}
            value={row[name]}
            options={options}
            placeholder={placeholder}
            invalid={invalid(name)}
            onChange={value => setField(index, name, value)}
          />
        );

        return (
          /*
           * Four equal columns, so every placeholder shows in full — Angular's
           * 12-column split leaves "Select medicine form" and "Select
           * duration unit" too narrow to read.
           */
          <div
            key={field.id}
            className="mt-2 grid items-start gap-x-4 border-t border-[rgba(178,175,190,0.2)] pt-2 first:border-t-0 first:pt-0 md:grid-cols-4"
          >
            <DecisionField
              htmlFor={id('medicineName')}
              label="Medicine *"
              error={error('medicineName')}
              className="md:col-span-2"
            >
              <ComboboxComponent
                id={id('medicineName')}
                value={row.medicineName}
                options={MEDICINE_OPTIONS}
                placeholder="Enter medicine name"
                invalid={invalid('medicineName')}
                onChange={text => setField(index, 'medicineName', text)}
                onSelect={option => pickPreset(index, option.key)}
                className={FIELD_CLASS}
              />
            </DecisionField>
            <DecisionField
              htmlFor={id('typeOfMedicine')}
              label="Form *"
              error={error('typeOfMedicine')}
            >
              {select('typeOfMedicine', MEDICINE_FORMS, 'Select medicine form')}
            </DecisionField>
            <DecisionField
              htmlFor={id('strength')}
              label="Strength *"
              error={error('strength')}
            >
              <ComboboxComponent
                id={id('strength')}
                value={row.strength}
                options={STRENGTH_OPTIONS}
                placeholder="Enter strength"
                invalid={invalid('strength')}
                onChange={text => setField(index, 'strength', text)}
                onSelect={option => setField(index, 'strength', option.label)}
                className={FIELD_CLASS}
              />
            </DecisionField>

            <DecisionField
              htmlFor={id('dosage')}
              label="Dosage *"
              error={error('dosage')}
            >
              <input
                id={id('dosage')}
                type="number"
                min={0}
                inputMode="decimal"
                placeholder="Enter dosage"
                aria-invalid={invalid('dosage')}
                className={FIELD_CLASS}
                {...form.register(`rows.${index}.dosage`)}
              />
            </DecisionField>
            <DecisionField
              htmlFor={id('dosageUnit')}
              label="Dosage Unit *"
              error={error('dosageUnit')}
            >
              {select('dosageUnit', DOSAGE_UNITS, 'Enter dosage unit')}
            </DecisionField>
            <DecisionField
              htmlFor={id('frequency')}
              label="Frequency *"
              error={error('frequency')}
            >
              {select('frequency', MEDICINE_FREQUENCIES, 'Select frequency')}
            </DecisionField>
            <DecisionField
              htmlFor={id('routeOfMedicine')}
              label="Route of Medicine *"
              error={error('routeOfMedicine')}
            >
              {select('routeOfMedicine', MEDICINE_ROUTES, 'Select route')}
            </DecisionField>

            <DecisionField
              htmlFor={id('duration')}
              label="Duration *"
              error={error('duration')}
            >
              <input
                id={id('duration')}
                type="number"
                min={0}
                inputMode="decimal"
                placeholder="Enter duration"
                aria-invalid={invalid('duration')}
                className={FIELD_CLASS}
                {...form.register(`rows.${index}.duration`)}
              />
            </DecisionField>
            <DecisionField
              htmlFor={id('durationUnit')}
              label="Duration Unit *"
              error={error('durationUnit')}
            >
              {select('durationUnit', DURATION_UNITS, 'Select duration unit')}
            </DecisionField>
            <DecisionField
              htmlFor={id('remark')}
              label="Remark"
              error={error('remark')}
            >
              <input
                id={id('remark')}
                type="text"
                placeholder="Enter remark"
                aria-invalid={invalid('remark')}
                className={FIELD_CLASS}
                {...form.register(`rows.${index}.remark`)}
              />
            </DecisionField>
            <div className="mb-4 w-12 md:pt-7">
              <DeleteRowButton
                label="Remove medicine"
                onClick={() => removeRow(index)}
              />
            </div>
          </div>
        );
      })}
      <AddRowButton onClick={addRow}>Prescribe New</AddRowButton>
    </DecisionDialogComponent>
  );
}
