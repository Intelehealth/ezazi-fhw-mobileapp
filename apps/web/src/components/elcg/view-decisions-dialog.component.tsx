import { ModalOverlayComponent } from '../common/modal-overlay.component';
import closeIcon from '../../assets/svgs/close-x.svg';
import {
  DecisionHistoryList,
  PRIMARY_BUTTON_CLASS,
  type DecisionHistoryItem,
} from './decision-dialog.component';

/** One headed list — ASSESSMENT, PLAN, MEDICATION, OXYTOCIN or IV FLUIDS. */
export interface DecisionSection {
  heading: string;
  items: DecisionHistoryItem[];
}

interface ViewDecisionsDialogComponentProps {
  /** `ASSESSMENT [Stage 1] [ Hour 2]` */
  title: string;
  sections: DecisionSection[];
  onClose: () => void;
}

/**
 * Ports view-asssessment.component and view-plan.component — what was
 * recorded in one hour of the guide, read-only: each non-empty section under
 * its heading, and a Close button. Like the Add dialogs, a click outside or
 * Escape does not close it; only Close and the X do.
 */
export function ViewDecisionsDialogComponent({
  title,
  sections,
  onClose,
}: ViewDecisionsDialogComponentProps) {
  const filled = sections.filter(section => section.items.length > 0);

  return (
    <ModalOverlayComponent>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="view-decisions-title"
        className="flex max-h-[95vh] w-[1086px] max-w-[90%] flex-col rounded-xl bg-white font-['DM_Sans']"
      >
        <div className="flex h-[70px] shrink-0 items-center justify-between p-6">
          <h6
            id="view-decisions-title"
            className="m-0 text-xl font-bold text-[#1B163A]"
          >
            {title}
          </h6>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="cursor-pointer border-none bg-transparent"
          >
            <img src={closeIcon} alt="" />
          </button>
        </div>

        <div className="flex min-h-0 flex-col overflow-y-auto px-6 pb-6">
          <div className="mb-3 rounded-xl bg-[#F7F7FA] px-5 py-3">
            {filled.length === 0 && (
              <p className="m-0 py-1.5 text-[#7F7B92]">
                Nothing was recorded in this hour.
              </p>
            )}
            {filled.map(section => (
              <section key={section.heading} aria-label={section.heading}>
                <h6 className="m-0 py-2 text-sm font-bold text-[#1B163A]">
                  {section.heading}
                </h6>
                <DecisionHistoryList items={section.items} />
              </section>
            ))}
          </div>

          <div className="flex justify-center py-2">
            <button
              type="button"
              onClick={onClose}
              className={PRIMARY_BUTTON_CLASS}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </ModalOverlayComponent>
  );
}
