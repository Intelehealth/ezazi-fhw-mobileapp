import { act, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useRequestOtp } from '../../../hooks/mutations/useRequestOtp';
import { showToast } from '../../../services/toast';

vi.mock('../../../services/toast', () => ({ showToast: vi.fn() }));
vi.mock('../../../hooks/mutations/mock-utils', async () => {
  const actual = await vi.importActual<
    typeof import('../../../hooks/mutations/mock-utils')
  >('../../../hooks/mutations/mock-utils');
  return { ...actual, simulateNetworkDelay: vi.fn().mockResolvedValue(undefined) };
});

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
  it('shows a masked success toast on success', async () => {
    const { result } = renderHook(() => useRequestOtp(), { wrapper });

    act(() =>
      result.current.mutate({ otpFor: 'username', via: 'phone', value: '9876543210' })
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(showToast).toHaveBeenCalledWith(
      'OTP Sent',
      'OTP sent on 98765*****10 successfully!',
      'success'
    );
  });

  it('rejects and shows an error toast when the value contains "fail"', async () => {
    const { result } = renderHook(() => useRequestOtp(), { wrapper });

    act(() =>
      result.current.mutate({ otpFor: 'password', username: 'nurse1', via: 'email', value: 'fail@example.com' })
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(showToast).toHaveBeenCalledWith(
      'Error',
      "Couldn't send OTP, please try again.",
      'error'
    );
  });
});
