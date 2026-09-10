import { act, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useVerifyOtp } from '../../../hooks/mutations/useVerifyOtp';
import { showToast } from '../../../services/toast';

vi.mock('../../../services/toast', () => ({ showToast: vi.fn() }));

beforeEach(() => {
  vi.mocked(showToast).mockClear();
});
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

describe('useVerifyOtp', () => {
  it('resolves with a mocked userUuid and shows the username-sent toast for forgot-username', async () => {
    const { result } = renderHook(() => useVerifyOtp(), { wrapper });

    act(() =>
      result.current.mutate({
        otp: '123456',
        verificationFor: 'forgot-username',
        via: 'phone',
        value: '9876543210',
      })
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.userUuid).toBe('mock-user-uuid-1234');
    expect(showToast).toHaveBeenCalledWith(
      'Username Sent',
      'Username has been successfully sent on your email and mobile number',
      'success'
    );
  });

  it('does not toast on success for forgot-password (no Angular equivalent toast)', async () => {
    const { result } = renderHook(() => useVerifyOtp(), { wrapper });

    act(() =>
      result.current.mutate({
        otp: '123456',
        verificationFor: 'forgot-password',
        via: 'email',
        value: 'nurse1@example.com',
        username: 'nurse1',
      })
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(showToast).not.toHaveBeenCalled();
  });

  it('rejects with an error toast when the OTP is exactly 000000', async () => {
    const { result } = renderHook(() => useVerifyOtp(), { wrapper });

    act(() =>
      result.current.mutate({
        otp: '000000',
        verificationFor: 'forgot-username',
        via: 'phone',
        value: '9876543210',
      })
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(showToast).toHaveBeenCalledWith('Error', 'Please enter valid otp', 'error');
  });
});
