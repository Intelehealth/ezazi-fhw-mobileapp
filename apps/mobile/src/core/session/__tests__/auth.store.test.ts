import { teardownDb } from '@/core/db/teardown';
import { secureStorage } from '@/core/services/storage/secure-storage';
import { sessionApi } from '@/core/session/session.api';
import { hashPassword } from '@/core/session/credentials';
import { logApiError } from '@/core/api/errors/logApiError';

const mockSyncConfig = jest.fn().mockResolvedValue(undefined);

jest.mock('@/core/services/storage/secure-storage', () => ({
  secureStorage: { get: jest.fn(), set: jest.fn(), remove: jest.fn(), clearSession: jest.fn(), clearAll: jest.fn() },
}));
jest.mock('@/core/session/session.api', () => ({
  sessionApi: { login: jest.fn(), logout: jest.fn() },
  // Readable stand-in for base64, so assertions show which values went in.
  basicAuthHeader: (username: string, password: string) => `Basic ${username}:${password}`,
}));
jest.mock('@/core/session/credentials', () => ({
  hashPassword: jest.fn((password: string) => Promise.resolve(`hashed(${password})`)),
}));
jest.mock('@/core/api/errors/logApiError', () => ({
  logApiError: jest.fn(),
}));
jest.mock('@/core/config/featureConfig.store', () => ({
  useFeatureConfigStore: { getState: () => ({ syncConfig: mockSyncConfig }) },
}));
jest.mock('@/core/db/teardown', () => ({ teardownDb: jest.fn() }));

