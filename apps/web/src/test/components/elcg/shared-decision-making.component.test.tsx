import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SharedDecisionMakingComponent } from '../../../components/elcg/shared-decision-making.component';
import type { LcgDecisionHistory } from '../../../modules/dashboard/elcg/elcg.types';
import { localIso } from '../../fixtures/elcg-view';

const SIGNED = {
  initial: 'Dr. Joshi',
  obsDatetime: localIso(2026, 10, 2, 7, 5),
};

const HISTORY: LcgDecisionHistory = {
  assessment: [{ uuid: 'a-1', value: 'Progressing normally', ...SIGNED }],
  plan: [{ uuid: 'p-1', value: 'Encourage mobility', ...SIGNED }],
  medication: [
    { uuid: 'm-1', value: 'Tablet | Paracetamol | 1::tablet', ...SIGNED },
  ],
  oxytocin: [
    {
      uuid: 'o-1',
      value: { strength: '5', infusionRate: '10', infusionStatus: 'start' },
      ...SIGNED,
    },
    { uuid: 'o-2', value: 'Stopped by nurse', ...SIGNED },
  ],
  ivFluids: [
    {
      uuid: 'i-1',
      value: {
        type: 'Other',
        otherType: 'Dextrose 5%',
        infusionRate: '20',
        infusionStatus: 'continue',
      },
      ...SIGNED,
    },
  ],
};

describe('SharedDecisionMakingComponent', () => {
  it('starts with every panel collapsed', () => {
    render(<SharedDecisionMakingComponent history={HISTORY} canAdd />);

    expect(screen.getByText('Assessment')).toBeInTheDocument();
    expect(screen.queryByText('Progressing normally')).not.toBeInTheDocument();
  });

  it('expands one panel to list its history with who recorded it and when', () => {
    render(<SharedDecisionMakingComponent history={HISTORY} canAdd />);

    fireEvent.click(screen.getByText('Assessment'));

    expect(screen.getByText('Progressing normally')).toBeInTheDocument();
    expect(
      screen.getByText('Dr. Joshi (02-11-2026 07:05)')
    ).toBeInTheDocument();
    expect(screen.queryByText('Encourage mobility')).not.toBeInTheDocument();
  });

  it('"Show all" expands every panel, formatting each kind of entry', async () => {
    render(<SharedDecisionMakingComponent history={HISTORY} canAdd />);

    await userEvent.click(screen.getByRole('button', { name: 'Show all' }));

    expect(screen.getByText('Encourage mobility')).toBeInTheDocument();
    expect(
      screen.getByText('Tablet | Paracetamol | 1 tablet')
    ).toBeInTheDocument();
    expect(
      screen.getByText('START OXYTOCIN - 5 U/L (10 drops/minute)')
    ).toBeInTheDocument();
    expect(screen.getByText('Stopped by nurse')).toBeInTheDocument();
    expect(
      screen.getByText('CONTINUE IV - Other Dextrose 5% (20 drops/minute)')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Hide all' })
    ).toBeInTheDocument();
  });

  it('adds to a panel without toggling it', async () => {
    const onAdd = vi.fn();
    render(
      <SharedDecisionMakingComponent history={HISTORY} canAdd onAdd={onAdd} />
    );

    await userEvent.click(screen.getByRole('button', { name: 'Add plan' }));

    expect(onAdd).toHaveBeenCalledWith('plan');
    expect(screen.queryByText('Encourage mobility')).not.toBeInTheDocument();
  });

  it('offers no Add buttons once the visit is complete', () => {
    render(<SharedDecisionMakingComponent history={HISTORY} canAdd={false} />);

    expect(
      screen.queryByRole('button', { name: /^Add / })
    ).not.toBeInTheDocument();
  });
});
