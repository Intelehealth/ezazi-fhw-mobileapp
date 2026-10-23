import { act, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { configureStore } from '@reduxjs/toolkit';
import { renderHook, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { success } from '@ezazi/api-client';
import { rootReducer } from '../../../reducers';
import { useLogin } from '../../../hooks/mutations/useLogin';
import { authService } from '../../../services/auth.service';
import { profileService } from '../../../services/profile.service';
import { sessionExpiry } from '../../../services/session-expiry';
import { showToast } from '../../../services/toast';
import type { AuthGatewayLoginResponse } from '../../../types/auth.types';

vi.mock('../../../services/auth.service', () => ({
  authService: { login: vi.fn() },
}));

vi.mock('../../../services/profile.service', () => ({
  profileService: { createSession: vi.fn(), endSession: vi.fn() },
}));

vi.mock('../../../services/toast', () => ({ showToast: vi.fn() }));

/** Shows where the router currently is, so a test can see where login navigated to. */
function LocationProbe() {
  return <p data-testid="location">{useLocation().pathname}</p>;
}

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const store = configureStore({ reducer: rootReducer });
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <MemoryRouter>
          <LocationProbe />
          {children}
        </MemoryRouter>
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
  beforeEach(() => {
    vi.mocked(profileService.createSession).mockReset();
    vi.mocked(profileService.endSession).mockReset();
    vi.mocked(profileService.endSession).mockResolvedValue(success(undefined));
    vi.mocked(profileService.createSession).mockResolvedValue(
      success({ sessionId: 'sess-1', authenticated: true })
    );
  });

  it('persists the token and redirects to the plain dashboard for a non-nurse role', async () => {
    vi.mocked(authService.login).mockResolvedValue(success(gatewayResponse()));

    const { result } = renderHook(() => useLogin(), { wrapper });
    act(() => result.current.mutate(CREDENTIALS));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(localStorage.getItem('ezazi_web_auth_token')).toBe('tok-123');
    expect(JSON.parse(localStorage.getItem('ezazi_web_auth_user')!)).toEqual(
      result.current.data?.user
    );
    expect(result.current.data?.user.displayName).toBe('Demo Male Doctor');
    expect(result.current.data?.user.roles).toEqual([
      'ORGANIZATIONAL: DOCTOR',
      'PROVIDER',
    ]);
  });

  it('establishes the OpenMRS session cookie with the plaintext credentials right after a successful gateway login', async () => {
    vi.mocked(authService.login).mockResolvedValue(success(gatewayResponse()));

    const { result } = renderHook(() => useLogin(), { wrapper });
    act(() => result.current.mutate(CREDENTIALS));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(profileService.createSession).toHaveBeenCalledWith(
      CREDENTIALS.username,
      CREDENTIALS.password
    );
  });

  it('still logs in when the OpenMRS session call fails, but ends any old session and warns', async () => {
    const { ApiError } = await import('@ezazi/api-client');
    vi.mocked(authService.login).mockResolvedValue(success(gatewayResponse()));
    vi.mocked(profileService.createSession).mockResolvedValue({
      ok: false,
      error: new ApiError('network', 'OpenMRS unreachable'),
    });

    const { result } = renderHook(() => useLogin(), { wrapper });
    act(() => result.current.mutate(CREDENTIALS));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(profileService.endSession).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith(
      'OpenMRS Session Unavailable',
      'Profile and patient features may not work until you log in again.',
      'warning'
    );
  });

  it('leaves the freshly created OpenMRS session alone when it is established', async () => {
    vi.mocked(authService.login).mockResolvedValue(success(gatewayResponse()));

    const { result } = renderHook(() => useLogin(), { wrapper });
    act(() => result.current.mutate(CREDENTIALS));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(profileService.endSession).not.toHaveBeenCalled();
  });

  it("shows a success toast matching login.component.ts's copy on successful login", async () => {
    vi.mocked(authService.login).mockResolvedValue(success(gatewayResponse()));

    const { result } = renderHook(() => useLogin(), { wrapper });
    act(() => result.current.mutate(CREDENTIALS));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(showToast).toHaveBeenCalledWith(
      'Login Successful',
      'You have successfully logged in.',
      'success'
    );
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

  it('shows an error toast titled "Login Failed!" with the backend message on wrong credentials', async () => {
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
    expect(showToast).toHaveBeenCalledWith(
      'Login Failed!',
      'Invalid username or password',
      'error'
    );
  });

  it('shows the Angular-matching error toast copy when authenticated comes back false', async () => {
    vi.mocked(authService.login).mockResolvedValue(
      success(gatewayResponse({ authenticated: false }))
    );

    const { result } = renderHook(() => useLogin(), { wrapper });
    act(() => result.current.mutate(CREDENTIALS));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(showToast).toHaveBeenCalledWith(
      'Login Failed!',
      "Couldn't find you, credentials provided are wrong.",
      'error'
    );
  });

  describe('session expiry', () => {
    const SNAPSHOT_KEY = 'ezazi_web_session_snapshot';

    function saveSnapshotFor(userUuid: string) {
      sessionStorage.setItem(
        SNAPSHOT_KEY,
        JSON.stringify({
          userUuid,
          returnTo: '/dashboard/profile',
          drafts: {},
        })
      );
    }

    async function loginAs() {
      vi.mocked(authService.login).mockResolvedValue(
        success(gatewayResponse())
      );
      const { result } = renderHook(() => useLogin(), { wrapper });
      act(() => result.current.mutate(CREDENTIALS));
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    }

    beforeEach(() => {
      sessionStorage.clear();
      localStorage.clear();
      sessionExpiry.reset();
    });

    it('stores the refresh token and when the access token expires, for the silent refresh', async () => {
      await loginAs();

      expect(localStorage.getItem('ezazi_web_refresh_token')).toBe(
        'refresh-123'
      );
      expect(
        Number(localStorage.getItem('ezazi_web_auth_token_expires_at'))
      ).toBeGreaterThan(Date.now());
    });

    it('sends the same user back to the page they were on when the session expired', async () => {
      saveSnapshotFor('u-1');

      await loginAs();

      await waitFor(() =>
        expect(screen.getByTestId('location')).toHaveTextContent(
          '/dashboard/profile'
        )
      );
    });

    it("does not send a different user to the previous user's page, and discards that snapshot", async () => {
      saveSnapshotFor('someone-else');

      await loginAs();

      await waitFor(() =>
        expect(screen.getByTestId('location')).toHaveTextContent('/dashboard')
      );
      expect(screen.getByTestId('location')).not.toHaveTextContent('profile');
      expect(sessionStorage.getItem(SNAPSHOT_KEY)).toBeNull();
    });

    it('clears a raised session-expired state on a successful login', async () => {
      sessionExpiry.markExpired();

      await loginAs();

      expect(sessionExpiry.isExpired()).toBe(false);
    });
  });
});
