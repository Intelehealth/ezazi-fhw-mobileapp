import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import OtpVerificationPage from '../../../../pages/auth/otp-verification/otp-verification.page';

describe('OtpVerificationPage', () => {
  it('renders the real otp-verification module through a router carrying its required route state', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={[
            {
              pathname: '/auth/otp-verification',
              state: { verifyFor: 'password', phoneNumber: '9876543210', countryCode: '91' },
            },
          ]}
        >
          <OtpVerificationPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(
      screen.getByRole('heading', { name: 'OTP verification' })
    ).toBeInTheDocument();
  });
});
