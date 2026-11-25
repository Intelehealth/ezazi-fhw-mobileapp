import { ComboboxComponent } from '../../../../components/common/combobox.component';
import {
  AddRowButton,
  DecisionDialogComponent,
  DecisionField,
  DecisionSelect,
  DeleteRowButton,
  FIELD_CLASS,
} from '../../../../components/elcg/decision-dialog.component';
import { formatDayMonthYearTime12h } from '../../../../utils/date-format';
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
} from './decision.catalog';
import {
  emptyMedicationRow,
  medicationLabel,
  medicationRow,
  serializeMedication,
  type MedicationRow,
} from './decision.rows';
import { medicationFormSchema } from './decision.validation';
import type { DecisionDialogProps } from './decision-dialog.types';
import { useDecisionForm } from './use-decision-form';

const MEDICINE_OPTIONS = MEDICINE_PRESETS.map(preset => ({
  key: String(preset.id),
  label: medicinePresetLabel(preset),
}));

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
  const { form, fields, addRow, removeRow, submit } = useDecisionForm<
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

  function setField(index: number, field: TextField, value: string) {
    form.setValue(`rows.${index}.${field}`, value, {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    });
  }

  function pickPreset(index: number, key: string) {
    const preset = MEDICINE_PRESETS.find(p => String(p.id) === key);
    if (!preset) return;
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
        meta: `${entry.initial} (${formatDayMonthYearTime12h(entry.obsDatetime) ?? ''})`,
      }))}
    >
      {fields.map((field, index) => {
        const row = rows[index];
        if (!row || row.isDeleted) return null;
        const rowErrors = errors?.[index];
        const id = (name: string) => `medication-${index}-${name}`;
        const error = (name: TextField) => rowErrors?.[name]?.message;
        const invalid = (name: TextField) => Boolean(rowErrors?.[name]);

        return (
          <div
            key={field.id}
            className="mt-2 grid items-start gap-x-4 border-t border-[rgba(178,175,190,0.2)] pt-2 first:border-t-0 first:pt-0 md:grid-cols-12"
          >
            <DecisionField
              htmlFor={id('medicine')}
              label="Medicine *"
              error={error('medicineName')}
              className="md:col-span-4"
            >
              <ComboboxComponent
                id={id('medicine')}
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
              htmlFor={id('form')}
              label="Form *"
              error={error('typeOfMedicine')}
              className="md:col-span-2"
            >
              <DecisionSelect
                id={id('form')}
                options={MEDICINE_FORMS}
                current={row.typeOfMedicine}
                placeholder="Select medicine form"
                invalid={invalid('typeOfMedicine')}
                {...form.register(`rows.${index}.typeOfMedicine`)}
              />
            </DecisionField>
            <DecisionField
              htmlFor={id('strength')}
              label="Strength *"
              error={error('strength')}
              className="md:col-span-2"
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
              className="md:col-span-2"
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
              htmlFor={id('dosage-unit')}
              label="Dosage Unit *"
              error={error('dosageUnit')}
              className="md:col-span-2"
            >
              <DecisionSelect
                id={id('dosage-unit')}
                options={DOSAGE_UNITS}
                current={row.dosageUnit}
                placeholder="Enter dosage unit"
                invalid={invalid('dosageUnit')}
                {...form.register(`rows.${index}.dosageUnit`)}
              />
            </DecisionField>

            <DecisionField
              htmlFor={id('frequency')}
              label="Frequency *"
              error={error('frequency')}
              className="md:col-span-3"
            >
              <DecisionSelect
                id={id('frequency')}
                options={MEDICINE_FREQUENCIES}
                current={row.frequency}
                placeholder="Select frequency"
                invalid={invalid('frequency')}
                {...form.register(`rows.${index}.frequency`)}
              />
            </DecisionField>
            <DecisionField
              htmlFor={id('route')}
              label="Route of Medicine *"
              error={error('routeOfMedicine')}
              className="md:col-span-2"
            >
              <DecisionSelect
                id={id('route')}
                options={MEDICINE_ROUTES}
                current={row.routeOfMedicine}
                placeholder="Select route"
                invalid={invalid('routeOfMedicine')}
                {...form.register(`rows.${index}.routeOfMedicine`)}
              />
            </DecisionField>
            <DecisionField
              htmlFor={id('duration')}
              label="Duration *"
              error={error('duration')}
              className="md:col-span-2"
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
              htmlFor={id('duration-unit')}
              label="Duration Unit *"
              error={error('durationUnit')}
              className="md:col-span-2"
            >
              <DecisionSelect
                id={id('duration-unit')}
                options={DURATION_UNITS}
                current={row.durationUnit}
                placeholder="Select duration unit"
                invalid={invalid('durationUnit')}
                {...form.register(`rows.${index}.durationUnit`)}
              />
            </DecisionField>
            <DecisionField
              htmlFor={id('remark')}
              label="Remark"
              error={error('remark')}
              className="md:col-span-2"
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
            <div className="mb-4 md:col-span-1 md:pt-7">
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
