import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import VerificationMethodPage from '../../../../pages/auth/verification-method/verification-method.page';

describe('VerificationMethodPage', () => {
  it('renders the real verification-method module through a router carrying its required route state', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={[
            { pathname: '/auth/verification-method', state: { username: 'nurse1' } },
          ]}
        >
          <VerificationMethodPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(
      screen.getByRole('heading', { name: 'Choose verification method' })
    ).toBeInTheDocument();
  });
});
