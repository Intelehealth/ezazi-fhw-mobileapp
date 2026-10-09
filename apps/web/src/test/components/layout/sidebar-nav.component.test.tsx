import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useIsNurse } from '../../../hooks/useIsNurse';
import { SidebarNavComponent } from '../../../components/layout/sidebar-nav.component';

function renderSidebar(pathname = '/dashboard', collapsed = false) {
  const onToggleCollapsed = vi.fn();
  const onLogout = vi.fn();
  const utils = render(
    <MemoryRouter initialEntries={[pathname]}>
      <SidebarNavComponent
        collapsed={collapsed}
        onToggleCollapsed={onToggleCollapsed}
        onLogout={onLogout}
      />
    </MemoryRouter>
  );
  return { ...utils, onToggleCollapsed, onLogout };
}

/*
 * Mocked rather than a real react-redux Provider — same dual-React-hoisting
 * reason as dashboard.page.test.tsx.
 */
vi.mock('../../../hooks/useIsNurse', () => ({ useIsNurse: vi.fn() }));

beforeEach(() => {
  vi.mocked(useIsNurse).mockReturnValue(false);
});

describe('SidebarNavComponent', () => {
  it('renders every nav item plus Log-out', () => {
    renderSidebar();

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('My Profile')).toBeInTheDocument();
    expect(screen.getByText('Change Password')).toBeInTheDocument();
    expect(screen.getByText('Help')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log-out' })).toBeInTheDocument();
  });

  it('shows nurses only My Profile (to hw-profile) and Change Password', () => {
    vi.mocked(useIsNurse).mockReturnValue(true);
    renderSidebar('/dashboard/hw-profile');

    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Help')).not.toBeInTheDocument();
    expect(screen.getByText('Change Password')).toBeInTheDocument();
    expect(screen.getByText('My Profile').closest('a')).toHaveAttribute(
      'href',
      '/dashboard/hw-profile'
    );
    expect(screen.getByRole('button', { name: 'Log-out' })).toBeInTheDocument();
  });

  it('highlights the nav item matching the current route', () => {
    renderSidebar('/dashboard');

    const dashboardLink = screen.getByText('Dashboard').closest('a');
    const profileLink = screen.getByText('My Profile').closest('a');
    // `hover:bg-[#4B39B7]` (present on every row) also contains the bare
    // "bg-[#4B39B7]" substring, so this checks for the *unprefixed* active
    // class specifically, not just any occurrence of the color.
    expect(dashboardLink?.className.split(' ')).toContain('bg-[#4B39B7]');
    expect(profileLink?.className.split(' ')).not.toContain('bg-[#4B39B7]');
  });

  it('calls onToggleCollapsed when the collapse arrow is clicked', () => {
    const { onToggleCollapsed } = renderSidebar();

    fireEvent.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(onToggleCollapsed).toHaveBeenCalledTimes(1);
  });

  it('calls onLogout when the Log-out row is clicked', () => {
    const { onLogout } = renderSidebar();

    fireEvent.click(screen.getByRole('button', { name: 'Log-out' }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('swaps to the small logo and an "Expand sidebar" label when collapsed', () => {
    renderSidebar('/dashboard', true);

    expect(
      screen.getByRole('button', { name: 'Expand sidebar' })
    ).toBeInTheDocument();
    expect(screen.queryByText('My Profile')).not.toBeInTheDocument();
  });
});
