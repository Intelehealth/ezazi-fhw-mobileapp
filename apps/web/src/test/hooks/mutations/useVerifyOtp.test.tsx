import { act, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, success } from '@ezazi/api-client';
import { useVerifyOtp } from '../../../hooks/mutations/useVerifyOtp';
import { authService } from '../../../services/auth.service';
import { showToast } from '../../../services/toast';

vi.mock('../../../services/auth.service', () => ({
  authService: { verifyOtp: vi.fn() },
}));
vi.mock('../../../services/toast', () => ({ showToast: vi.fn() }));

beforeEach(() => {
  vi.mocked(showToast).mockClear();
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
  it('POSTs verifyFor: "password" plus the phone fields and resolves with userUuid + resetToken', async () => {
    vi.mocked(authService.verifyOtp).mockResolvedValue(
      success({ verified: true, userUuid: 'u-1', resetToken: 'reset-tok', expiresIn: 300 })
    );
    const { result } = renderHook(() => useVerifyOtp(), { wrapper });

    act(() =>
      result.current.mutate({ verifyFor: 'password', phoneNumber: '9876543210', countryCode: '91', otp: '123456' })
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(authService.verifyOtp).toHaveBeenCalledWith({
      verifyFor: 'password',
      phoneNumber: '9876543210',
      countryCode: '91',
      otp: '123456',
    });
    expect(result.current.data?.userUuid).toBe('u-1');
    expect(result.current.data?.resetToken).toBe('reset-tok');
    expect(showToast).not.toHaveBeenCalled();
  });

  it('rejects with an error toast on an invalid/expired code', async () => {
    vi.mocked(authService.verifyOtp).mockResolvedValue({
      ok: false,
      error: new ApiError('api', 'Invalid or expired code', { status: 401 }),
    });
    const { result } = renderHook(() => useVerifyOtp(), { wrapper });

    act(() =>
      result.current.mutate({ verifyFor: 'password', phoneNumber: '9876543210', countryCode: '91', otp: '000000' })
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(showToast).toHaveBeenCalledWith('Error', 'Invalid or expired code', 'error');
  });
});
