import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NetworkError, ServerError } from '@ezazi/api-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardComponent } from '../../../modules/dashboard/dashboard.component';
import { useDashboardVisits } from '../../../hooks/queries/useDashboardVisits';
import {
  buildDashboardVisits,
  buildVisitListState,
  buildVisitRow,
} from '../../fixtures/visit-list';

vi.mock('../../../hooks/queries/useDashboardVisits', () => ({
  useDashboardVisits: vi.fn(),
}));

const PRIORITY_ROW = buildVisitRow({
  uuid: 'visit-pr-1',
  patient: { name: 'Asha Devi', identifier: 'ELCG-1042', gender: 'F', age: 27 },
});
const IN_PROGRESS_ROW = buildVisitRow({
  uuid: 'visit-ip-1',
  patient: {
    name: 'Meena Kumari',
    identifier: 'ELCG-2001',
    gender: 'F',
    age: 30,
  },
});
const COMPLETED_ROW = buildVisitRow({
  uuid: 'visit-co-1',
  patient: {
    name: 'Sunita Rai',
    identifier: 'ELCG-3001',
    gender: 'F',
    age: 25,
  },
});

/* Three loaded sections; the server totals exceed what is loaded, as with real paging. */
function mockLoadedSections() {
  vi.mocked(useDashboardVisits).mockReturnValue(
    buildDashboardVisits({
      priority: buildVisitListState({ rows: [PRIORITY_ROW], totalCount: 4 }),
      'in-progress': buildVisitListState({
        rows: [IN_PROGRESS_ROW],
        totalCount: 7,
      }),
      completed: buildVisitListState({ rows: [COMPLETED_ROW], totalCount: 12 }),
    })
  );
}

beforeEach(() => {
  vi.mocked(useDashboardVisits).mockReset();
  mockLoadedSections();
});

describe('DashboardComponent', () => {
  it("shows each section's server total on its stat chip and header", () => {
    render(<DashboardComponent />);

    expect(screen.getByText('Priority cases (4)')).toBeInTheDocument();
    expect(screen.getByText('In-progress cases (7)')).toBeInTheDocument();
    expect(screen.getByText('Completed cases (12)')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('starts with priority and in-progress expanded, and completed collapsed, matching dashboard.component.html', () => {
    render(<DashboardComponent />);

    expect(screen.getByText('ELCG-1042')).toBeInTheDocument();
    expect(screen.getByText('ELCG-2001')).toBeInTheDocument();
    expect(screen.queryByText('ELCG-3001')).not.toBeInTheDocument();
  });

  it('"Show all" expands every section, including completed', async () => {
    const user = userEvent.setup();
    render(<DashboardComponent />);

    await user.click(screen.getByRole('button', { name: 'Show all' }));

    expect(screen.getByText('ELCG-3001')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Hide all' })
    ).toBeInTheDocument();
  });

  it('collapses just the Priority section on its own header click, leaving In-progress expanded', () => {
    render(<DashboardComponent />);

    fireEvent.click(screen.getByText('Priority cases (4)'));

    expect(screen.queryByText('ELCG-1042')).not.toBeInTheDocument();
    expect(screen.getByText('ELCG-2001')).toBeInTheDocument();
  });

  it('shows a loading message and a dash on the chip while a section loads', () => {
    vi.mocked(useDashboardVisits).mockReturnValue(
      buildDashboardVisits({
        priority: buildVisitListState({ isLoading: true }),
      })
    );

    render(<DashboardComponent />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading cases…');
    expect(screen.getAllByText('–')).toHaveLength(1);
  });

  it('explains a network failure in plain words and retries that section only', async () => {
    const retry = vi.fn();
    vi.mocked(useDashboardVisits).mockReturnValue(
      buildDashboardVisits({
        priority: buildVisitListState({
          error: new NetworkError(),
          retry,
        }),
        'in-progress': buildVisitListState({
          rows: [IN_PROGRESS_ROW],
          totalCount: 1,
        }),
      })
    );

    render(<DashboardComponent />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(
      'Unable to reach the server. Check your internet connection and try again.'
    );
    /* The other section is unaffected by the failure. */
    expect(screen.getByText('ELCG-2001')).toBeInTheDocument();

    await userEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('shows a load-more failure without dropping the rows already loaded', () => {
    vi.mocked(useDashboardVisits).mockReturnValue(
      buildDashboardVisits({
        priority: buildVisitListState({
          rows: [PRIORITY_ROW],
          totalCount: 60,
          hasMore: true,
          loadMoreError: new ServerError('Internal server error'),
        }),
      })
    );

    render(<DashboardComponent />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Next page' })[0]);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'The server ran into a problem. Please try again in a moment.'
    );
    /* The loaded first page is still there when going back. */
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Previous page' })[0]
    );
    expect(screen.getByText('ELCG-1042')).toBeInTheDocument();
  });
});
