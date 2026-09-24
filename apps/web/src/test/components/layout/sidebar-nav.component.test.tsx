import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { SidebarNavComponent } from '../../../components/layout/sidebar-nav.component';

function renderSidebar(pathname = '/dashboard') {
  const onToggleCollapsed = vi.fn();
  const onLogout = vi.fn();
  const utils = render(
    <MemoryRouter initialEntries={[pathname]}>
      <SidebarNavComponent
        collapsed={false}
        onToggleCollapsed={onToggleCollapsed}
        onLogout={onLogout}
      />
    </MemoryRouter>
  );
  return { ...utils, onToggleCollapsed, onLogout };
}

describe('SidebarNavComponent', () => {
  it('renders every nav item plus Log-out', () => {
    renderSidebar();

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('My Profile')).toBeInTheDocument();
    expect(screen.getByText('Change Password')).toBeInTheDocument();
    expect(screen.getByText('Help')).toBeInTheDocument();
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
});
