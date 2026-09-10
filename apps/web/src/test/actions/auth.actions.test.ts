import { describe, expect, it, vi } from 'vitest';
import { logout } from '../../actions/auth.actions';
import { loggedOut } from '../../reducers/auth.reducer';
import { storage } from '../../utils/storage';

vi.mock('../../utils/storage', () => ({
  storage: { clearAuthToken: vi.fn(), clearStoredUser: vi.fn() },
}));

describe('logout', () => {
  it('clears the stored session and dispatches loggedOut', () => {
    const dispatch = vi.fn();

    logout()(dispatch);

    expect(storage.clearAuthToken).toHaveBeenCalledTimes(1);
    expect(storage.clearStoredUser).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(loggedOut());
  });
});