import { SPLASH_MIN_MS, useAuthStore } from '../auth.store';
import { requestSessionEnd } from '../sessionEnd';
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

  /** Only the keys a test names are present; every other key reads as absent. */
  function stored(values: Record<string, string>): void {
    (secureStorage.get as jest.Mock).mockImplementation((key: string) =>
      Promise.resolve(values[key] ?? null),
    );
  }

  /** What Setup leaves behind. Logout does not touch these. */
  const SET_UP = { locationUuid: 'loc-1', basicCredential: 'dXNlcjpwYXNz' };

  describe('bootstrap', () => {
    it('sets status to authenticated when a non-expired token and userUuid are stored', async () => {
      jest.useFakeTimers();
      const token = fakeJwt(Math.floor(Date.now() / 1000) + 3600);
      stored({ accessToken: token, userUuid: 'user-1', ...SET_UP });

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
      stored({ accessToken: token, userUuid: 'user-1', ...SET_UP });

      const bootstrapping = useAuthStore.getState().bootstrap();
      await jest.advanceTimersByTimeAsync(SPLASH_MIN_MS);
      await bootstrapping;

      expect(useAuthStore.getState().status).toBe('needsLogin');
      jest.useRealTimers();
    });

    it('sends a logged-out but still set-up device to Login', async () => {
      // The bug this replaced: bootstrap asked the SESSION keys, which
      // endSession had just deleted. So an in-session logout went to Login and
      // a cold start after that same logout went to Setup — same device, same
      // action, two destinations.
      jest.useFakeTimers();
      stored(SET_UP);

      const bootstrapping = useAuthStore.getState().bootstrap();
      await jest.advanceTimersByTimeAsync(SPLASH_MIN_MS);
      await bootstrapping;

      expect(useAuthStore.getState().status).toBe('needsLogin');
      jest.useRealTimers();
    });

    it('sends a device to Setup when the setup keys are absent, whatever the session left behind', async () => {
      jest.useFakeTimers();
      stored({ userUuid: 'user-1', refreshToken: 'refresh-1' });

      const bootstrapping = useAuthStore.getState().bootstrap();
      await jest.advanceTimersByTimeAsync(SPLASH_MIN_MS);
      await bootstrapping;

      expect(useAuthStore.getState().status).toBe('needsSetup');
      jest.useRealTimers();
    });

    it('treats a half-written setup as not set up', async () => {
      // Both land in the same pass, so one without the other means that pass
      // was interrupted. Login would then have no credential to sync with.
      jest.useFakeTimers();
      stored({ locationUuid: 'loc-1' });

      const bootstrapping = useAuthStore.getState().bootstrap();
      await jest.advanceTimersByTimeAsync(SPLASH_MIN_MS);
      await bootstrapping;

      expect(useAuthStore.getState().status).toBe('needsSetup');
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
    const succeeds = () =>
      (sessionApi.login as jest.Mock).mockResolvedValue({
        ok: true,
        data: {
          accessToken: 'access-1',
          refreshToken: 'refresh-1',
          sessionId: 'session-1',
          user: { uuid: 'user-1', username: 'nurse1', display: 'Nurse One', roles: ['fhw'] },
          provider: { uuid: 'provider-1' },
        },
      });

    const written = (key: string): unknown =>
      (secureStorage.set as jest.Mock).mock.calls.find(([k]) => k === key)?.[1];

    it('persists tokens and marks the store authenticated on success', async () => {
      succeeds();

      const result = await useAuthStore.getState().login('nurse1', 'fixture-pw1');

      expect(result.ok).toBe(true);
      expect(secureStorage.set).toHaveBeenCalledWith('accessToken', 'access-1');
      expect(secureStorage.set).toHaveBeenCalledWith('refreshToken', 'refresh-1');
      expect(secureStorage.set).toHaveBeenCalledWith('userUuid', 'provider-1');
      expect(useAuthStore.getState()).toMatchObject({
        status: 'authenticated',
        userUuid: 'provider-1',
      });
    });

    it('mints the basic credential, because this is the only moment the password exists', async () => {
      succeeds();

      await useAuthStore.getState().login('nurse1', 'fixture-pw1');

      expect(secureStorage.set).toHaveBeenCalledWith(
        'basicCredential',
        'Basic nurse1:fixture-pw1',
      );
    });

    it('leaves the whole credentials row for Home, hashed', async () => {
      // The database does not exist yet, so the row cannot be written here.
      succeeds();

      await useAuthStore.getState().login('nurse1', 'fixture-pw1');

      expect(JSON.parse(written('pendingCredentials') as string)).toEqual({
        username: 'nurse1',
        password: 'hashed(fixture-pw1)',
        creator_uuid_cred: 'user-1',
        chwname: 'Nurse One',
        provider_uuid_cred: 'provider-1',
      });
    });

    it('puts the hash in the row, never the password', async () => {
      succeeds();

      await useAuthStore.getState().login('nurse1', 'fixture-pw1');

      const pending = JSON.parse(written('pendingCredentials') as string) as { password: string };
      expect(hashPassword).toHaveBeenCalledWith('fixture-pw1');
      expect(pending.password).not.toBe('fixture-pw1');
    });

    it('stores no location when Login supplies none, so logout keeps the stored one', async () => {
      succeeds();

      await useAuthStore.getState().login('nurse1', 'fixture-pw1');

      expect(written('locationUuid')).toBeUndefined();
      expect(written('locationName')).toBeUndefined();
    });

    it('stores the location uuid and its name when Setup supplies one', async () => {
      succeeds();

      await useAuthStore
        .getState()
        .login('nurse1', 'fixture-pw1', { uuid: 'loc-1', display: 'Ward A' });

      expect(secureStorage.set).toHaveBeenCalledWith('locationUuid', 'loc-1');
      expect(secureStorage.set).toHaveBeenCalledWith('locationName', 'Ward A');
    });

    it('writes nothing to storage when the login fails', async () => {
      (sessionApi.login as jest.Mock).mockResolvedValue({ ok: false, error: { kind: 'unauthorized' } });

      await useAuthStore.getState().login('nurse1', 'wrong', { uuid: 'loc-1', display: 'Ward A' });

      expect(secureStorage.set).not.toHaveBeenCalled();
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

      expect(secureStorage.clearSession).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState()).toMatchObject({
        status: 'needsLogin',
        userUuid: null,
        role: null,
      });
    });

    it('leaves the database alone, so the next login does not re-download the archive', async () => {
      // Logout follows the legacy and destroys nothing. The pull cursor lives
      // in this database, so deleting it here would make every logout cost a
      // full re-import of the location's data. Reset app is the destructive one.
      (sessionApi.logout as jest.Mock).mockResolvedValue({ ok: true, data: undefined });

      await useAuthStore.getState().logout();

      expect(teardownDb).not.toHaveBeenCalled();
    });

    it('leaves the database alone even when the server logout call fails', async () => {
      // Offline logout is the common case for a field worker.
      (sessionApi.logout as jest.Mock).mockResolvedValue({ ok: false, error: new Error('offline') });

      await useAuthStore.getState().logout();

      expect(teardownDb).not.toHaveBeenCalled();
    });

    it('keeps the setup keys, so the device is still set up afterwards', async () => {
      (sessionApi.logout as jest.Mock).mockResolvedValue({ ok: true, data: undefined });

      await useAuthStore.getState().logout();

      expect(secureStorage.clearAll).not.toHaveBeenCalled();
    });

    it('clears local state when the server logout call succeeds', async () => {
      (sessionApi.logout as jest.Mock).mockResolvedValue({ ok: true, data: undefined });
      useAuthStore.setState({ status: 'authenticated', userUuid: 'user-1', role: 'fhw' });

      await useAuthStore.getState().logout();

      expect(secureStorage.clearSession).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().status).toBe('needsLogin');
    });
  });

  // ── session end ──────────────────────────────────────────────────────────

  describe('session end', () => {
    it('ends the session exactly as logout does when a token expires', async () => {
      // The whole point: a refresh failure used to clear nothing at all, so the
      // secrets and the background work both outlived the session on that path.
      useAuthStore.setState({ status: 'authenticated', userUuid: 'user-1', role: 'fhw' });

      await requestSessionEnd('tokenExpired');

      expect(secureStorage.clearSession).toHaveBeenCalledTimes(1);
      expect(teardownDb).not.toHaveBeenCalled();
      expect(useAuthStore.getState()).toMatchObject({
        status: 'needsLogin',
        userUuid: null,
        role: null,
      });
    });

    it('does not call the server on a token expiry, only on logout', async () => {
      // There is no session left to end server-side, and the device is very
      // likely offline — that is usually why the refresh failed.
      await requestSessionEnd('tokenExpired');

      expect(sessionApi.logout).not.toHaveBeenCalled();
    });

    it('ends one session however many requests failed at once', async () => {
      useAuthStore.setState({ status: 'authenticated', userUuid: 'user-1', role: 'fhw' });

      await Promise.all([
        requestSessionEnd('tokenExpired'),
        requestSessionEnd('tokenExpired'),
        requestSessionEnd('tokenExpired'),
      ]);

      // clearSession, not teardownDb: the teardown no longer runs at all, so
      // the keystore wipe is the only thing left that ending a session does once.
      expect(secureStorage.clearSession).toHaveBeenCalledTimes(1);
    });
  });

});
