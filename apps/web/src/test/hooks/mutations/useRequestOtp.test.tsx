import { act, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, success } from '@ezazi/api-client';
import { useRequestOtp } from '../../../hooks/mutations/useRequestOtp';
import { authService } from '../../../services/auth.service';
import { showToast } from '../../../services/toast';

vi.mock('../../../services/auth.service', () => ({
  authService: { requestOtp: vi.fn() },
}));
vi.mock('../../../services/toast', () => ({ showToast: vi.fn() }));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <>{children}</>
    </QueryClientProvider>
  );
}

describe('useRequestOtp', () => {
  it('POSTs otpFor: "password" plus the phone fields and shows the backend\'s own message on success', async () => {
    vi.mocked(authService.requestOtp).mockResolvedValue(
      success({ message: 'If the account exists, an OTP has been sent.' })
    );
    const { result } = renderHook(() => useRequestOtp(), { wrapper });

    act(() =>
      result.current.mutate({ otpFor: 'password', phoneNumber: '9876543210', countryCode: '91' })
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(authService.requestOtp).toHaveBeenCalledWith({
      otpFor: 'password',
      phoneNumber: '9876543210',
      countryCode: '91',
    });
    expect(showToast).toHaveBeenCalledWith(
      'OTP Sent',
      'If the account exists, an OTP has been sent.',
      'success'
    );
  });

  it('rejects and shows an error toast on a backend validation failure (e.g. the email-tab case)', async () => {
    vi.mocked(authService.requestOtp).mockResolvedValue({
      ok: false,
      error: new ApiError('api', 'phoneNumber must be 4-15 digits', { status: 400 }),
    });
    const { result } = renderHook(() => useRequestOtp(), { wrapper });

    act(() => result.current.mutate({ otpFor: 'password', phoneNumber: 'nurse1@example.com' }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(showToast).toHaveBeenCalledWith(
      'Error',
      'phoneNumber must be 4-15 digits',
      'error'
    );
  });
});
