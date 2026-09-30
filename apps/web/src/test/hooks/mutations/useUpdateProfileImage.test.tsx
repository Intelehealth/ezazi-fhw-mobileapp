import { act, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { success } from '@ezazi/api-client';
import { useUpdateProfileImage } from '../../../hooks/mutations/useUpdateProfileImage';
import { profileService } from '../../../services/profile.service';
import { showToast } from '../../../services/toast';

vi.mock('../../../services/profile.service', () => ({
  profileService: { updateProfileImage: vi.fn() },
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

beforeEach(() => {
  vi.mocked(profileService.updateProfileImage).mockReset();
  vi.mocked(showToast).mockReset();
});

describe('useUpdateProfileImage', () => {
  it('reads the file as base64 (stripping the data-uri prefix) and uploads it', async () => {
    vi.mocked(profileService.updateProfileImage).mockResolvedValue(
      success(undefined)
    );
    const file = new File(['fake-image-bytes'], 'photo.jpg', {
      type: 'image/jpeg',
    });

    const { result } = renderHook(() => useUpdateProfileImage(), { wrapper });

    act(() => {
      result.current.mutate({ personUuid: 'per-1', file });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(profileService.updateProfileImage).toHaveBeenCalledWith({
      person: 'per-1',
      base64EncodedImage: expect.any(String),
    });
    const [[payload]] = vi.mocked(profileService.updateProfileImage).mock.calls;
    expect(payload.base64EncodedImage.startsWith('data:')).toBe(false);
    expect(showToast).toHaveBeenCalledWith(
      'Photo Updated',
      expect.any(String),
      'success'
    );
  });

  it('surfaces an upload failure via the error toast', async () => {
    const { ApiError } = await import('@ezazi/api-client');
    vi.mocked(profileService.updateProfileImage).mockResolvedValue({
      ok: false,
      error: new ApiError('api', 'file too large'),
    });
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });

    const { result } = renderHook(() => useUpdateProfileImage(), { wrapper });

    act(() => {
      result.current.mutate({ personUuid: 'per-1', file });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(showToast).toHaveBeenCalledWith(
      'Upload Failed',
      'file too large',
      'error'
    );
  });

  it('surfaces a FileReader failure via the error toast, without ever calling the service', async () => {
    // jsdom's FileReader has no built-in way to force onerror, so this
    // stubs it directly — readFileAsBase64's own reject(reader.error ?? ...)
    // fallback (services/http.ts has no equivalent; this is the one place
    // in the app that reads a file client-side).
    const originalFileReader = globalThis.FileReader;
    class FailingFileReader {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      error = new DOMException('could not read', 'NotReadableError');
      readAsDataURL() {
        queueMicrotask(() => this.onerror?.());
      }
    }
    globalThis.FileReader = FailingFileReader as unknown as typeof FileReader;

    try {
      const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
      const { result } = renderHook(() => useUpdateProfileImage(), {
        wrapper,
      });

      act(() => {
        result.current.mutate({ personUuid: 'per-1', file });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(profileService.updateProfileImage).not.toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith(
        'Upload Failed',
        'could not read',
        'error'
      );
    } finally {
      globalThis.FileReader = originalFileReader;
    }
  });

  it('falls back to a generic error message when the FileReader reports no error object', async () => {
    // Covers readFileAsBase64's `reader.error ?? new Error(...)` fallback —
    // the test above exercises the left side (a real DOMException), this one
    // exercises the right side (reader.error itself falsy).
    const originalFileReader = globalThis.FileReader;
    class FailingFileReaderWithNoError {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      error = null;
      readAsDataURL() {
        queueMicrotask(() => this.onerror?.());
      }
    }
    globalThis.FileReader =
      FailingFileReaderWithNoError as unknown as typeof FileReader;

    try {
      const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
      const { result } = renderHook(() => useUpdateProfileImage(), {
        wrapper,
      });

      act(() => {
        result.current.mutate({ personUuid: 'per-1', file });
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(showToast).toHaveBeenCalledWith(
        'Upload Failed',
        'Could not read the selected file.',
        'error'
      );
    } finally {
      globalThis.FileReader = originalFileReader;
    }
  });
});
