import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  DecisionNotes,
  ValueItemComponent,
} from '../../../components/elcg/lcg-cells.component';
import { LcgToolbarComponent } from '../../../components/elcg/lcg-toolbar.component';
import { SharedDecisionMakingComponent } from '../../../components/elcg/shared-decision-making.component';
import { VisitCompleteDetailsComponent } from '../../../components/elcg/visit-complete-details.component';
import { WebrtcControlsComponent } from '../../../components/elcg/webrtc-controls.component';
import type { LcgDecisionHistory } from '../../../modules/dashboard/elcg/elcg.types';

const NO_HISTORY: LcgDecisionHistory = {
  assessment: [],
  plan: [],
  medication: [],
  oxytocin: [],
  ivFluids: [],
};

/** A disabled control, and the "Coming soon" tooltip on the wrapper around it. */
function expectComingSoon(button: HTMLElement) {
  expect(button).toBeDisabled();
  expect(button.parentElement).toHaveTextContent('Coming soon');
}

describe('controls whose screen is not ported yet', () => {
  it('disables Print and View Past Details without a handler, even with past visits', () => {
    render(
      <LcgToolbarComponent
        pastVisitsCount={3}
        canZoomIn
        canZoomOut
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onZoomReset={vi.fn()}
        onShareOnWhatsApp={vi.fn()}
      />
    );

    expectComingSoon(screen.getByRole('button', { name: 'View Past Details' }));
    expectComingSoon(screen.getByRole('button', { name: 'Print' }));
    /* What works stays enabled. */
    expect(screen.getByRole('button', { name: 'Zoom In [+]' })).toBeEnabled();
  });

  it('disables video call and chat without a handler', () => {
    render(<WebrtcControlsComponent />);

    expectComingSoon(screen.getByRole('button', { name: 'Start video call' }));
    expectComingSoon(screen.getByRole('button', { name: 'Start chat' }));
  });

  it('enables video call once it is given a handler', async () => {
    const onStartCall = vi.fn();
    render(<WebrtcControlsComponent onStartCall={onStartCall} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Start video call' })
    );
    expect(onStartCall).toHaveBeenCalledTimes(1);
  });

  it('disables the Shared Decision Making "Add" buttons without a handler', () => {
    render(<SharedDecisionMakingComponent history={NO_HISTORY} canAdd />);

    for (const name of [
      'Add assessment',
      'Add plan',
      'Add medication',
      'Add oxytocin',
      'Add iv fluids',
    ]) {
      expectComingSoon(screen.getByRole('button', { name }));
    }
  });

  it("disables an hour's open-in-new button without a handler", () => {
    render(<DecisionNotes entries={[]} viewLabel="View stage 1 hour 1" />);

    expectComingSoon(
      screen.getByRole('button', { name: 'View stage 1 hour 1' })
    );
  });

  it('disables View Stage 3 without a handler', () => {
    render(
      <VisitCompleteDetailsComponent
        completion={{
          reason: { kind: 'out-of-time', reason: 'Shift ended' },
          birth: null,
          hasStage3: true,
        }}
      />
    );

    expectComingSoon(screen.getByRole('button', { name: 'View Stage 3' }));
  });
});

describe('Shared Decision Making header keys', () => {
  it('toggles its panel on Enter / Space, without scrolling the page', () => {
    render(<SharedDecisionMakingComponent history={NO_HISTORY} canAdd />);
    const header = screen.getAllByRole('button', { expanded: false })[0];

    fireEvent.keyDown(header, { key: 'Enter' });
    expect(header).toHaveAttribute('aria-expanded', 'true');

    const space = fireEvent.keyDown(header, { key: ' ' });
    expect(header).toHaveAttribute('aria-expanded', 'false');
    /* fireEvent returns false once preventDefault() was called. */
    expect(space).toBe(false);
  });

  it('leaves its panel alone when the keys are pressed on its "Add" button', async () => {
    const onAdd = vi.fn();
    render(
      <SharedDecisionMakingComponent
        history={NO_HISTORY}
        canAdd
        onAdd={onAdd}
      />
    );
    const add = screen.getByRole('button', { name: 'Add assessment' });

    add.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');

    expect(onAdd).toHaveBeenCalledTimes(2);
    expect(screen.queryAllByRole('button', { expanded: true }).length).toBe(0);
  });
});

describe('alert readings', () => {
  it('say which alert they are, not only by colour', () => {
    render(
      <>
        <ValueItemComponent reading={{ value: '160', alert: 'R' }} />
        <ValueItemComponent reading={{ value: '110', alert: 'Y' }} />
        <ValueItemComponent reading={{ value: '140', alert: null }} />
      </>
    );

    expect(screen.getByText('160')).toHaveTextContent('160 (Red alert)');
    expect(screen.getByText('110')).toHaveTextContent('110 (Yellow alert)');
    expect(screen.getByText('140')).toHaveTextContent(/^140$/);
  });
});
