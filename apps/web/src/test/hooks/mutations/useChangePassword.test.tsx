import { act, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, success } from '@ezazi/api-client';
import { useChangePassword } from '../../../hooks/mutations/useChangePassword';
import { profileService } from '../../../services/profile.service';
import { showToast } from '../../../services/toast';

vi.mock('../../../services/profile.service', () => ({
  profileService: { changePassword: vi.fn() },
}));

vi.mock('../../../services/toast', () => ({ showToast: vi.fn() }));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const VARS = { oldPassword: 'Old@1234', newPassword: 'New@1234' };

beforeEach(() => {
  vi.mocked(profileService.changePassword).mockReset();
  vi.mocked(showToast).mockReset();
});

describe('useChangePassword', () => {
  it('sends the old and new password and shows the success toast', async () => {
    vi.mocked(profileService.changePassword).mockResolvedValue(
      success(undefined)
    );

    const { result } = renderHook(() => useChangePassword(), { wrapper });
    act(() => {
      result.current.mutate(VARS);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(profileService.changePassword).toHaveBeenCalledWith(
      'Old@1234',
      'New@1234'
    );
    expect(showToast).toHaveBeenCalledWith(
      'Password Changed!',
      'Password has been changed successfully! Please log in again.',
      'success'
    );
  });

  it("shows the server's message when the change is rejected, e.g. a wrong old password", async () => {
    vi.mocked(profileService.changePassword).mockResolvedValue({
      ok: false,
      error: new ApiError('api', 'Old password is incorrect', { status: 400 }),
    });

    const { result } = renderHook(() => useChangePassword(), { wrapper });
    act(() => {
      result.current.mutate(VARS);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(showToast).toHaveBeenCalledWith(
      'Password Change Failed',
      'Old password is incorrect',
      'error'
    );
  });

  it('shows a friendly message instead of OpenMRS\'s literal "[null]"', async () => {
    vi.mocked(profileService.changePassword).mockResolvedValue({
      ok: false,
      error: new ApiError('server', '[null]', { status: 500 }),
    });

    const { result } = renderHook(() => useChangePassword(), { wrapper });
    act(() => {
      result.current.mutate(VARS);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(showToast).toHaveBeenCalledWith(
      'Password Change Failed',
      'Could not change your password. Please try again.',
      'error'
    );
  });

  it.each([401, 403])(
    'explains that the OpenMRS session timed out on a %s, rather than blaming the password',
    async status => {
      vi.mocked(profileService.changePassword).mockResolvedValue({
        ok: false,
        error: new ApiError('unauthorized', 'Privileges required', { status }),
      });

      const { result } = renderHook(() => useChangePassword(), { wrapper });
      act(() => {
        result.current.mutate(VARS);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(showToast).toHaveBeenCalledWith(
        'Password Change Failed',
        'Your OpenMRS session has timed out. Please log out and log in again, then retry.',
        'error'
      );
    }
  );

  it('still reports other failures with their own message', async () => {
    vi.mocked(profileService.changePassword).mockResolvedValue({
      ok: false,
      error: new ApiError('api', 'Old password is incorrect', { status: 400 }),
    });

    const { result } = renderHook(() => useChangePassword(), { wrapper });
    act(() => {
      result.current.mutate(VARS);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(showToast).toHaveBeenCalledWith(
      'Password Change Failed',
      'Old password is incorrect',
      'error'
    );
  });

  it('handles an error that is not an ApiError', async () => {
    vi.mocked(profileService.changePassword).mockRejectedValue(
      new Error('boom')
    );

    const { result } = renderHook(() => useChangePassword(), { wrapper });
    act(() => {
      result.current.mutate(VARS);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(showToast).toHaveBeenCalledWith(
      'Password Change Failed',
      'boom',
      'error'
    );
  });
});
