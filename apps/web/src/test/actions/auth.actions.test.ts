import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logout } from '../../actions/auth.actions';
import { queryClient } from '../../config/query-client';
import { loggedOut } from '../../reducers/auth.reducer';
import { profileService } from '../../services/profile.service';
import { storage } from '../../utils/storage';

vi.mock('../../utils/storage', () => ({
  storage: { clearAuthToken: vi.fn(), clearStoredUser: vi.fn() },
}));

vi.mock('../../services/profile.service', () => ({
  profileService: { endSession: vi.fn() },
}));

vi.mock('../../config/query-client', () => ({
  queryClient: { clear: vi.fn() },
}));

beforeEach(() => {
  vi.mocked(storage.clearAuthToken).mockClear();
  vi.mocked(storage.clearStoredUser).mockClear();
  vi.mocked(profileService.endSession).mockReset();
  vi.mocked(profileService.endSession).mockResolvedValue({
    ok: true,
    data: undefined,
  });
  vi.mocked(queryClient.clear).mockReset();
});

describe('logout', () => {
  it('ends the OpenMRS session, then clears the stored session, query cache and Redux auth state', async () => {
    const dispatch = vi.fn();

    await logout()(dispatch);

    expect(profileService.endSession).toHaveBeenCalledTimes(1);
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
    expect(storage.clearAuthToken).toHaveBeenCalledTimes(1);
    expect(storage.clearStoredUser).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(loggedOut());
  });

  it('waits for the OpenMRS session to end before clearing anything', async () => {
    let finishEndingSession: () => void = () => undefined;
    vi.mocked(profileService.endSession).mockReturnValue(
      new Promise(resolve => {
        finishEndingSession = () => resolve({ ok: true, data: undefined });
      })
    );
    const dispatch = vi.fn();

    const loggingOut = logout()(dispatch);
    await Promise.resolve();
    expect(storage.clearAuthToken).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();

    finishEndingSession();
    await loggingOut;
    expect(dispatch).toHaveBeenCalledWith(loggedOut());
  });

  it('still signs out locally when OpenMRS cannot end the session', async () => {
    const { ApiError } = await import('@ezazi/api-client');
    vi.mocked(profileService.endSession).mockResolvedValue({
      ok: false,
      error: new ApiError('network', 'OpenMRS unreachable'),
    });
    const dispatch = vi.fn();

    await logout()(dispatch);

    expect(storage.clearAuthToken).toHaveBeenCalledTimes(1);
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(loggedOut());
  });
});
