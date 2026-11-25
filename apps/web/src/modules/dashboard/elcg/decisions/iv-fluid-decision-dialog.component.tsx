import {
  AddRowButton,
  DecisionDialogComponent,
  DecisionField,
  DecisionSelect,
  DeleteRowButton,
  FIELD_CLASS,
} from '../../../../components/elcg/decision-dialog.component';
import type { LcgIvFluidEntry } from '../elcg.types';
import {
  INFUSION_STATUSES,
  IV_FLUID_TYPES,
  OTHER_IV_FLUID_TYPE,
} from './decision.catalog';
import {
  emptyIvFluidRow,
  ivFluidLabel,
  ivFluidRow,
  serializeIvFluid,
  type IvFluidRow,
  recordedBy,
} from './decision.rows';
import { ivFluidFormSchema } from './decision.validation';
import type { DecisionDialogProps } from './decision-dialog.types';
import { useDecisionForm } from './use-decision-form';

/**
 * Ports prescribe-iv-fluid.component — fluid type (with its own name when
 * "Other"), infusion rate and status per order, "Prescribe New" for another.
 */
export function IvFluidDecisionDialogComponent({
  source,
  viewerUuid,
  isSaving,
  onSave,
  onClose,
}: DecisionDialogProps<LcgIvFluidEntry>) {
  const { form, fields, addRow, removeRow, setField, submit } = useDecisionForm<
    IvFluidRow,
    LcgIvFluidEntry
  >({
    current: source.current,
    viewerUuid,
    toRow: ivFluidRow,
    emptyRow: emptyIvFluidRow,
    serialize: serializeIvFluid,
    schema: ivFluidFormSchema,
    onSave,
  });
  const rows = form.watch('rows');
  const errors = form.formState.errors.rows;

  return (
    <DecisionDialogComponent
      title="IV FLUIDS"
      isSaving={isSaving}
      onSubmit={submit}
      onClose={onClose}
      history={source.history.map(entry => ({
        uuid: entry.uuid,
        label: ivFluidLabel(entry),
        meta: recordedBy(entry),
      }))}
    >
      {fields.map((field, index) => {
        const row = rows[index];
        if (row.isDeleted) return null;
        const rowErrors = errors?.[index];
        const id = (name: string) => `iv-${index}-${name}`;
        const isOther = row.type === OTHER_IV_FLUID_TYPE;
        return (
          <div
            key={field.id}
            /*
             * Equal columns for the fields (Angular's 3/3/3/2/1 split cuts
             * "Select infusion status" short) and a button-wide one to delete.
             */
            className={`mt-2 grid items-start gap-x-4 border-t border-[rgba(178,175,190,0.2)] pt-2 first:border-t-0 first:pt-0 ${
              isOther
                ? 'md:grid-cols-[repeat(4,minmax(0,1fr))_3rem]'
                : 'md:grid-cols-[repeat(3,minmax(0,1fr))_3rem]'
            }`}
          >
            <DecisionField
              htmlFor={id('type')}
              label="Type of IV Fluid*"
              error={rowErrors?.type?.message}
            >
              <DecisionSelect
                id={id('type')}
                value={row.type}
                options={IV_FLUID_TYPES}
                placeholder="Select type"
                invalid={Boolean(rowErrors?.type)}
                onChange={value => setField(index, 'type', value)}
              />
            </DecisionField>
            {isOther && (
              <DecisionField
                htmlFor={id('other')}
                label="Other IV Type*"
                error={rowErrors?.otherType?.message}
              >
                <input
                  id={id('other')}
                  type="text"
                  placeholder="Enter other type"
                  aria-invalid={Boolean(rowErrors?.otherType)}
                  className={FIELD_CLASS}
                  {...form.register(`rows.${index}.otherType`)}
                />
              </DecisionField>
            )}
            <DecisionField
              htmlFor={id('rate')}
              label="IV Infusion Rate (drops/minute)*"
              error={rowErrors?.infusionRate?.message}
            >
              <input
                id={id('rate')}
                type="number"
                inputMode="decimal"
                placeholder="Enter infusion rate"
                aria-invalid={Boolean(rowErrors?.infusionRate)}
                className={FIELD_CLASS}
                {...form.register(`rows.${index}.infusionRate`)}
              />
            </DecisionField>
            <DecisionField
              htmlFor={id('status')}
              label="Infusion Status*"
              error={rowErrors?.infusionStatus?.message}
            >
              <DecisionSelect
                id={id('status')}
                value={row.infusionStatus}
                options={INFUSION_STATUSES}
                placeholder="Select infusion status"
                invalid={Boolean(rowErrors?.infusionStatus)}
                onChange={value => setField(index, 'infusionStatus', value)}
              />
            </DecisionField>
            <div className="mb-4 md:pt-7">
              <DeleteRowButton
                label="Remove IV fluid"
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
