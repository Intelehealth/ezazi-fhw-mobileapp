import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ViewDecisionsDialogComponent } from '../../../components/elcg/view-decisions-dialog.component';

const SECTIONS = [
  {
    heading: 'PLAN',
    items: [
      {
        uuid: 'p-1',
        label: 'Encourage mobility',
        meta: '(02-11-2026 07:06 AM)',
      },
    ],
  },
  { heading: 'MEDICATION', items: [] },
];

describe('ViewDecisionsDialogComponent', () => {
  it('shows each section that has entries, under its heading', () => {
    render(
      <ViewDecisionsDialogComponent
        title="PLAN [Stage 1] [ Hour 1]"
        sections={SECTIONS}
        onClose={vi.fn()}
      />
    );

    expect(
      screen.getByRole('dialog', { name: 'PLAN [Stage 1] [ Hour 1]' })
    ).toBeInTheDocument();
    const plan = screen.getByRole('region', { name: 'PLAN' });
    expect(within(plan).getByText('Encourage mobility')).toBeInTheDocument();
    expect(within(plan).getByText('(02-11-2026 07:06 AM)')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'MEDICATION' })).toBeNull();
    expect(
      screen.queryByText('Nothing was recorded in this hour.')
    ).not.toBeInTheDocument();
  });

  it('says so when nothing was recorded in the hour', () => {
    render(
      <ViewDecisionsDialogComponent
        title="ASSESSMENT [Stage 1] [ Hour 3]"
        sections={[{ heading: 'ASSESSMENT', items: [] }]}
        onClose={vi.fn()}
      />
    );

    expect(
      screen.getByText('Nothing was recorded in this hour.')
    ).toBeInTheDocument();
  });

  it('closes only on its Close buttons, not a click outside or Escape', async () => {
    const onClose = vi.fn();
    render(
      <ViewDecisionsDialogComponent
        title="PLAN [Stage 1] [ Hour 1]"
        sections={SECTIONS}
        onClose={onClose}
      />
    );

    fireEvent.mouseDown(
      screen.getByRole('dialog').parentElement as HTMLElement
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();

    /* The X in the title bar, then the Close button under the list. */
    const [titleClose, footerClose] = screen.getAllByRole('button', {
      name: 'Close',
    });
    await userEvent.click(titleClose);
    await userEvent.click(footerClose);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
