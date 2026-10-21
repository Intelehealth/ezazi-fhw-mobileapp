import { queryClient } from '../config/query-client';
import { loggedOut } from '../reducers/auth.reducer';
import { authService } from '../services/auth.service';
import { profileService } from '../services/profile.service';
import { sessionExpiry } from '../services/session-expiry';
import { clearSessionSnapshot } from '../utils/session-snapshot';
import { storage } from '../utils/storage';
import type { AppDispatch } from '../store/store';

/**
 * Thunk-shaped action creator (migration guide §3's actions/ folder) — the
 * one place logout logic lives, so every future authenticated page/menu
 * item dispatches this instead of each clearing storage + dispatching
 * loggedOut() separately.
 *
 * Ports AuthService.logOut() (intelehealth-doctor-webapp): `DELETE /session`
 * on OpenMRS first, then the local sign-out — the stored token and user
 * (the Angular `currentUser`/`user`/`provider`/`doctorName`/credential
 * entries), the Redux auth state (its `currentUserSubject`) and, which the
 * Angular app has no equivalent of, the query cache so no profile/patient
 * data outlives the session. The login redirect is the protected route's own
 * job once the auth state is cleared. Unlike the Angular source, which stays
 * logged in if the DELETE fails, the local sign-out always happens: a user
 * must be able to log out even while OpenMRS is slow or unreachable.
 */
export const logout = () => async (dispatch: AppDispatch) => {
  /*
   * Revoke the gateway's refresh-token family too, or the stored refresh
   * token would stay usable for days after logout. Read before anything is
   * cleared, and best-effort: with an already-expired access token the
   * gateway refuses it, and that is fine — such a session is dead anyway.
   */
  const accessToken = storage.getAuthToken();
  const refreshToken = storage.getRefreshToken();
  if (accessToken && refreshToken) {
    await authService.logout(accessToken, refreshToken);
  }

  await profileService.endSession();
  queryClient.clear();
  storage.clearAuthToken();
  storage.clearStoredUser();
  /*
   * A deliberate logout discards any expiry snapshot (saved drafts and
   * return page); the session-expired modal's own "Log in" keeps it — see
   * logoutAfterExpiry below.
   */
  clearSessionSnapshot();
  sessionExpiry.reset();
  dispatch(loggedOut());
};

/**
 * The hard-expiry modal's "Log in" action: the same sign-out as logout(), but
 * the snapshot saved when the session expired is kept so the next login can
 * restore the page and the unsaved forms.
 */
export const logoutAfterExpiry = () => async (dispatch: AppDispatch) => {
  await profileService.endSession();
  queryClient.clear();
  storage.clearAuthToken();
  storage.clearStoredUser();
  sessionExpiry.reset();
  dispatch(loggedOut());
};
