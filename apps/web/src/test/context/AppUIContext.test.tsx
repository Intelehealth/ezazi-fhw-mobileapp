import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AppUIProvider, useAppUIContext } from '../../context/AppUIContext';

function SidebarConsumer() {
  const { isSidebarOpen, toggleSidebar } = useAppUIContext();
  return (
    <button onClick={toggleSidebar}>{isSidebarOpen ? 'open' : 'closed'}</button>
  );
}

describe('AppUIContext', () => {
  it('defaults the sidebar to open and toggles it on demand', async () => {
    render(
      <AppUIProvider>
        <SidebarConsumer />
      </AppUIProvider>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('open');

    await userEvent.click(button);
    expect(button).toHaveTextContent('closed');

    await userEvent.click(button);
    expect(button).toHaveTextContent('open');
  });

  it('throws when used outside an AppUIProvider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<SidebarConsumer />)).toThrow(
      'useAppUIContext must be used within AppUIProvider'
    );
  });
});
