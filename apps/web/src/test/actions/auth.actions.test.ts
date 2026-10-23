import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logout, logoutAfterExpiry } from '../../actions/auth.actions';
import { queryClient } from '../../config/query-client';
import { loggedOut } from '../../reducers/auth.reducer';
import { profileService } from '../../services/profile.service';
import { sessionExpiry } from '../../services/session-expiry';
import {
  readGatewaySessionTokens,
  revokeGatewaySession,
} from '../../services/session.service';
import { syncSessionFromStorage } from '../../services/session-sync';
import type { RootState } from '../../store/store';
import { clearSessionSnapshot } from '../../utils/session-snapshot';
import { storage } from '../../utils/storage';

vi.mock('../../utils/storage', () => ({
  storage: {
    getAuthToken: vi.fn(),
    clearAuthToken: vi.fn(),
    clearStoredUser: vi.fn(),
  },
}));

vi.mock('../../services/session.service', () => ({
  readGatewaySessionTokens: vi.fn(),
  revokeGatewaySession: vi.fn(),
}));

vi.mock('../../services/session-sync', () => ({
  syncSessionFromStorage: vi.fn(),
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
const TOKENS = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  accessTokenExpiresAt: 123,
};

/** A promise that never settles — a server call stuck on a dead network. */
const hangs = () => new Promise<never>(() => undefined);

const stateWithToken = (token: string | null) => () =>
  ({ auth: { token } }) as RootState;

beforeEach(() => {
  vi.mocked(readGatewaySessionTokens).mockReset().mockReturnValue(TOKENS);
  vi.mocked(revokeGatewaySession).mockReset().mockResolvedValue(undefined);
  vi.mocked(profileService.endSession).mockReset().mockResolvedValue(OK);
  vi.mocked(syncSessionFromStorage).mockReset();
  vi.mocked(storage.getAuthToken).mockReset().mockReturnValue('access-1');
  vi.mocked(storage.clearAuthToken).mockClear();
  vi.mocked(storage.clearStoredUser).mockClear();
  vi.mocked(queryClient.clear).mockReset();
  vi.mocked(clearSessionSnapshot).mockReset();
  sessionExpiry.reset();
});

describe('logout', () => {
  it('signs out locally: clears storage, the query cache and Redux auth state, and discards the expiry snapshot', async () => {
    const dispatch = vi.fn();

    await logout()(dispatch);

    expect(storage.clearAuthToken).toHaveBeenCalledTimes(1);
    expect(storage.clearStoredUser).toHaveBeenCalledTimes(1);
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
    expect(clearSessionSnapshot).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(loggedOut());
  });

  it('tells the servers in the background, with the tokens it read before clearing storage', async () => {
    const order: string[] = [];
    vi.mocked(readGatewaySessionTokens).mockImplementation(() => {
      order.push('read-tokens');
      return TOKENS;
    });
    vi.mocked(storage.clearAuthToken).mockImplementation(() => {
      order.push('clear-tokens');
    });
    vi.mocked(revokeGatewaySession).mockImplementation(async () => {
      order.push('revoke');
    });

    await logout()(vi.fn());

    expect(revokeGatewaySession).toHaveBeenCalledWith(TOKENS);
    expect(profileService.endSession).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['read-tokens', 'clear-tokens', 'revoke']);
  });

  it('does not wait for the servers: it is signed out even when both calls hang', async () => {
    vi.mocked(revokeGatewaySession).mockReturnValue(hangs());
    vi.mocked(profileService.endSession).mockReturnValue(hangs());
    const dispatch = vi.fn();

    await logout()(dispatch);

    expect(dispatch).toHaveBeenCalledWith(loggedOut());
  });

  it('is unaffected when a server call fails', async () => {
    vi.mocked(revokeGatewaySession).mockRejectedValue(new Error('boom'));
    vi.mocked(profileService.endSession).mockRejectedValue(new Error('boom'));
    const dispatch = vi.fn();

    await expect(logout()(dispatch)).resolves.toBeUndefined();

    expect(dispatch).toHaveBeenCalledWith(loggedOut());
  });

  it('clears a raised session-expired state', async () => {
    sessionExpiry.markExpired();

    await logout()(vi.fn());

    expect(sessionExpiry.isExpired()).toBe(false);
  });
});

describe('logoutAfterExpiry', () => {
  it('signs out locally but keeps the expiry snapshot, and ends only the OpenMRS session', async () => {
    sessionExpiry.markExpired();
    const dispatch = vi.fn();

    await logoutAfterExpiry()(dispatch, stateWithToken('access-1'));

    expect(clearSessionSnapshot).not.toHaveBeenCalled();
    expect(revokeGatewaySession).not.toHaveBeenCalled();
    expect(profileService.endSession).toHaveBeenCalledTimes(1);
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
    expect(storage.clearAuthToken).toHaveBeenCalledTimes(1);
    expect(storage.clearStoredUser).toHaveBeenCalledTimes(1);
    expect(sessionExpiry.isExpired()).toBe(false);
    expect(dispatch).toHaveBeenCalledWith(loggedOut());
  });

  it('does not wait for OpenMRS', async () => {
    vi.mocked(profileService.endSession).mockReturnValue(hangs());
    const dispatch = vi.fn();

    await logoutAfterExpiry()(dispatch, stateWithToken('access-1'));

    expect(dispatch).toHaveBeenCalledWith(loggedOut());
  });

  it("leaves another tab's fresh login alone: adopts it instead of wiping its tokens", async () => {
    vi.mocked(storage.getAuthToken).mockReturnValue('access-from-other-tab');
    const dispatch = vi.fn();

    await logoutAfterExpiry()(dispatch, stateWithToken('access-1'));

    expect(syncSessionFromStorage).toHaveBeenCalledTimes(1);
    expect(storage.clearAuthToken).not.toHaveBeenCalled();
    expect(storage.clearStoredUser).not.toHaveBeenCalled();
    expect(profileService.endSession).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('signs out normally when storage no longer holds any token', async () => {
    vi.mocked(storage.getAuthToken).mockReturnValue(null);
    const dispatch = vi.fn();

    await logoutAfterExpiry()(dispatch, stateWithToken('access-1'));

    expect(syncSessionFromStorage).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith(loggedOut());
  });
});
