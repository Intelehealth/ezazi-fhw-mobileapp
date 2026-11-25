import {
  DecisionDialogComponent,
  DecisionField,
  DecisionSelect,
  FIELD_CLASS,
} from '../../../../components/elcg/decision-dialog.component';
import type { LcgOxytocinEntry } from '../elcg.types';
import { INFUSION_STATUSES } from './decision.catalog';
import {
  emptyOxytocinRow,
  oxytocinLabel,
  oxytocinRow,
  serializeOxytocin,
  type OxytocinRow,
  recordedBy,
} from './decision.rows';
import { oxytocinFormSchema } from './decision.validation';
import type { DecisionDialogProps } from './decision-dialog.types';
import { useDecisionForm } from './use-decision-form';

/**
 * Ports prescribe-oxytocin.component — strength, infusion rate and infusion
 * status for one oxytocin order. Like the Angular dialog it has no "Prescribe
 * New" or delete: a new order supersedes the last one.
 */
export function OxytocinDecisionDialogComponent({
  source,
  viewerUuid,
  isSaving,
  onSave,
  onClose,
}: DecisionDialogProps<LcgOxytocinEntry>) {
  const { form, fields, setField, submit } = useDecisionForm<
    OxytocinRow,
    LcgOxytocinEntry
  >({
    current: source.current,
    viewerUuid,
    toRow: oxytocinRow,
    emptyRow: emptyOxytocinRow,
    serialize: serializeOxytocin,
    schema: oxytocinFormSchema,
    onSave,
  });
  const rows = form.watch('rows');
  const errors = form.formState.errors.rows;

  return (
    <DecisionDialogComponent
      title="OXYTOCIN"
      isSaving={isSaving}
      onSubmit={submit}
      onClose={onClose}
      history={source.history.map(entry => ({
        uuid: entry.uuid,
        label: oxytocinLabel(entry),
        meta: recordedBy(entry),
      }))}
    >
      {fields.map((field, index) => {
        const rowErrors = errors?.[index];
        const id = (name: string) => `oxytocin-${index}-${name}`;
        return (
          <div
            key={field.id}
            className="mt-2 grid gap-x-4 border-t border-[rgba(178,175,190,0.2)] pt-2 first:border-t-0 first:pt-0 md:grid-cols-3"
          >
            <DecisionField
              htmlFor={id('strength')}
              label="Strength (U/L)*"
              error={rowErrors?.strength?.message}
            >
              <input
                id={id('strength')}
                type="number"
                inputMode="decimal"
                placeholder="Enter strength"
                aria-invalid={Boolean(rowErrors?.strength)}
                className={FIELD_CLASS}
                {...form.register(`rows.${index}.strength`)}
              />
            </DecisionField>
            <DecisionField
              htmlFor={id('rate')}
              label="Infusion Rate (drops/minute)*"
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
                value={rows[index].infusionStatus}
                options={INFUSION_STATUSES}
                placeholder="Select infusion status"
                invalid={Boolean(rowErrors?.infusionStatus)}
                onChange={value => setField(index, 'infusionStatus', value)}
              />
            </DecisionField>
          </div>
        );
      })}
    </DecisionDialogComponent>
  );
}
