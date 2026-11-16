import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LcgToolbarComponent } from '../../../components/elcg/lcg-toolbar.component';

function renderToolbar(
  props: Partial<Parameters<typeof LcgToolbarComponent>[0]> = {}
) {
  const handlers = {
    onViewPastDetails: vi.fn(),
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onZoomReset: vi.fn(),
    onShareOnWhatsApp: vi.fn(),
    onPrint: vi.fn(),
  };
  render(
    <LcgToolbarComponent
      pastVisitsCount={2}
      canZoomIn
      canZoomOut
      {...handlers}
      {...props}
    />
  );
  return handlers;
}

describe('LcgToolbarComponent', () => {
  it('runs each action from its button', async () => {
    const handlers = renderToolbar();

    await userEvent.click(
      screen.getByRole('button', { name: 'View Past Details' })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Zoom In [+]' }));
    await userEvent.click(screen.getByRole('button', { name: 'Zoom Out [-]' }));
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Share on WhatsApp' })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Print' }));

    expect(handlers.onViewPastDetails).toHaveBeenCalledTimes(1);
    expect(handlers.onZoomIn).toHaveBeenCalledTimes(1);
    expect(handlers.onZoomOut).toHaveBeenCalledTimes(1);
    expect(handlers.onZoomReset).toHaveBeenCalledTimes(1);
    expect(handlers.onShareOnWhatsApp).toHaveBeenCalledTimes(1);
    expect(handlers.onPrint).toHaveBeenCalledTimes(1);
  });

  it('disables "View Past Details" and says why when there are no past visits', () => {
    renderToolbar({ pastVisitsCount: 0 });

    expect(
      screen.getByRole('button', { name: 'View Past Details' })
    ).toBeDisabled();
    expect(
      screen.getByRole('tooltip', { name: 'No past visits' })
    ).toBeInTheDocument();
  });

  it('disables zooming past either end of the scale', () => {
    renderToolbar({ canZoomIn: false, canZoomOut: false });

    expect(screen.getByRole('button', { name: 'Zoom In [+]' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Zoom Out [-]' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeEnabled();
  });
});
