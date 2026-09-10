import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import SetupNewPasswordPage from '../../../../pages/auth/setup-new-password/setup-new-password.page';

describe('SetupNewPasswordPage', () => {
  it('renders the real setup-new-password module through a router carrying its required route state', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={[
            {
              pathname: '/auth/setup-new-password',
              state: { username: 'nurse1', userUuid: 'u-1' },
            },
          ]}
        >
          <SetupNewPasswordPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(
      screen.getByRole('heading', { name: 'Set new password' })
    ).toBeInTheDocument();
  });
});
