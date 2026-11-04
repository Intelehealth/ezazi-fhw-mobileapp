import type { ReactNode } from 'react';
import type {
  LcgIvFluidEntry,
  LcgNoteEntry,
  LcgOxytocinEntry,
  LcgReading,
} from '../../modules/dashboard/elcg/elcg.types';
import { formatTime } from '../../utils/date-format';
import openInNewIcon from '../../assets/svgs/open-in-new.svg';

/**
 * The building blocks of lcg-table.component.tsx — partogram.component.scss's
 * `.table-bordered` cell, `.value-item` and `.divider` styles as components.
 */

/** `.table-bordered td` */
export const CELL_CLASS =
  'border border-black p-2 text-center align-middle text-xs font-bold';

/** `td.nb` — a cell without borders. */
export const BORDERLESS_CELL_CLASS =
  'border-none p-2 text-center align-middle text-xs font-bold';

/** `.value-item` — a recorded value, in blue. */
const VALUE_ITEM_CLASS =
  'mx-auto w-fit min-w-5 rounded-full p-0.5 text-[#007bff]';

/** `.value-item.note` — free text, read bottom-to-top like the paper guide. */
const NOTE_ITEM_CLASS =
  'mx-auto max-h-[350px] w-fit rotate-180 p-0.5 break-words text-[#007bff] [writing-mode:vertical-rl]';

const ALERT_BORDER_CLASS = {
  R: 'border-2 border-[#ED1A56]',
  Y: 'border-2 border-[#FD8C3E]',
} as const;

/**
 * The dotted rule between each half-hour pair (`.brd` / `.bld`): an even
 * sub-column dots its right edge, the odd one after it its left. Collapsed
 * borders prefer solid over dotted, so only the shared edge turns dotted.
 */
export function halfHourlyClass(index: number): string {
  return index % 2 === 0
    ? '[border-right-style:dotted]'
    : '[border-left-style:dotted]';
}

export function ValueItemComponent({
  reading,
  children,
}: {
  reading?: LcgReading | null;
  children?: ReactNode;
}) {
  const alertClass = reading?.alert ? ALERT_BORDER_CLASS[reading.alert] : '';
  return (
    <div className={`${VALUE_ITEM_CLASS} ${alertClass}`}>
      {children ?? reading?.value}
    </div>
  );
}

/** The blank column separating the first stage's sub-columns from the second's. */
export function StageGapCell() {
  return <td className="border-none p-[0.15rem]" />;
}

/** `td.divider` — a thin borderless spacer row between sections. */
export function DividerRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="border-none p-[0.15rem]" />
    </tr>
  );
}

/** `.vrt-header` — a section's name, written bottom-to-top down its rows. */
export function VerticalHeaderCell({
  title,
  rowSpan,
}: {
  title: string;
  rowSpan: number;
}) {
  return (
    <td rowSpan={rowSpan} className={`${CELL_CLASS} border-l-0`}>
      <span className="inline-block max-h-[300px] rotate-180 [text-shadow:0_0_1px_#000] [writing-mode:vertical-rl]">
        {title}
      </span>
    </td>
  );
}

/** The ALERT row's "←—— STAGE ——→" arrow (`.alert-row .arrow`). */
export function StageArrow({ label }: { label: string }) {
  return (
    <div className="flex items-center">
      <div className="relative h-0.5 w-full bg-black before:absolute before:top-1/2 before:-left-1.5 before:h-0 before:w-0 before:-translate-y-1/2 before:border-y-[6px] before:border-r-[6px] before:border-y-transparent before:border-r-black" />
      <span className="mx-[5px] whitespace-nowrap">{label}</span>
      <div className="relative h-0.5 w-full bg-black after:absolute after:top-1/2 after:-right-1.5 after:h-0 after:w-0 after:-translate-y-1/2 after:border-y-[6px] after:border-l-[6px] after:border-y-transparent after:border-l-black" />
    </div>
  );
}

/** "(Kavita Rao 07:05)" — who recorded an entry, and when. */
function Signature({
  entry,
}: {
  entry: { initial: string; obsDatetime: string };
}) {
  if (!entry.initial) return null;
  const time = formatTime(entry.obsDatetime);
  return (
    <small>
      <i>
        ({entry.initial}
        {time && ` ${time}`})
      </i>
    </small>
  );
}

/** A note-row label ("Strength :"), in the guide's black. */
function NoteLabel({ children }: { children: ReactNode }) {
  return <span className="text-[#212529]">{children}</span>;
}

export function OxytocinNote({ entry }: { entry: LcgOxytocinEntry }) {
  return (
    <div className={NOTE_ITEM_CLASS}>
      {typeof entry.value === 'string' ? (
        entry.value
      ) : (
        <>
          <NoteLabel>Strength : </NoteLabel>
          {entry.value.strength} U/L
          <br />
          <NoteLabel>Infusion Rate : </NoteLabel>
          {entry.value.infusionRate} drops/minute
          <br />
          <NoteLabel>Infusion Status : </NoteLabel>
          {entry.value.infusionStatus}
          <br />
          <Signature entry={entry} />
        </>
      )}
    </div>
  );
}

export function IvFluidNote({ entry }: { entry: LcgIvFluidEntry }) {
  return (
    <div className={NOTE_ITEM_CLASS}>
      {typeof entry.value === 'string' ? (
        entry.value
      ) : (
        <>
          <NoteLabel>Type : </NoteLabel>
          {entry.value.type}
          <br />
          <NoteLabel>Infusion Rate : </NoteLabel>
          {entry.value.infusionRate} drops/minute
          <br />
          <NoteLabel>Infusion Status : </NoteLabel>
          {entry.value.infusionStatus}
          <br />
          <Signature entry={entry} />
        </>
      )}
    </div>
  );
}

/** Medicine values are `|`-separated with `::` joining amount and unit. */
export function formatMedicine(value: string): string {
  return value.replace(/::/g, ' ');
}

export function MedicineNotes({ entries }: { entries: LcgNoteEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div className={NOTE_ITEM_CLASS}>
      {entries.map(entry => (
        <span key={entry.uuid}>
          {formatMedicine(entry.value)} <Signature entry={entry} />
          <br />
        </span>
      ))}
    </div>
  );
}

/** One hour's assessment or plan entries, with the button that opens them in full. */
export function DecisionNotes({
  entries,
  viewLabel,
  onView,
}: {
  entries: LcgNoteEntry[];
  viewLabel: string;
  onView?: () => void;
}) {
  return (
    <div className={NOTE_ITEM_CLASS}>
      {entries.map(entry => (
        <p key={entry.uuid} className="m-0">
          {entry.value} <Signature entry={entry} />
        </p>
      ))}
      <button
        type="button"
        aria-label={viewLabel}
        onClick={onView}
        className="cursor-pointer rounded-full p-2 hover:bg-black/5"
      >
        <img src={openInNewIcon} alt="" width={24} height={24} />
      </button>
    </div>
  );
}
