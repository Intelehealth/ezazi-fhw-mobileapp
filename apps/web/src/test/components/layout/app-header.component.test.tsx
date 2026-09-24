import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppHeaderComponent } from '../../../components/layout/app-header.component';

describe('AppHeaderComponent', () => {
  it('greets the user by name', () => {
    render(
      <AppHeaderComponent userName="Demo Doctor" onToggleSidebar={vi.fn()} />
    );

    expect(screen.getByText('Hello, Demo Doctor 👋')).toBeInTheDocument();
  });

  it('calls onToggleSidebar when the hamburger button is clicked', () => {
    const onToggleSidebar = vi.fn();
    render(
      <AppHeaderComponent
        userName="Demo Doctor"
        onToggleSidebar={onToggleSidebar}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Toggle sidebar' }));
    expect(onToggleSidebar).toHaveBeenCalledTimes(1);
  });

  it('renders the patient search box', () => {
    render(
      <AppHeaderComponent userName="Demo Doctor" onToggleSidebar={vi.fn()} />
    );

    expect(
      screen.getByPlaceholderText('Search by patient name or ID')
    ).toBeInTheDocument();
  });
});
