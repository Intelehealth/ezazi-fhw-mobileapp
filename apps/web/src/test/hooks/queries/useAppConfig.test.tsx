import { act, type ReactNode } from 'react';
import type { AppConfig } from '@ezazi/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureStore } from '@reduxjs/toolkit';
import { renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { rootReducer } from '../../../reducers';
import { useAppConfig } from '../../../hooks/queries/useAppConfig';
import { configService } from '../../../services/config.service';

vi.mock('../../../services/config.service', () => ({
  configService: { getPublishedConfig: vi.fn() },
}));

const CONFIG = { captchaSiteKey: 'site-key' } as unknown as AppConfig;

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const store = configureStore({ reducer: rootReducer });

  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <MemoryRouter>{children}</MemoryRouter>
        </Provider>
      </QueryClientProvider>
    );
  }

  return { wrapper, store };
}

describe('useAppConfig', () => {
  it('syncs a successful fetch into the config slice', async () => {
    vi.mocked(configService.getPublishedConfig).mockResolvedValue({
      ok: true,
      data: CONFIG,
    });
    const { wrapper, store } = makeWrapper();

    const { result } = renderHook(() => useAppConfig(), { wrapper });
    act(() => {});

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(CONFIG);
    await waitFor(() => expect(store.getState().config.data).toEqual(CONFIG));
    expect(store.getState().config.error).toBeNull();
  });

  it('syncs a failed fetch into the config slice as an error message', async () => {
    // useAppConfig hard-codes retry: 1 on the query itself (overriding
    // this wrapper's queryClient defaults), so isError only flips true
    // after one real retry + its backoff delay — hence the longer waits.
    const { ApiError } = await import('@ezazi/api-client');
    vi.mocked(configService.getPublishedConfig).mockResolvedValue({
      ok: false,
      error: new ApiError('api', 'config unavailable'),
    });
    const { wrapper, store } = makeWrapper();

    const { result } = renderHook(() => useAppConfig(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true), {
      timeout: 5000,
    });
    expect(result.current.error?.message).toBe('config unavailable');
    await waitFor(
      () => expect(store.getState().config.error).toBe('config unavailable'),
      { timeout: 5000 }
    );
  }, 10000);
});
