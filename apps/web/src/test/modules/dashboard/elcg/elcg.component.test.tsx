import { useEffect, type ReactNode } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NetworkError } from '@ezazi/api-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ElcgComponent,
  ZOOM_LEVELS,
} from '../../../../modules/dashboard/elcg/elcg.component';
import {
  useElcgVisit,
  type ElcgVisitState,
} from '../../../../hooks/queries/useElcgVisit';
import {
  buildDecisionEditor,
  buildElcgView,
} from '../../../fixtures/elcg-view';
import { showToast } from '../../../../services/toast';

/* CLIENT_ID is resolved once at load; a getter lets a test switch client. */
const client = vi.hoisted(() => ({ id: 'default' }));
vi.mock('../../../../config/clients', async importOriginal => ({
  ...(await importOriginal<object>()),
  get CLIENT_ID() {
    return client.id;
  },
}));

/* The visit fetch has its own suite (useElcgVisit.test.tsx). */
vi.mock('../../../../hooks/queries/useElcgVisit', () => ({
  useElcgVisit: vi.fn(),
}));

/* Saving decisions has its own suite (useSaveDecisions.test.tsx). */
const saveDecisions = vi.hoisted(() => ({
  mutate: vi.fn(),
  isPending: false,
}));
vi.mock('../../../../hooks/mutations/useSaveDecisions', () => ({
  useSaveDecisions: () => saveDecisions,
}));

vi.mock('../../../../store/hooks', () => ({
  useAppSelector: (select: (state: unknown) => unknown) =>
    select({ auth: { user: { uuid: 'doctor-1' } } }),
}));

vi.mock('../../../../services/toast', () => ({ showToast: vi.fn() }));

function mockVisit(state: Partial<ElcgVisitState> = {}) {
  vi.mocked(useElcgVisit).mockReturnValue({
    view: buildElcgView(),
    isLoading: false,
    error: null,
    retry: vi.fn(),
    ...state,
  });
}

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

beforeEach(() => {
  mockVisit();
  saveDecisions.mutate.mockReset();
  saveDecisions.isPending = false;
  vi.mocked(showToast).mockReset();
});

afterEach(() => {
  client.id = 'default';
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

  it('loads the visit it is given', () => {
    render(<ElcgComponent visitUuid="visit-42" />);

    expect(useElcgVisit).toHaveBeenCalledWith('visit-42');
  });

  it('says the visit is loading until it arrives', () => {
    mockVisit({ view: null, isLoading: true });

    render(<ElcgComponent visitUuid="visit-1" />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading visit…');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('explains a failed load in plain words and retries it', async () => {
    const retry = vi.fn();
    mockVisit({ view: null, error: new NetworkError(), retry });

    render(<ElcgComponent visitUuid="visit-1" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(
      'Unable to reach the server. Check your internet connection and try again.'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('opens a completed visit on its completion details', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    mockVisit({
      view: buildElcgView({
        completion: {
          reason: { kind: 'referred', referType: 'Referred to higher centre' },
          birth: null,
          hasStage3: false,
        },
      }),
    });

    render(<ElcgComponent visitUuid="visit-1" />);

    expect(screen.getByText('Visit Complete Details')).toBeInTheDocument();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
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

  it('shares a patient with no name or ID under placeholders', async () => {
    const view = buildElcgView();
    mockVisit({
      view: {
        ...view,
        patient: { ...view.patient, name: '', openMrsId: '' },
      },
    });
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<ElcgComponent visitUuid="visit-1" />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Share on WhatsApp' })
    );

    expect(decodeURIComponent(String(open.mock.calls[0][0]))).toContain(
      'Partogram details for Unknown patient (ID: NA).'
    );
  });

  it("titles the guide after Nepal's Labour Care Guide for the Nepal client", () => {
    client.id = 'nepal';

    render(<ElcgComponent visitUuid="visit-1" />);

    expect(
      screen.getByRole('heading', { name: 'Labour Care Guide Nepal' })
    ).toBeInTheDocument();
  });

  describe('Shared Decision Making — Add', () => {
    async function addAssessment(text: string) {
      await userEvent.click(
        screen.getByRole('button', { name: 'Add assessment' })
      );
      await userEvent.type(
        screen.getByPlaceholderText('Enter assessment'),
        text
      );
      await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    }

    it('records a new assessment on the latest encounter, and closes once saved', async () => {
      render(<ElcgComponent visitUuid="visit-1" />);

      await addAssessment('Progressing normally');

      expect(saveDecisions.mutate).toHaveBeenCalledWith(
        {
          kind: 'assessment',
          patientUuid: 'patient-1',
          encounterUuid: 'enc-latest',
          changes: [{ action: 'create', value: 'Progressing normally' }],
        },
        expect.any(Object)
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const [, { onSuccess }] = saveDecisions.mutate.mock.calls[0];
      act(() => onSuccess());
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes and says so when saving fails', async () => {
      render(<ElcgComponent visitUuid="visit-1" />);

      await addAssessment('Raised FHR');
      const [, { onError }] = saveDecisions.mutate.mock.calls[0];
      act(() => onError(new NetworkError()));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(showToast).toHaveBeenCalledWith(
        'Could not save',
        expect.any(String),
        'error'
      );
    });

    it('opens the dialog of each kind', async () => {
      render(<ElcgComponent visitUuid="visit-1" />);

      for (const [button, title] of [
        ['Add plan', 'PLAN'],
        ['Add medication', 'MEDICATION'],
        ['Add oxytocin', 'OXYTOCIN'],
        ['Add iv fluids', 'IV FLUIDS'],
      ]) {
        await userEvent.click(screen.getByRole('button', { name: button }));
        expect(screen.getByRole('dialog', { name: title })).toBeInTheDocument();
        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      }
      expect(saveDecisions.mutate).not.toHaveBeenCalled();
    });

    it('explains that nothing can be added before the first reading', async () => {
      mockVisit({
        view: buildElcgView({
          decisions: buildDecisionEditor({ encounterUuid: null }),
        }),
      });
      render(<ElcgComponent visitUuid="visit-1" />);

      await userEvent.click(
        screen.getByRole('button', { name: 'Add assessment' })
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(showToast).toHaveBeenCalledWith(
        'No reading recorded yet',
        expect.any(String),
        'warning'
      );
    });
  });
});
