import { act, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, success } from '@ezazi/api-client';
import { useProviderAttributeAvailability } from '../../hooks/useProviderAttributeAvailability';
import { profileService } from '../../services/profile.service';
import { showToast } from '../../services/toast';

vi.mock('../../services/profile.service', () => ({
  profileService: { validateProviderAttribute: vi.fn() },
}));

vi.mock('../../services/toast', () => ({ showToast: vi.fn() }));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function renderAvailability(current: Record<string, string>) {
  return renderHook(
    () =>
      useProviderAttributeAvailability('p-1', field => current[field] ?? ''),
    { wrapper }
  );
}

beforeEach(() => {
  vi.mocked(profileService.validateProviderAttribute).mockReset();
  vi.mocked(showToast).mockReset();
});

describe('useProviderAttributeAvailability', () => {
  it('flags a value the server says is already taken, then clears the flag on request', async () => {
    vi.mocked(profileService.validateProviderAttribute).mockResolvedValue(
      success({ success: true, data: false })
    );
    const { result } = renderAvailability({ emailId: 'taken@example.com' });

    await act(async () => {
      await result.current.checkAvailability('emailId', 'taken@example.com');
    });

    expect(profileService.validateProviderAttribute).toHaveBeenCalledWith({
      attributeType: 'emailId',
      attributeValue: 'taken@example.com',
      providerUuid: 'p-1',
    });
    expect(result.current.emailTaken).toBe(true);
    expect(result.current.phoneTaken).toBe(false);

    act(() => result.current.clearTaken('emailId'));
    expect(result.current.emailTaken).toBe(false);
  });

  it('tracks the phone number separately from the email', async () => {
    vi.mocked(profileService.validateProviderAttribute).mockResolvedValue(
      success({ success: true, data: false })
    );
    const { result } = renderAvailability({ phoneNumber: '9111111111' });

    await act(async () => {
      await result.current.checkAvailability('phoneNumber', '9111111111');
    });

    expect(result.current.phoneTaken).toBe(true);
    expect(result.current.emailTaken).toBe(false);
  });

  it('leaves a value that is available unflagged', async () => {
    vi.mocked(profileService.validateProviderAttribute).mockResolvedValue(
      success({ success: true, data: true })
    );
    const { result } = renderAvailability({ emailId: 'free@example.com' });

    await act(async () => {
      await result.current.checkAvailability('emailId', 'free@example.com');
    });

    expect(result.current.emailTaken).toBe(false);
  });

  it('does not call the server for a blank value', async () => {
    const { result } = renderAvailability({});

    await act(async () => {
      await result.current.checkAvailability('emailId', '   ');
    });

    expect(profileService.validateProviderAttribute).not.toHaveBeenCalled();
  });

  it('shows an error toast instead of throwing when the check fails, leaving the field unflagged', async () => {
    vi.mocked(profileService.validateProviderAttribute).mockResolvedValue({
      ok: false,
      error: new ApiError('network', 'gateway unreachable'),
    });
    const { result } = renderAvailability({ emailId: 'a@example.com' });

    await act(async () => {
      await result.current.checkAvailability('emailId', 'a@example.com');
    });

    expect(showToast).toHaveBeenCalledWith(
      'Availability Check Failed',
      'gateway unreachable',
      'error'
    );
    expect(result.current.emailTaken).toBe(false);
  });

  it('drops a slow result when the field has since changed to a different value', async () => {
    vi.mocked(profileService.validateProviderAttribute).mockResolvedValue(
      success({ success: true, data: false })
    );
    /* The user retyped the field while the check for the old value was in flight. */
    const current = { emailId: 'newer@example.com' };
    const { result } = renderAvailability(current);

    await act(async () => {
      await result.current.checkAvailability('emailId', 'older@example.com');
    });

    await waitFor(() =>
      expect(profileService.validateProviderAttribute).toHaveBeenCalled()
    );
    expect(result.current.emailTaken).toBe(false);
  });
});
