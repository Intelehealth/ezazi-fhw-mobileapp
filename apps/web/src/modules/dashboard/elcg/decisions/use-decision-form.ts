import { zodResolver } from '@hookform/resolvers/zod';
import { useState, type BaseSyntheticEvent } from 'react';
import {
  useFieldArray,
  useForm,
  type ArrayPath,
  type FieldArray,
  type Resolver,
  type UseFormReturn,
} from 'react-hook-form';
import type { z } from 'zod';
import type { LcgOwnedEntry } from '../elcg.types';
import {
  planObsChanges,
  type DecisionRowBase,
  type ObsChange,
} from './decision.rows';

export interface DecisionFormValues<TRow> {
  rows: TRow[];
}

export interface DecisionForm<TRow> {
  form: UseFormReturn<DecisionFormValues<TRow>>;
  /** One per row, deleted ones included; `id` is the row's React key. */
  fields: { id: string }[];
  addRow: () => void;
  removeRow: (index: number) => void;
  /** Sets one field of one row — for fields that are not native inputs. */
  setField: (index: number, field: keyof TRow & string, value: string) => void;
  submit: (event?: BaseSyntheticEvent) => Promise<void>;
}

interface UseDecisionFormOptions<TRow extends DecisionRowBase, TEntry> {
  /** The latest encounter's entries of the kind. */
  current: LcgOwnedEntry<TEntry>[];
  /** The signed-in OpenMRS user — only their own entries open as editable rows. */
  viewerUuid: string | null;
  toRow: (entry: TEntry) => TRow;
  emptyRow: () => TRow;
  serialize: (row: TRow) => string;
  schema: z.ZodTypeAny;
  onSave: (changes: ObsChange[]) => void;
}

/**
 * The form behind each Shared Decision Making dialog — the Angular dialogs'
 * ngOnInit() / add…() / remove…() / add(): the signed-in user's own entries
 * on the latest encounter open as editable rows (or one empty row when there
 * are none), a removed saved row is only flagged, and a valid Save hands
 * back the obs to create, update and void.
 */
export function useDecisionForm<TRow extends DecisionRowBase, TEntry>({
  current,
  viewerUuid,
  toRow,
  emptyRow,
  serialize,
  schema,
  onSave,
}: UseDecisionFormOptions<TRow, TEntry>): DecisionForm<TRow> {
  /* Read once: the dialog edits what was there when it opened. */
  const [initialRows] = useState(() =>
    current
      .filter(entry => viewerUuid && entry.creatorUuid === viewerUuid)
      .map(toRow)
  );

  const form = useForm<DecisionFormValues<TRow>>({
    resolver: zodResolver(schema) as unknown as Resolver<
      DecisionFormValues<TRow>
    >,
    defaultValues: {
      rows: initialRows.length ? initialRows : [emptyRow()],
    } as DecisionFormValues<TRow> as never,
  });

  const rowsPath = 'rows' as ArrayPath<DecisionFormValues<TRow>>;
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: rowsPath,
  });

  type RowField = FieldArray<DecisionFormValues<TRow>, typeof rowsPath>;

  function addRow() {
    append(emptyRow() as unknown as RowField);
  }

  function removeRow(index: number) {
    const row = form.getValues().rows[index];
    if (row.obsUuid) {
      update(index, { ...row, isDeleted: true } as unknown as RowField);
    } else {
      remove(index);
    }
  }

  function setField(index: number, field: keyof TRow & string, value: string) {
    form.setValue(`rows.${index}.${field}` as never, value as never, {
      shouldDirty: true,
      /* Like the native inputs: re-checked as it changes once Save was pressed. */
      shouldValidate: form.formState.isSubmitted,
    });
  }

  const submit = form.handleSubmit(values =>
    onSave(planObsChanges(values.rows, initialRows, serialize))
  );

  return { form, fields, addRow, removeRow, setField, submit };
}
