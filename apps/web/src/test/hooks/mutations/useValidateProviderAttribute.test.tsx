import { act, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { success } from '@ezazi/api-client';
import { useValidateProviderAttribute } from '../../../hooks/mutations/useValidateProviderAttribute';
import { profileService } from '../../../services/profile.service';

vi.mock('../../../services/profile.service', () => ({
  profileService: { validateProviderAttribute: vi.fn() },
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.mocked(profileService.validateProviderAttribute).mockReset();
});

describe('useValidateProviderAttribute', () => {
  it('resolves to true when the value is available', async () => {
    vi.mocked(profileService.validateProviderAttribute).mockResolvedValue(
      success({ success: true, data: true })
    );

    const { result } = renderHook(() => useValidateProviderAttribute(), {
      wrapper,
    });

    act(() => {
      result.current.mutate({
        attributeType: 'emailId',
        attributeValue: 'demo@example.com',
        providerUuid: 'p-1',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(profileService.validateProviderAttribute).toHaveBeenCalledWith({
      attributeType: 'emailId',
      attributeValue: 'demo@example.com',
      providerUuid: 'p-1',
    });
    expect(result.current.data).toBe(true);
  });

  it('resolves to false when the value is already taken', async () => {
    vi.mocked(profileService.validateProviderAttribute).mockResolvedValue(
      success({ success: true, data: false })
    );

    const { result } = renderHook(() => useValidateProviderAttribute(), {
      wrapper,
    });

    act(() => {
      result.current.mutate({
        attributeType: 'phoneNumber',
        attributeValue: '9800000000',
        providerUuid: 'p-1',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(false);
  });

  it('surfaces a service failure as a mutation error', async () => {
    const { ApiError } = await import('@ezazi/api-client');
    vi.mocked(profileService.validateProviderAttribute).mockResolvedValue({
      ok: false,
      error: new ApiError('api', 'mindmap unreachable'),
    });

    const { result } = renderHook(() => useValidateProviderAttribute(), {
      wrapper,
    });

    act(() => {
      result.current.mutate({
        attributeType: 'emailId',
        attributeValue: 'demo@example.com',
        providerUuid: 'p-1',
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('mindmap unreachable');
  });
});
