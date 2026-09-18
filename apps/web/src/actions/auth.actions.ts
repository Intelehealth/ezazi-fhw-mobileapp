import { loggedOut } from '../reducers/auth.reducer';
import { storage } from '../utils/storage';
import type { AppDispatch } from '../store/store';

/**
 * Thunk-shaped action creator (migration guide §3's actions/ folder) — the
 * one place logout logic lives, so every future authenticated page/menu
 * item dispatches this instead of each clearing storage + dispatching
 * loggedOut() separately.
 */
export const logout = () => (dispatch: AppDispatch) => {
  storage.clearAuthToken();
  storage.clearStoredUser();
  dispatch(loggedOut());
};
