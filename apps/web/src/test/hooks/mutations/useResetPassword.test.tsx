import { act, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, success } from '@ezazi/api-client';
import { useResetPassword } from '../../../hooks/mutations/useResetPassword';
import { authService } from '../../../services/auth.service';
import { showToast } from '../../../services/toast';

vi.mock('../../../services/auth.service', () => ({
  authService: { resetPassword: vi.fn() },
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

describe('useResetPassword', () => {
  it('POSTs to /auth/resetPassword/:userUuid with newPassword + resetToken and shows a success toast', async () => {
    vi.mocked(authService.resetPassword).mockResolvedValue(
      success({ message: 'Password reset successful.' })
    );
    const { result } = renderHook(() => useResetPassword(), { wrapper });

    act(() =>
      result.current.mutate({ userUuid: 'u-1', newPassword: 'Abcdef1$', resetToken: 'reset-tok' })
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(authService.resetPassword).toHaveBeenCalledWith('u-1', {
      newPassword: 'Abcdef1$',
      resetToken: 'reset-tok',
    });
    expect(showToast).toHaveBeenCalledWith(
      'Password Reset',
      'Your password has been reset successfully.',
      'success'
    );
  });

  it('rejects and shows an error toast on an invalid/expired reset token', async () => {
    vi.mocked(authService.resetPassword).mockResolvedValue({
      ok: false,
      error: new ApiError('api', 'Reset token does not match this account', { status: 401 }),
    });
    const { result } = renderHook(() => useResetPassword(), { wrapper });

    act(() =>
      result.current.mutate({ userUuid: 'u-1', newPassword: 'Abcdef1$', resetToken: 'stale-tok' })
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(showToast).toHaveBeenCalledWith(
      'Error',
      'Reset token does not match this account',
      'error'
    );
  });
});
