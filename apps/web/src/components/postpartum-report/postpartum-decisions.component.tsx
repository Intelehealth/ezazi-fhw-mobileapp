import { useState } from 'react';
import {
  postpartumDecisionHistory,
  type PostpartumDecisionTarget,
} from '../../modules/dashboard/postpartum-report/postpartum-report.decisions';
import type {
  PostpartumNoteKind,
  PostpartumPatient,
  PostpartumReportView,
} from '../../modules/dashboard/postpartum-report/postpartum-report.types';
import { LcgCardComponent } from '../elcg/lcg-card.component';
import {
  DecisionAddButton,
  DecisionPanel,
  type HistoryItem,
} from '../elcg/shared-decision-making.component';
import { formatDateTime } from '../../utils/date-format';
import diagnosisIcon from '../../assets/svgs/diagnosis.svg';
import noteIcon from '../../assets/svgs/note.svg';

const PANELS: { kind: PostpartumNoteKind; title: string; icon: string }[] = [
  { kind: 'assessment', title: 'Assessment', icon: diagnosisIcon },
  { kind: 'plan', title: 'Plan', icon: noteIcon },
];

const COLUMNS: { patient: PostpartumPatient; title: string }[] = [
  { patient: 'mother', title: 'Mother' },
  { patient: 'newborn', title: 'Newborn' },
];

/*
 * stage3.component.html's history line: just when it was recorded,
 * `(YYYY/MM/DD hh:mm am)` — formatDateTimeByClient(), no name.
 */
function stage3HistoryMeta(item: HistoryItem): string {
  return `(${formatDateTime(item.obsDatetime) ?? ''})`;
}

type PanelKey = `${PostpartumPatient}-${PostpartumNoteKind}`;

interface PostpartumDecisionsComponentProps {
  report: PostpartumReportView;
  onAdd: (target: PostpartumDecisionTarget) => void;
}

/*
 * stage3.component.html's "Share decision making - Early Post Partum" card:
 * the mother's and the newborn's assessment and plan history side by side,
 * newest first, each with an "Add" button opening its dialog.
 */
export function PostpartumDecisionsComponent({
  report,
  onAdd,
}: PostpartumDecisionsComponentProps) {
  const [expanded, setExpanded] = useState<Partial<Record<PanelKey, boolean>>>(
    {}
  );

  return (
    <LcgCardComponent title="Share decision making - Early Post Partum">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-0">
        {COLUMNS.map(({ patient, title }, columnIndex) => (
          <div
            key={patient}
            className={
              columnIndex === 0
                ? 'md:border-r md:border-[#e3e6ef] md:pr-5'
                : 'md:pl-5'
            }
          >
            <h6 className="m-0 mb-2 text-xl font-semibold text-[#1B163A]">
              {title}
            </h6>
            {PANELS.map(({ kind, title: panelTitle, icon }, index) => {
              const key: PanelKey = `${patient}-${kind}`;
              return (
                <DecisionPanel
                  key={key}
                  title={panelTitle}
                  icon={icon}
                  items={postpartumDecisionHistory(report, {
                    patient,
                    kind,
                  }).map(entry => ({ ...entry, label: entry.value }))}
                  isExpanded={Boolean(expanded[key])}
                  isShaded={index % 2 === 1}
                  onToggle={() =>
                    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
                  }
                  formatMeta={stage3HistoryMeta}
                  addButton={
                    <DecisionAddButton
                      label={`Add ${title.toLowerCase()} ${kind}`}
                      onClick={() => onAdd({ patient, kind })}
                    />
                  }
                />
              );
            })}
          </div>
        ))}
      </div>
    </LcgCardComponent>
  );
}
