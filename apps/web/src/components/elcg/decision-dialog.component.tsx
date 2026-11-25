import type { FormEventHandler, ReactNode } from 'react';
import { ComboboxComponent } from '../common/combobox.component';
import { ModalOverlayComponent } from '../common/modal-overlay.component';
import closeIcon from '../../assets/svgs/close-x.svg';
import deleteIcon from '../../assets/svgs/delete-icon.svg';

/** One line of a dialog's history list. */
export interface DecisionHistoryItem {
  uuid: string;
  label: string;
  /** `Dr. Joshi (02-11-2026 07:05 AM)` — who and when, in blue on the right. */
  meta: string;
}

interface DecisionDialogComponentProps {
  /** Upper-case, as the Angular dialogs title themselves: ASSESSMENT, PLAN, … */
  title: string;
  history: DecisionHistoryItem[];
  isSaving: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onClose: () => void;
  /** The form's rows and their Add / Prescribe New button. */
  children: ReactNode;
}

/**
 * The `.add-plan-modal` frame every Shared Decision Making dialog shares
 * (add-assessment, prescribe-plan, prescribe-medication, prescribe-oxytocin,
 * prescribe-iv-fluid): a title bar with a close button, the form's rows on a
 * grey panel, the kind's history below it, and Cancel / Save. Only Cancel
 * and the Close button close it — not a click outside, nor Escape.
 */
export function DecisionDialogComponent({
  title,
  history,
  isSaving,
  onSubmit,
  onClose,
  children,
}: DecisionDialogComponentProps) {
  const titleId = `decision-dialog-${title.toLowerCase().replace(/\s+/g, '-')}`;
  /* A save in flight can't be abandoned half-way through. */
  const close = isSaving ? undefined : onClose;

  return (
    /*
     * No onClose on the overlay: a click outside or Escape must not throw
     * away a half-filled form, so only Cancel and the Close button close it.
     */
    <ModalOverlayComponent>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        /* styles.scss's `.modal-lg`: 1086px, at most 90% of the window. */
        className="flex max-h-[95vh] w-[1086px] max-w-[90%] flex-col rounded-xl bg-white font-['DM_Sans']"
      >
        <div className="flex h-[70px] shrink-0 items-center justify-between p-6">
          <h6 id={titleId} className="m-0 text-xl font-bold text-[#1B163A]">
            {title}
          </h6>
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            disabled={isSaving}
            className="cursor-pointer border-none bg-transparent disabled:cursor-not-allowed"
          >
            <img src={closeIcon} alt="" />
          </button>
        </div>

        <form
          noValidate
          onSubmit={onSubmit}
          className="flex min-h-0 flex-col overflow-y-auto px-6 pb-6"
        >
          <div className="mb-3 rounded-xl bg-[#F7F7FA] px-5 py-3">
            {children}
          </div>

          {history.length > 0 && (
            <div className="mb-3 rounded-xl bg-[#F7F7FA] px-5 py-3">
              <DecisionHistoryList items={history} />
            </div>
          )}

          <div className="flex justify-center py-2">
            <button
              type="button"
              onClick={close}
              disabled={isSaving}
              className={`${SECONDARY_BUTTON_CLASS} mr-2`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={PRIMARY_BUTTON_CLASS}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlayComponent>
  );
}

/**
 * `.items-list` — entries with who recorded them and when, in blue on the
 * right: the history under each Add dialog, and the View dialogs' lists.
 */
export function DecisionHistoryList({
  items,
}: {
  items: DecisionHistoryItem[];
}) {
  return (
    <ul className="m-0 list-none p-0 text-base md:list-disc md:pl-6">
      {items.map(item => (
        <li
          key={item.uuid}
          className="mb-1 border-b border-[rgba(178,175,190,0.2)]"
        >
          <div className="flex flex-col items-start md:flex-row md:flex-nowrap">
            <span className="grow py-1.5 text-[#1B163A]">{item.label}</span>
            <span className="py-1.5 text-xs font-bold whitespace-nowrap text-[#007bff]">
              {item.meta}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** `.confirm-btn` */
export const PRIMARY_BUTTON_CLASS =
  'h-12 min-w-[119px] cursor-pointer rounded-lg border border-[#2E1E91] bg-[#2E1E91] px-6 py-2 text-lg leading-[150%] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60';

/** `.cancel-btn` */
const SECONDARY_BUTTON_CLASS =
  'h-12 min-w-[119px] cursor-pointer rounded-lg border border-[#EFE8FF] bg-white px-6 py-2 text-lg leading-[150%] font-bold text-[#2E1E91] disabled:cursor-not-allowed disabled:opacity-60';

/** `.form-control` — a white 48px field with no border. */
export const FIELD_CLASS =
  'h-12 w-full rounded-lg border border-transparent bg-white px-4 text-base text-[#1B163A] outline-none focus:border-[#2E1E91] aria-[invalid=true]:border-red-500';

/** A labelled field with its validation message underneath. */
export function DecisionField({
  htmlFor,
  label,
  error,
  className = '',
  children,
}: {
  htmlFor: string;
  /** Omit for a field labelled only by its placeholder (assessment / plan text). */
  label?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="mb-2 block text-sm font-bold text-[#1B163A]"
        >
          {label}
        </label>
      )}
      {children}
      {error && (
        <small role="alert" className="mt-1 block text-red-600">
          {error}
        </small>
      )}
    </div>
  );
}

/**
 * ng-select's searchable single-choice dropdown (`.visit-select`): typing
 * filters the list, and only a listed value can be chosen. A saved value
 * that is not one of the options (an older list's entry) is kept in the
 * list rather than silently shown as empty.
 */
export function DecisionSelect({
  id,
  value,
  options,
  placeholder,
  invalid,
  onChange,
}: {
  id: string;
  value: string;
  options: string[];
  placeholder: string;
  invalid?: boolean;
  onChange: (value: string) => void;
}) {
  const choices =
    value && !options.includes(value) ? [value, ...options] : options;
  return (
    <ComboboxComponent
      id={id}
      value={value}
      options={choices.map(option => ({ key: option, label: option }))}
      placeholder={placeholder}
      invalid={invalid}
      allowCustom={false}
      onSelect={option => onChange(option.label)}
      className={FIELD_CLASS}
    />
  );
}

/** `.delete-btn` — removes one row. */
export function DeleteRowButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-12 w-full cursor-pointer items-center justify-center rounded-lg border border-[rgba(178,175,190,0.2)] bg-white px-3"
    >
      <img src={deleteIcon} alt="" />
    </button>
  );
}

/** The confirm-styled "Add" / "Prescribe New" button under the rows. */
export function AddRowButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${PRIMARY_BUTTON_CLASS} mt-2`}
    >
      {children}
    </button>
  );
}
