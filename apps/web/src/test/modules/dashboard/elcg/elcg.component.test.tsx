import { useEffect, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ElcgComponent,
  ZOOM_LEVELS,
} from '../../../../modules/dashboard/elcg/elcg.component';

/*
 * jsdom drops the CSS `zoom` property, so the viewport is stubbed to expose
 * the zoom factor it is given, and to count its mounts (Reset remounts it to
 * drop the pan); its own suite covers panning.
 */
const viewportMounts = vi.hoisted(() => ({ count: 0 }));
vi.mock('../../../../components/elcg/lcg-viewport.component', () => ({
  LcgViewportComponent: ({
    zoom,
    children,
  }: {
    zoom: number;
    children: ReactNode;
  }) => {
    useEffect(() => {
      viewportMounts.count += 1;
    }, []);
    return (
      <div data-testid="lcg-viewport" data-zoom={zoom}>
        {children}
      </div>
    );
  },
}));

function currentZoom(): number {
  return Number(screen.getByTestId('lcg-viewport').dataset.zoom);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ElcgComponent', () => {
  it('renders the guide, the decision history and the call controls', () => {
    render(<ElcgComponent visitUuid="visit-1" />);

    expect(
      screen.getByRole('heading', { name: 'WHO LABOUR CARE GUIDE VIEW' })
    ).toBeInTheDocument();
    expect(screen.getByText('SHARED DECISION MAKING')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Start video call' })
    ).toBeInTheDocument();
  });

  it('zooms in and out one step at a time, and resets to actual size', async () => {
    const user = userEvent.setup();
    render(<ElcgComponent visitUuid="visit-1" />);
    expect(currentZoom()).toBe(ZOOM_LEVELS[2]);

    await user.click(screen.getByRole('button', { name: 'Zoom In [+]' }));
    expect(currentZoom()).toBe(ZOOM_LEVELS[3]);

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    await user.click(screen.getByRole('button', { name: 'Zoom Out [-]' }));
    expect(currentZoom()).toBe(ZOOM_LEVELS[1]);
  });

  it("resets the guide's pan along with the zoom", async () => {
    const user = userEvent.setup();
    render(<ElcgComponent visitUuid="visit-1" />);
    const mountsBefore = viewportMounts.count;

    await user.click(screen.getByRole('button', { name: 'Zoom In [+]' }));
    expect(viewportMounts.count).toBe(mountsBefore);

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(viewportMounts.count).toBe(mountsBefore + 1);
  });

  it('stops zooming in at the largest step', async () => {
    const user = userEvent.setup();
    render(<ElcgComponent visitUuid="visit-1" />);
    const zoomIn = screen.getByRole('button', { name: 'Zoom In [+]' });

    await user.click(zoomIn);
    await user.click(zoomIn);

    expect(zoomIn).toBeDisabled();
    expect(currentZoom()).toBe(ZOOM_LEVELS[4]);
  });

  it('shares the patient and a link to this page on WhatsApp', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<ElcgComponent visitUuid="visit-1" />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Share on WhatsApp' })
    );

    const [url, target] = open.mock.calls[0];
    expect(target).toBe('_blank');
    expect(decodeURIComponent(String(url))).toBe(
      `https://wa.me/?text=Partogram details for Asha Devi (ID: ELCG-1042).\n${window.location.href}`
    );
  });
});
