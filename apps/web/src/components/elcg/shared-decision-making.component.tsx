import { useState, type ReactNode } from 'react';
import type {
  LcgDecisionHistory,
  LcgDecisionKind,
  LcgIvFluidEntry,
  LcgNoteEntry,
  LcgOxytocinEntry,
} from '../../modules/dashboard/elcg/elcg.types';
import { formatDayMonthYearTime } from '../../utils/date-format';
import { formatMedicine } from './lcg-cells.component';
import { LcgCardComponent } from './lcg-card.component';
import chevronIcon from '../../assets/svgs/chevron-down.svg';
import diagnosisIcon from '../../assets/svgs/diagnosis.svg';
import noteIcon from '../../assets/svgs/note.svg';
import medicationIcon from '../../assets/svgs/medication.svg';
import adviceIcon from '../../assets/svgs/advice.svg';
import referralIcon from '../../assets/svgs/referral.svg';
import plusIcon from '../../assets/svgs/plus.svg';
import minusIcon from '../../assets/svgs/minus.svg';

interface HistoryItem {
  uuid: string;
  label: string;
  initial: string;
  obsDatetime: string;
}

interface PanelConfig {
  kind: LcgDecisionKind;
  title: string;
  icon: string;
  toItems: (history: LcgDecisionHistory) => HistoryItem[];
}

function noteItems(entries: LcgNoteEntry[], format = (value: string) => value) {
  return entries.map(entry => ({ ...entry, label: format(entry.value) }));
}

function oxytocinLabel(entry: LcgOxytocinEntry): string {
  if (typeof entry.value === 'string') return entry.value;
  const { infusionStatus, strength, infusionRate } = entry.value;
  return `${infusionStatus.toUpperCase()} OXYTOCIN - ${strength} U/L (${infusionRate} drops/minute)`;
}

function ivFluidLabel(entry: LcgIvFluidEntry): string {
  if (typeof entry.value === 'string') return entry.value;
  const { infusionStatus, type, otherType, infusionRate } = entry.value;
  const fluid = otherType ? `${type} ${otherType}` : type;
  return `${infusionStatus.toUpperCase()} IV - ${fluid} (${infusionRate} drops/minute)`;
}

/** The five panels, in partogram.component.html's order. */
const PANELS: PanelConfig[] = [
  {
    kind: 'assessment',
    title: 'Assessment',
    icon: diagnosisIcon,
    toItems: history => noteItems(history.assessment),
  },
  {
    kind: 'plan',
    title: 'Plan',
    icon: noteIcon,
    toItems: history => noteItems(history.plan),
  },
  {
    kind: 'medication',
    title: 'Medication',
    icon: medicationIcon,
    toItems: history => noteItems(history.medication, formatMedicine),
  },
  {
    kind: 'oxytocin',
    title: 'Oxytocin',
    icon: adviceIcon,
    toItems: history =>
      history.oxytocin.map(entry => ({
        ...entry,
        label: oxytocinLabel(entry),
      })),
  },
  {
    kind: 'ivFluids',
    title: 'IV Fluids',
    icon: referralIcon,
    toItems: history =>
      history.ivFluids.map(entry => ({ ...entry, label: ivFluidLabel(entry) })),
  },
];

const ALL_COLLAPSED: Record<LcgDecisionKind, boolean> = {
  assessment: false,
  plan: false,
  medication: false,
  oxytocin: false,
  ivFluids: false,
};

interface SharedDecisionMakingComponentProps {
  history: LcgDecisionHistory;
  /** False once the visit is complete — hides every panel's "Add" button. */
  canAdd: boolean;
  onAdd?: (kind: LcgDecisionKind) => void;
}

/**
 * The "SHARED DECISION MAKING" card under the guide — an accordion of the
 * visit's assessment, plan, medication, oxytocin and IV-fluid history,
 * newest first, each with an "Add" button while the visit is in progress.
 */
