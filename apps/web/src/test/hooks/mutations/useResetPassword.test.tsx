import { act, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useResetPassword } from '../../../hooks/mutations/useResetPassword';
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

describe('useResetPassword', () => {
  it('shows a success toast on success', async () => {
    const { result } = renderHook(() => useResetPassword(), { wrapper });

    act(() => result.current.mutate({ userUuid: 'u-1', password: 'Abcdef1$' }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(showToast).toHaveBeenCalledWith(
      'Password Reset',
      'Your password has been reset successfully.',
      'success'
    );
  });

  it('rejects and shows an error toast when the password contains "fail"', async () => {
    const { result } = renderHook(() => useResetPassword(), { wrapper });

    act(() => result.current.mutate({ userUuid: 'u-1', password: 'Failpass1$' }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(showToast).toHaveBeenCalledWith(
      'Error',
      'Something went wrong, please try again.',
      'error'
    );
  });
});
