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
  vi.mocked(profileService.endSession).mockReset();
  vi.mocked(queryClient.clear).mockReset();
});

describe('logout', () => {
  it('clears the stored session and dispatches loggedOut', () => {
    const dispatch = vi.fn();

    logout()(dispatch);

    expect(storage.clearAuthToken).toHaveBeenCalledTimes(1);
    expect(storage.clearStoredUser).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(loggedOut());
  });

  it('ends the OpenMRS session and empties the query cache', () => {
    logout()(vi.fn());

    expect(profileService.endSession).toHaveBeenCalledTimes(1);
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
  });

  it('does not wait for the OpenMRS session to end before logging out', () => {
    vi.mocked(profileService.endSession).mockReturnValue(
      new Promise(() => undefined)
    );
    const dispatch = vi.fn();

    logout()(dispatch);

    expect(dispatch).toHaveBeenCalledWith(loggedOut());
  });
});
