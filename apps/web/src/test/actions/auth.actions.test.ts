import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logout, logoutAfterExpiry } from '../../actions/auth.actions';
import { queryClient } from '../../config/query-client';
import { loggedOut } from '../../reducers/auth.reducer';
import { authService } from '../../services/auth.service';
import { profileService } from '../../services/profile.service';
import { sessionExpiry } from '../../services/session-expiry';
import { clearSessionSnapshot } from '../../utils/session-snapshot';
import { storage } from '../../utils/storage';

vi.mock('../../utils/storage', () => ({
  storage: {
    getAuthToken: vi.fn(),
    getRefreshToken: vi.fn(),
    clearAuthToken: vi.fn(),
    clearStoredUser: vi.fn(),
  },
}));

vi.mock('../../services/auth.service', () => ({
  authService: { logout: vi.fn() },
}));

vi.mock('../../services/profile.service', () => ({
  profileService: { endSession: vi.fn() },
}));

vi.mock('../../config/query-client', () => ({
  queryClient: { clear: vi.fn() },
}));

vi.mock('../../utils/session-snapshot', () => ({
  clearSessionSnapshot: vi.fn(),
}));

const OK = { ok: true as const, data: undefined };

beforeEach(() => {
  vi.mocked(storage.getAuthToken).mockReset().mockReturnValue('access-1');
  vi.mocked(storage.getRefreshToken).mockReset().mockReturnValue('refresh-1');
  vi.mocked(storage.clearAuthToken).mockClear();
  vi.mocked(storage.clearStoredUser).mockClear();
  vi.mocked(authService.logout).mockReset().mockResolvedValue(OK);
  vi.mocked(profileService.endSession).mockReset().mockResolvedValue(OK);
  vi.mocked(queryClient.clear).mockReset();
  vi.mocked(clearSessionSnapshot).mockReset();
  sessionExpiry.reset();
});

describe('logout', () => {
  it('revokes the gateway refresh token, ends the OpenMRS session, then clears storage, the query cache and Redux auth state', async () => {
    const dispatch = vi.fn();

    await logout()(dispatch);

    expect(authService.logout).toHaveBeenCalledWith('access-1', 'refresh-1');
    expect(profileService.endSession).toHaveBeenCalledTimes(1);
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
    expect(storage.clearAuthToken).toHaveBeenCalledTimes(1);
    expect(storage.clearStoredUser).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(loggedOut());
  });

  it('reads the tokens before anything is cleared', async () => {
    const order: string[] = [];
    vi.mocked(authService.logout).mockImplementation(async () => {
      order.push('gateway-logout');
      return OK;
    });
    vi.mocked(storage.clearAuthToken).mockImplementation(() => {
      order.push('clear-tokens');
    });

    await logout()(vi.fn());

    expect(order).toEqual(['gateway-logout', 'clear-tokens']);
  });

  it.each([
    ['no access token', null, 'refresh-1'],
    ['no refresh token', 'access-1', null],
  ])(
    'skips the gateway call when there is %s',
    async (_case, access, refresh) => {
      vi.mocked(storage.getAuthToken).mockReturnValue(access);
      vi.mocked(storage.getRefreshToken).mockReturnValue(refresh);
      const dispatch = vi.fn();

      await logout()(dispatch);

      expect(authService.logout).not.toHaveBeenCalled();
      expect(dispatch).toHaveBeenCalledWith(loggedOut());
    }
  );

  it('waits for the OpenMRS session to end before clearing anything', async () => {
    let finishEndingSession: () => void = () => undefined;
    vi.mocked(profileService.endSession).mockReturnValue(
      new Promise(resolve => {
        finishEndingSession = () => resolve(OK);
      })
    );
    const dispatch = vi.fn();

    const loggingOut = logout()(dispatch);
    await vi.waitFor(() =>
      expect(profileService.endSession).toHaveBeenCalled()
    );
    expect(storage.clearAuthToken).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();

    finishEndingSession();
    await loggingOut;
    expect(dispatch).toHaveBeenCalledWith(loggedOut());
  });

  it('still signs out locally when the gateway and OpenMRS cannot end the session', async () => {
    const { ApiError } = await import('@ezazi/api-client');
    const failure = {
      ok: false as const,
      error: new ApiError('network', 'unreachable'),
    };
    vi.mocked(authService.logout).mockResolvedValue(failure);
    vi.mocked(profileService.endSession).mockResolvedValue(failure);
    const dispatch = vi.fn();

    await logout()(dispatch);

    expect(storage.clearAuthToken).toHaveBeenCalledTimes(1);
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(loggedOut());
  });

  it('discards the expiry snapshot and clears a raised session-expired state', async () => {
    sessionExpiry.markExpired();

    await logout()(vi.fn());

    expect(clearSessionSnapshot).toHaveBeenCalledTimes(1);
    expect(sessionExpiry.isExpired()).toBe(false);
  });
});

describe('logoutAfterExpiry', () => {
  it('signs out like logout, but keeps the expiry snapshot and skips the (already dead) gateway session', async () => {
    sessionExpiry.markExpired();
    const dispatch = vi.fn();

    await logoutAfterExpiry()(dispatch);

    expect(authService.logout).not.toHaveBeenCalled();
    expect(clearSessionSnapshot).not.toHaveBeenCalled();
    expect(profileService.endSession).toHaveBeenCalledTimes(1);
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
    expect(storage.clearAuthToken).toHaveBeenCalledTimes(1);
    expect(storage.clearStoredUser).toHaveBeenCalledTimes(1);
    expect(sessionExpiry.isExpired()).toBe(false);
    expect(dispatch).toHaveBeenCalledWith(loggedOut());
  });
});
