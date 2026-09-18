import { secureStorage } from '@/core/services/storage/secure-storage';
import { sessionApi } from '@/core/session/session.api';
import { logApiError } from '@/core/api/errors/logApiError';

const mockSyncConfig = jest.fn().mockResolvedValue(undefined);

jest.mock('@/core/services/storage/secure-storage', () => ({
  secureStorage: { get: jest.fn(), set: jest.fn(), clear: jest.fn() },
}));
jest.mock('@/core/session/session.api', () => ({
  sessionApi: { login: jest.fn(), logout: jest.fn() },
}));
jest.mock('@/core/api/errors/logApiError', () => ({
  logApiError: jest.fn(),
}));
jest.mock('@/core/config/featureConfig.store', () => ({
  useFeatureConfigStore: { getState: () => ({ syncConfig: mockSyncConfig }) },
}));

import { SPLASH_MIN_MS, useAuthStore } from '../auth.store';
import { toBase64 } from '@/core/utils/base64';

// Builds a fake JWT with a given `exp` claim. decodeJwtPayload/isJwtExpired
// only read the payload — no real signature is needed for these tests.
// base64url, not base64: fromBase64() (used by decodeJwtPayload) accepts
// both, but a real JWT segment is always base64url.
function fakeJwt(exp: number): string {
  const base64url = (obj: unknown) =>
    toBase64(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${base64url({ alg: 'none' })}.${base64url({ exp })}.signature`;
}

describe('useAuthStore', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ status: 'unknown', userUuid: null, role: null });
  });

  // ── bootstrap ────────────────────────────────────────────────────────────

  describe('bootstrap', () => {
    it('sets status to authenticated when a non-expired token and userUuid are stored', async () => {
      jest.useFakeTimers();
      const token = fakeJwt(Math.floor(Date.now() / 1000) + 3600);
      (secureStorage.get as jest.Mock).mockImplementation((key: string) =>
        Promise.resolve(key === 'accessToken' ? token : key === 'userUuid' ? 'user-1' : null),
      );

      const bootstrapping = useAuthStore.getState().bootstrap();
      await jest.advanceTimersByTimeAsync(SPLASH_MIN_MS);
      await bootstrapping;

      expect(useAuthStore.getState().status).toBe('authenticated');
      expect(useAuthStore.getState().userUuid).toBe('user-1');
      jest.useRealTimers();
    });

    it('sets status to needsLogin when the stored token is expired', async () => {
      jest.useFakeTimers();
      const token = fakeJwt(Math.floor(Date.now() / 1000) - 3600);
      (secureStorage.get as jest.Mock).mockImplementation((key: string) =>
        Promise.resolve(key === 'accessToken' ? token : key === 'userUuid' ? 'user-1' : null),
      );

      const bootstrapping = useAuthStore.getState().bootstrap();
      await jest.advanceTimersByTimeAsync(SPLASH_MIN_MS);
      await bootstrapping;

      expect(useAuthStore.getState().status).toBe('needsLogin');
      jest.useRealTimers();
    });

    it('sets status to needsLogin when the token is missing but a prior session left userUuid/refreshToken', async () => {
      jest.useFakeTimers();
      (secureStorage.get as jest.Mock).mockImplementation((key: string) =>
        Promise.resolve(key === 'userUuid' ? 'user-1' : null),
      );

      const bootstrapping = useAuthStore.getState().bootstrap();
      await jest.advanceTimersByTimeAsync(SPLASH_MIN_MS);
      await bootstrapping;

      expect(useAuthStore.getState().status).toBe('needsLogin');
      jest.useRealTimers();
    });

    it('sets status to needsSetup when nothing is stored', async () => {
      jest.useFakeTimers();
      (secureStorage.get as jest.Mock).mockResolvedValue(null);

      const bootstrapping = useAuthStore.getState().bootstrap();
      await jest.advanceTimersByTimeAsync(SPLASH_MIN_MS);
      await bootstrapping;

      expect(useAuthStore.getState().status).toBe('needsSetup');
      jest.useRealTimers();
    });

    it('sets status to needsSetup when secure storage throws', async () => {
      jest.useFakeTimers();
      (secureStorage.get as jest.Mock).mockRejectedValue(new Error('keystore locked'));

      const bootstrapping = useAuthStore.getState().bootstrap();
      await jest.advanceTimersByTimeAsync(SPLASH_MIN_MS);
      await bootstrapping;

      expect(useAuthStore.getState().status).toBe('needsSetup');
      jest.useRealTimers();
    });

    it('kicks off a feature-config sync without waiting for it', () => {
      (secureStorage.get as jest.Mock).mockResolvedValue(null);

      void useAuthStore.getState().bootstrap();

      expect(mockSyncConfig).toHaveBeenCalledTimes(1);
    });
  });

  // ── login ────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('persists tokens and marks the store authenticated on success', async () => {
      (sessionApi.login as jest.Mock).mockResolvedValue({
        ok: true,
        data: {
          accessToken: 'access-1',
          refreshToken: 'refresh-1',
          sessionId: 'session-1',
          user: { uuid: 'user-1', username: 'nurse1', roles: ['fhw'] },
          provider: { uuid: 'provider-1' },
        },
      });

      const result = await useAuthStore.getState().login('nurse1', 'password123');

      expect(result.ok).toBe(true);
      expect(secureStorage.set).toHaveBeenCalledWith('accessToken', 'access-1');
      expect(secureStorage.set).toHaveBeenCalledWith('refreshToken', 'refresh-1');
      expect(secureStorage.set).toHaveBeenCalledWith('userUuid', 'provider-1');
      expect(useAuthStore.getState()).toMatchObject({
        status: 'authenticated',
        userUuid: 'provider-1',
      });
    });

    it('returns the failed result and logs it without changing auth state', async () => {
      const apiError = {
        kind: 'unauthorized',
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid username or password',
      };
      (sessionApi.login as jest.Mock).mockResolvedValue({ ok: false, error: apiError });

      const result = await useAuthStore.getState().login('nurse1', 'wrong-password');

      expect(result).toEqual({ ok: false, error: apiError });
      expect(logApiError).toHaveBeenCalledWith('Login', apiError);
      expect(useAuthStore.getState().status).toBe('unknown');
    });
  });

  // ── setAuthenticated ─────────────────────────────────────────────────────

  describe('setAuthenticated', () => {
    it('persists the userUuid and marks the store authenticated', async () => {
      await useAuthStore.getState().setAuthenticated('user-2', 'fhw');

      expect(secureStorage.set).toHaveBeenCalledWith('userUuid', 'user-2');
      expect(useAuthStore.getState()).toMatchObject({
        status: 'authenticated',
        userUuid: 'user-2',
        role: 'fhw',
      });
    });
  });

  // ── logout ───────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('clears local state even when the server logout call fails', async () => {
      (sessionApi.logout as jest.Mock).mockResolvedValue({ ok: false, error: new Error('offline') });
      useAuthStore.setState({ status: 'authenticated', userUuid: 'user-1', role: 'fhw' });

      await useAuthStore.getState().logout();

      expect(secureStorage.clear).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState()).toMatchObject({
        status: 'needsLogin',
        userUuid: null,
        role: null,
      });
    });

    it('clears local state when the server logout call succeeds', async () => {
      (sessionApi.logout as jest.Mock).mockResolvedValue({ ok: true, data: undefined });
      useAuthStore.setState({ status: 'authenticated', userUuid: 'user-1', role: 'fhw' });

      await useAuthStore.getState().logout();

      expect(secureStorage.clear).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().status).toBe('needsLogin');
    });
  });

});
