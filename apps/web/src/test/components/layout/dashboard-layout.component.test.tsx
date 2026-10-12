import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useIsNurse } from '../../../hooks/useIsNurse';
import { DashboardLayoutComponent } from '../../../components/layout/dashboard-layout.component';

/*
 * Mocked rather than a real react-redux Provider — same dual-React-hoisting
 * reason as dashboard.page.test.tsx.
 */
/*
 * The real search box needs a QueryClient and has its own suite
 * (patient-search.component.test.tsx); this file only cares that the header
 * hosts it.
 */
vi.mock('../../../components/layout/patient-search.component', () => ({
  PatientSearchComponent: () => (
    <input placeholder="Search by patient name or ID" />
  ),
}));

vi.mock('../../../hooks/useIsNurse', () => ({ useIsNurse: vi.fn() }));

beforeEach(() => {
  vi.mocked(useIsNurse).mockReturnValue(false);
});

describe('DashboardLayoutComponent', () => {
  it('renders the header greeting, sidebar nav and children content together', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <DashboardLayoutComponent userName="Demo Doctor" onLogout={vi.fn()}>
          <p>dashboard content</p>
        </DashboardLayoutComponent>
      </MemoryRouter>
    );

    expect(screen.getByText('Hello, Demo Doctor 👋')).toBeInTheDocument();
    expect(screen.getByText('My Profile')).toBeInTheDocument();
    expect(screen.getByText('dashboard content')).toBeInTheDocument();
  });

  it('calls onLogout when the sidebar Log-out row is clicked', () => {
    const onLogout = vi.fn();
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <DashboardLayoutComponent userName="Demo Doctor" onLogout={onLogout}>
          <p>dashboard content</p>
        </DashboardLayoutComponent>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Log-out' }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('collapses the sidebar when its own toggle button is clicked', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <DashboardLayoutComponent userName="Demo Doctor" onLogout={vi.fn()}>
          <p>dashboard content</p>
        </DashboardLayoutComponent>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));

    expect(
      screen.getByRole('button', { name: 'Expand sidebar' })
    ).toBeInTheDocument();
    expect(screen.queryByText('My Profile')).not.toBeInTheDocument();
  });
});
