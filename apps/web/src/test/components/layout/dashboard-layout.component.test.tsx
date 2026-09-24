import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DashboardLayoutComponent } from '../../../components/layout/dashboard-layout.component';

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
});
