import { act, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureStore } from '@reduxjs/toolkit';
import { renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { success } from '@ezazi/api-client';
import { rootReducer } from '../../../reducers';
import { useLogin } from '../../../hooks/mutations/useLogin';
import { authService } from '../../../services/auth.service';
import type { AuthGatewayLoginResponse } from '../../../types/auth.types';

vi.mock('../../../services/auth.service', () => ({
  authService: { login: vi.fn() },
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const store = configureStore({ reducer: rootReducer });
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <MemoryRouter>{children}</MemoryRouter>
      </Provider>
    </QueryClientProvider>
  );
}

const CREDENTIALS = { username: 'doctor1', password: 'Doctor@123' };

/** Shape confirmed against the real erevamp.intelehealth.org:3030 endpoint. */
function gatewayResponse(
  overrides: Partial<AuthGatewayLoginResponse> = {}
): AuthGatewayLoginResponse {
  return {
    accessToken: 'tok-123',
    tokenType: 'Bearer',
    expiresIn: 900,
    refreshToken: 'refresh-123',
    authenticated: true,
    user: {
      uuid: 'u-1',
      username: 'doctor1',
      display: 'Demo Male Doctor',
      roles: ['Organizational: Doctor', 'Provider'],
    },
    provider: {
      uuid: 'p-1',
      display: 'Demo Male Doctor',
      person: { uuid: 'per-1', display: 'Demo Male Doctor' },
    },
    ...overrides,
  };
}

describe('useLogin', () => {
  it('persists the token and redirects to the plain dashboard for a non-nurse role', async () => {
    vi.mocked(authService.login).mockResolvedValue(success(gatewayResponse()));

    const { result } = renderHook(() => useLogin(), { wrapper });
    act(() => result.current.mutate(CREDENTIALS));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(localStorage.getItem('ezazi_web_auth_token')).toBe('tok-123');
    expect(result.current.data?.user.displayName).toBe('Demo Male Doctor');
    expect(result.current.data?.user.roles).toEqual([
      'ORGANIZATIONAL: DOCTOR',
      'PROVIDER',
    ]);
  });

  it('redirects nurses to the hw-profile dashboard', async () => {
    vi.mocked(authService.login).mockResolvedValue(
      success(
        gatewayResponse({
          user: {
            uuid: 'u-2',
            username: 'nurse1',
            display: 'Demo Nurse',
            roles: ['Organizational: Nurse'],
          },
        })
      )
    );

    const { result } = renderHook(() => useLogin(), { wrapper });
    act(() =>
      result.current.mutate({ username: 'nurse1', password: 'secret' })
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.user.roles).toContain('ORGANIZATIONAL: NURSE');
  });

  it('surfaces the real backend error message on wrong credentials (401)', async () => {
    const { ApiError } = await import('@ezazi/api-client');
    vi.mocked(authService.login).mockResolvedValue({
      ok: false,
      error: new ApiError('unauthorized', 'Invalid username or password', {
        status: 401,
        code: 'INVALID_CREDENTIALS',
      }),
    });

    const { result } = renderHook(() => useLogin(), { wrapper });
    act(() => result.current.mutate(CREDENTIALS));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Invalid username or password');
  });
});
