import type { ReactNode } from 'react';
import type {
  LcgCompletionReason,
  LcgVisitCompletion,
} from '../../modules/dashboard/elcg/elcg.types';
import { LcgCardComponent } from './lcg-card.component';

/** partogram.component.scss's `.table-stripped td` — the value in green, its label in black. */
const DETAIL_CELL_CLASS =
  'rounded-none border border-[#212529] p-3 align-middle text-base font-bold text-[green]';

function Detail({
  label,
  colSpan,
  noWrap = false,
  children,
}: {
  label: string;
  colSpan?: number;
  noWrap?: boolean;
  children: ReactNode;
}) {
  return (
    <td
      colSpan={colSpan}
      className={`${DETAIL_CELL_CLASS} ${noWrap ? 'whitespace-nowrap' : ''}`}
    >
      <span className="whitespace-nowrap text-[#212529]">{label}</span>{' '}
      {children}
    </td>
  );
}

function ReasonRows({
  reason,
  completion,
}: {
  reason: LcgCompletionReason;
  completion: LcgVisitCompletion;
}) {
  switch (reason.kind) {
    case 'out-of-time':
      return (
        <tr>
          <Detail label="Visit Complete Reason:" noWrap>
            Out Of Time
          </Detail>
          <Detail label="Out of Time Reason:" colSpan={4}>
            {reason.reason}
          </Detail>
        </tr>
      );
    case 'other':
      return (
        <tr>
          <Detail label="Visit Complete Reason:" noWrap>
            Other
          </Detail>
          <Detail label="Other Reason:" colSpan={4}>
            {reason.reason}
          </Detail>
        </tr>
      );
    case 'referred':
      return (
        <tr>
          <Detail label="Visit Complete Reason:" colSpan={5} noWrap>
            {reason.referType}
          </Detail>
        </tr>
      );
    case 'newborn': {
      const isOtherOutcome = reason.birthOutcome.toUpperCase() === 'OTHER';
      const birth = completion.birth;
      return (
        <>
          <tr>
            <Detail label="Visit Complete Reason:" colSpan={5} noWrap>
              Newborn
            </Detail>
          </tr>
          <tr>
            {/* The Angular card shows the Stage 3 BIRTH_TYPE here, not the
                Visit Complete encounter's Birth Outcome — kept as is. */}
            <Detail
              label="Birth Outcome:"
              colSpan={isOtherOutcome ? 1 : 5}
              noWrap
            >
              {birth?.babyStatus}
            </Detail>
            {isOtherOutcome && (
              <Detail label="Other Birth Outcome:" colSpan={4}>
                {reason.birthOutcomeOther}
              </Detail>
            )}
          </tr>
          {!isOtherOutcome && (
            <tr>
              <Detail label="Birth Weight:" noWrap>
                {birth?.birthWeight}
              </Detail>
              <Detail label="Apgar at 1 min:" noWrap>
                {birth?.apgar1}
              </Detail>
              <Detail label="Apgar at 5 min:" noWrap>
                {birth?.apgar5}
              </Detail>
              <Detail label="Baby Sex:" noWrap>
                {birth?.babySex}
              </Detail>
              <Detail label="Baby Status:">{birth?.babyStatus}</Detail>
            </tr>
          )}
          <tr>
            <Detail
              label="Mother Status :"
              colSpan={reason.motherDeceasedReason ? 1 : 5}
              noWrap
            >
              {reason.motherDeceasedReason ? 'Death' : 'Healthy'}
            </Detail>
            {reason.motherDeceasedReason && (
              <Detail label="Mother Death Reason:" colSpan={4}>
                {reason.motherDeceasedReason}
              </Detail>
            )}
          </tr>
        </>
      );
    }
  }
}

interface VisitCompleteDetailsComponentProps {
  completion: LcgVisitCompletion;
  onViewStage3?: () => void;
}

/** The "Visit Complete Details" card shown under a completed visit's guide. */
export function VisitCompleteDetailsComponent({
  completion,
  onViewStage3,
}: VisitCompleteDetailsComponentProps) {
  return (
    <LcgCardComponent
      id="vcd"
      title="Visit Complete Details"
      actions={
        completion.hasStage3 && (
          <button
            type="button"
            onClick={onViewStage3}
            className="cursor-pointer rounded-lg bg-[#2E1E91] p-2.5 text-sm font-bold text-white"
          >
            View Stage 3
          </button>
        )
      }
    >
      <div className="w-full overflow-x-auto">
        <table className="m-0 w-full border-collapse border border-[#212529]">
          <tbody>
            {completion.reason && (
              <ReasonRows reason={completion.reason} completion={completion} />
            )}
          </tbody>
        </table>
      </div>
    </LcgCardComponent>
  );
}
