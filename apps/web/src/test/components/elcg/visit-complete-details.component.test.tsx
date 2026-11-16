import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VisitCompleteDetailsComponent } from '../../../components/elcg/visit-complete-details.component';
import type { LcgVisitCompletion } from '../../../modules/dashboard/elcg/elcg.types';

const BIRTH = {
  birthWeight: '3.1 kg',
  apgar1: '8',
  apgar5: '9',
  babySex: 'F',
  babyStatus: 'Live Birth',
};

function newborn(
  overrides: Partial<{
    birthOutcome: string;
    birthOutcomeOther: string | null;
    motherDeceasedReason: string | null;
  }> = {}
): LcgVisitCompletion {
  return {
    reason: {
      kind: 'newborn',
      birthOutcome: 'Live Birth',
      birthOutcomeOther: null,
      motherDeceasedReason: null,
      ...overrides,
    },
    birth: BIRTH,
    hasStage3: false,
  };
}

/** The table cell holding `label`. */
function cellOf(label: string) {
  return screen.getByText(label).closest('td');
}

describe('VisitCompleteDetailsComponent', () => {
  it("lists a newborn's birth details and the mother's status", () => {
    render(<VisitCompleteDetailsComponent completion={newborn()} />);

    expect(cellOf('Visit Complete Reason:')).toHaveTextContent('Newborn');
    expect(cellOf('Birth Weight:')).toHaveTextContent('3.1 kg');
    expect(cellOf('Apgar at 1 min:')).toHaveTextContent('8');
    expect(cellOf('Apgar at 5 min:')).toHaveTextContent('9');
    expect(cellOf('Baby Sex:')).toHaveTextContent('F');
    expect(cellOf('Mother Status :')).toHaveTextContent('Healthy');
    expect(screen.queryByText('Mother Death Reason:')).not.toBeInTheDocument();
  });

  it("gives an 'Other' birth outcome's description instead of the baby's details", () => {
    render(
      <VisitCompleteDetailsComponent
        completion={newborn({
          birthOutcome: 'OTHER',
          birthOutcomeOther: 'Twins',
        })}
      />
    );

    expect(cellOf('Other Birth Outcome:')).toHaveTextContent('Twins');
    expect(screen.queryByText('Birth Weight:')).not.toBeInTheDocument();
  });

  it("records the mother's death and its reason", () => {
    render(
      <VisitCompleteDetailsComponent
        completion={newborn({ motherDeceasedReason: 'PPH' })}
      />
    );

    expect(cellOf('Mother Status :')).toHaveTextContent('Death');
    expect(cellOf('Mother Death Reason:')).toHaveTextContent('PPH');
  });

  it.each([
    [
      { kind: 'out-of-time', reason: 'Shift ended' },
      'Out of Time Reason:',
      'Shift ended',
    ],
    [
      { kind: 'other', reason: 'Self discharge' },
      'Other Reason:',
      'Self discharge',
    ],
  ] as const)('shows the reason for a %o completion', (reason, label, text) => {
    render(
      <VisitCompleteDetailsComponent
        completion={{ reason, birth: null, hasStage3: false }}
      />
    );

    expect(cellOf(label)).toHaveTextContent(text);
  });

  it('shows a referral as recorded', () => {
    render(
      <VisitCompleteDetailsComponent
        completion={{
          reason: { kind: 'referred', referType: 'Referred to higher centre' },
          birth: null,
          hasStage3: false,
        }}
      />
    );

    expect(cellOf('Visit Complete Reason:')).toHaveTextContent(
      'Referred to higher centre'
    );
  });

  it('links to Stage 3 only when a Stage 3 outcome was recorded', async () => {
    const onViewStage3 = vi.fn();
    const { rerender } = render(
      <VisitCompleteDetailsComponent
        completion={newborn()}
        onViewStage3={onViewStage3}
      />
    );
    expect(
      screen.queryByRole('button', { name: 'View Stage 3' })
    ).not.toBeInTheDocument();

    rerender(
      <VisitCompleteDetailsComponent
        completion={{ ...newborn(), hasStage3: true }}
        onViewStage3={onViewStage3}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'View Stage 3' }));

    expect(onViewStage3).toHaveBeenCalledTimes(1);
  });
});