export function SharedDecisionMakingComponent({
  history,
  canAdd,
  onAdd,
}: SharedDecisionMakingComponentProps) {
  const [expanded, setExpanded] = useState(ALL_COLLAPSED);
  const allExpanded = Object.values(expanded).every(Boolean);

  function toggle(kind: LcgDecisionKind) {
    setExpanded(prev => ({ ...prev, [kind]: !prev[kind] }));
  }

  function toggleAll() {
    const next = !allExpanded;
    setExpanded({
      assessment: next,
      plan: next,
      medication: next,
      oxytocin: next,
      ivFluids: next,
    });
  }

  return (
    <LcgCardComponent
      title="SHARED DECISION MAKING"
      actions={
        <button
          type="button"
          onClick={toggleAll}
          className="flex cursor-pointer items-center gap-1 px-4 text-sm font-normal text-[#6c757d]"
        >
          {allExpanded ? 'Hide all' : 'Show all'}
          {/* chevron-down.svg is drawn grey; brightness-0 darkens it to the
              Angular expand_more icon's near-black. */}
          <img
            src={chevronIcon}
            alt=""
            className={`h-4 w-4 brightness-0 transition-transform ${allExpanded ? '-rotate-90' : 'rotate-90'}`}
          />
        </button>
      }
    >
      {PANELS.map((panel, index) => (
        <DecisionPanel
          key={panel.kind}
          title={panel.title}
          icon={panel.icon}
          items={panel.toItems(history)}
          isExpanded={expanded[panel.kind]}
          isShaded={index % 2 === 1}
          onToggle={() => toggle(panel.kind)}
          addButton={
            canAdd && (
              <button
                type="button"
                aria-label={`Add ${panel.title.toLowerCase()}`}
                onClick={event => {
                  event.stopPropagation();
                  onAdd?.(panel.kind);
                }}
                className="mr-1 cursor-pointer rounded-lg bg-[#2E1E91] p-2.5 text-sm font-bold text-white"
              >
                Add
              </button>
            )
          }
        />
      ))}
    </LcgCardComponent>
  );
}

/**
 * One `<mat-expansion-panel>`: icon, title and Add button, collapsing its
 * history list. Sized as partogram.component.scss's `.intel-accordion-con`
 * lays it out — 24px padding around a 48px header, 24px apart (10px on
 * small screens).
 */
function DecisionPanel({
  title,
  icon,
  items,
  isExpanded,
  isShaded,
  onToggle,
  addButton,
}: {
  title: string;
  icon: string;
  items: HistoryItem[];
  isExpanded: boolean;
  isShaded: boolean;
  onToggle: () => void;
  addButton: ReactNode;
}) {
  return (
    <div
      className={`mb-2.5 rounded-xl p-2.5 md:mb-6 md:p-6 ${isShaded ? 'bg-[#FAF9FF]' : 'bg-white'}`}
    >
      {/* role="button" rather than <button>: the header holds its own Add
          <button>, which can't legally nest inside another one. */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={onToggle}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') onToggle();
        }}
        className="flex h-12 cursor-pointer items-center"
      >
        <img src={icon} alt="" width={44} />
        <h6 className="m-0 ml-2 flex grow items-center justify-between text-lg font-bold text-black">
          {title}
          {addButton}
        </h6>
        <img src={isExpanded ? minusIcon : plusIcon} alt="" className="ml-4" />
      </div>

      {isExpanded && (
        <ul className="m-0 list-none pt-1.5 text-base md:list-disc md:px-6 md:pt-6 md:pb-4 md:pl-12">
          {items.map(item => (
            <li key={item.uuid} className="mb-1.5">
              <div className="flex flex-col items-start md:flex-row md:flex-nowrap">
                <span className="mt-2 w-full grow border-t border-[rgba(178,175,190,0.2)] py-1.5 md:mt-0 md:w-auto md:border-0">
                  {item.label}
                </span>
                <span className="py-1.5 text-xs font-bold whitespace-nowrap text-[#007bff]">
                  {item.initial} ({formatDayMonthYearTime(item.obsDatetime)})
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
