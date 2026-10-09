import { act, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { success } from '@ezazi/api-client';
import { useUpdateProfileImage } from '../../../hooks/mutations/useUpdateProfileImage';
import { profileService } from '../../../services/profile.service';
import { showToast } from '../../../services/toast';
import type { ProviderProfileData } from '../../../hooks/queries/useProviderProfile';

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

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
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

  describe('downscaling', () => {
    /* base64 of the bytes "tiny" — what the stubbed canvas hands back. */
    const TINY_BASE64 = 'dGlueQ==';
    const BIG_FILE = new File(['x'.repeat(5000)], 'photo.jpg', {
      type: 'image/jpeg',
    });

    function stubDecodedImage(width: number, height: number) {
      const close = vi.fn();
      vi.stubGlobal(
        'createImageBitmap',
        vi.fn().mockResolvedValue({ width, height, close })
      );
      return close;
    }

    function stubCanvas({
      context = { drawImage: vi.fn() } as object | null,
      blob = new Blob(['tiny'], { type: 'image/jpeg' }) as Blob | null,
    } = {}) {
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
        context as unknown as CanvasRenderingContext2D
      );
      vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
        callback => callback(blob)
      );
      return context as { drawImage: ReturnType<typeof vi.fn> } | null;
    }

    async function upload(file: File) {
      vi.mocked(profileService.updateProfileImage).mockResolvedValue(
        success(undefined)
      );
      const { result } = renderHook(() => useUpdateProfileImage(), {
        wrapper,
      });
      act(() => {
        result.current.mutate({ personUuid: 'per-1', file });
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const [[payload]] = vi.mocked(profileService.updateProfileImage).mock
        .calls;
      return payload.base64EncodedImage;
    }

    it('scales a large photo down to 512px on its longest side and uploads the smaller JPEG', async () => {
      const close = stubDecodedImage(2000, 1000);
      const context = stubCanvas();

      const uploaded = await upload(BIG_FILE);

      expect(context?.drawImage).toHaveBeenCalledWith(
        expect.objectContaining({ width: 2000 }),
        0,
        0,
        512,
        256
      );
      expect(close).toHaveBeenCalled();
      expect(uploaded).toBe(TINY_BASE64);
    });

    it('keeps the original dimensions of an image already under 512px', async () => {
      stubDecodedImage(200, 100);
      const context = stubCanvas();

      await upload(BIG_FILE);

      expect(context?.drawImage).toHaveBeenCalledWith(
        expect.anything(),
        0,
        0,
        200,
        100
      );
    });

    it('uploads the original file when the canvas has no 2d context', async () => {
      stubDecodedImage(2000, 1000);
      stubCanvas({ context: null });

      const uploaded = await upload(BIG_FILE);

      expect(uploaded).not.toBe(TINY_BASE64);
      expect(uploaded.length).toBeGreaterThan(TINY_BASE64.length);
    });

    it('uploads the original file when the canvas cannot produce a blob', async () => {
      stubDecodedImage(2000, 1000);
      stubCanvas({ blob: null });

      const uploaded = await upload(BIG_FILE);

      expect(uploaded).not.toBe(TINY_BASE64);
    });

    it('uploads the original file when re-encoding would not make it smaller', async () => {
      stubDecodedImage(2000, 1000);
      stubCanvas({
        blob: new Blob(['y'.repeat(9000)], { type: 'image/jpeg' }),
      });

      const uploaded = await upload(BIG_FILE);

      expect(uploaded).not.toBe(TINY_BASE64);
      expect(atob(uploaded)).toBe('x'.repeat(5000));
    });

    it('uploads the original file when the browser cannot decode the image', async () => {
      vi.stubGlobal(
        'createImageBitmap',
        vi.fn().mockRejectedValue(new Error())
      );

      const uploaded = await upload(BIG_FILE);

      expect(atob(uploaded)).toBe('x'.repeat(5000));
    });
  });

  describe('shared profile cache', () => {
    const CACHED = {
      profile: { givenName: 'Demo', photoUrl: '/old/personimage/per-1' },
    } as unknown as ProviderProfileData;

    function renderWithClient(queryClient: QueryClient) {
      return renderHook(() => useUpdateProfileImage(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        ),
      });
    }

    it('shows the uploaded image straight away by writing it into the cached profile', async () => {
      vi.mocked(profileService.updateProfileImage).mockResolvedValue(
        success(undefined)
      );
      const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
      });
      queryClient.setQueryData(['provider-profile', 'u-1'], CACHED);
      const { result } = renderWithClient(queryClient);

      act(() => {
        result.current.mutate({
          personUuid: 'per-1',
          file: new File(['fake'], 'photo.jpg', { type: 'image/jpeg' }),
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      const updated = queryClient.getQueryData<ProviderProfileData>([
        'provider-profile',
        'u-1',
      ]);
      expect(updated?.profile.photoUrl).toBe(result.current.data);
      expect(updated?.profile.photoUrl).toMatch(/^data:/);
      expect(updated?.profile.givenName).toBe('Demo');
    });

    it('leaves the cache empty when no profile was loaded yet', async () => {
      vi.mocked(profileService.updateProfileImage).mockResolvedValue(
        success(undefined)
      );
      const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
      });
      const { result } = renderWithClient(queryClient);

      act(() => {
        result.current.mutate({
          personUuid: 'per-1',
          file: new File(['fake'], 'photo.jpg', { type: 'image/jpeg' }),
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(
        queryClient.getQueryData(['provider-profile', 'u-1'])
      ).toBeUndefined();
    });
  });
});
