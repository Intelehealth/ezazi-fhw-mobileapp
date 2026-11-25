import {
  AddRowButton,
  DecisionDialogComponent,
  DecisionField,
  DeleteRowButton,
  FIELD_CLASS,
} from '../../../../components/elcg/decision-dialog.component';
import { formatDayMonthYearTime12h } from '../../../../utils/date-format';
import type { LcgNoteEntry } from '../elcg.types';
import {
  emptyNoteRow,
  noteRow,
  serializeNote,
  type NoteRow,
} from './decision.rows';
import { noteFormSchema } from './decision.validation';
import type { DecisionDialogProps } from './decision-dialog.types';
import { useDecisionForm } from './use-decision-form';

const NOTE_KINDS = {
  assessment: { title: 'ASSESSMENT', noun: 'assessment' },
  plan: { title: 'PLAN', noun: 'plan' },
} as const;

interface NoteDecisionDialogProps extends DecisionDialogProps<LcgNoteEntry> {
  kind: keyof typeof NOTE_KINDS;
}

/**
 * Ports add-assessment.component and prescribe-plan.component — one free
 * text line per assessment / plan, "Add" for another, and every earlier one
 * listed with when it was recorded.
 */
export function NoteDecisionDialogComponent({
  kind,
  source,
  viewerUuid,
  isSaving,
  onSave,
  onClose,
}: NoteDecisionDialogProps) {
  const { title, noun } = NOTE_KINDS[kind];
  const { form, fields, addRow, removeRow, submit } = useDecisionForm<
    NoteRow,
    LcgNoteEntry
  >({
    current: source.current,
    viewerUuid,
    toRow: noteRow,
    emptyRow: emptyNoteRow,
    serialize: serializeNote,
    schema: noteFormSchema(`Enter ${noun}`),
    onSave,
  });
  const rows = form.watch('rows');
  const errors = form.formState.errors.rows;

  return (
    <DecisionDialogComponent
      title={title}
      isSaving={isSaving}
      onSubmit={submit}
      onClose={onClose}
      history={source.history.map(entry => ({
        uuid: entry.uuid,
        label: entry.value,
        meta: `(${formatDayMonthYearTime12h(entry.obsDatetime) ?? ''})`,
      }))}
    >
      {fields.map((field, index) =>
        rows[index]?.isDeleted ? null : (
          <div
            key={field.id}
            className="mt-2 grid grid-cols-[1fr_auto] items-start gap-2"
          >
            <DecisionField
              htmlFor={`${kind}-${index}`}
              error={errors?.[index]?.value?.message}
              className="mb-2"
            >
              <input
                id={`${kind}-${index}`}
                type="text"
                aria-label={title.charAt(0) + title.slice(1).toLowerCase()}
                placeholder={`Enter ${noun}`}
                aria-invalid={Boolean(errors?.[index]?.value)}
                className={FIELD_CLASS}
                {...form.register(`rows.${index}.value`)}
              />
            </DecisionField>
            <DeleteRowButton
              label={`Remove ${noun}`}
              onClick={() => removeRow(index)}
            />
          </div>
        )
      )}
      <AddRowButton onClick={addRow}>Add</AddRowButton>
    </DecisionDialogComponent>
  );
}
