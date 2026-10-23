import { queryClient } from '../config/query-client';
import { loggedOut } from '../reducers/auth.reducer';
import { profileService } from '../services/profile.service';
import { sessionExpiry } from '../services/session-expiry';
import {
  readGatewaySessionTokens,
  revokeGatewaySession,
} from '../services/session.service';
import { syncSessionFromStorage } from '../services/session-sync';
import { clearSessionSnapshot } from '../utils/session-snapshot';
import { storage } from '../utils/storage';
import type { AppDispatch, RootState } from '../store/store';

/**
 * Signs the user out of this tab immediately — storage, query cache, Redux
 * auth state — and only then tells the servers, in the background. The
 * server calls (revoking the gateway refresh token, ending the OpenMRS
 * session) can take a long time on a bad network; waiting for them left
 * "Yes" looking dead and invited repeat clicks, and nothing about being
 * signed out locally depends on them. The tokens they need are read first,
 * so clearing storage doesn't starve them. Other tabs follow through the
 * `storage` event (services/session-sync.ts).
 */
function signOutLocally(dispatch: AppDispatch): void {
  queryClient.clear();
  storage.clearAuthToken();
  storage.clearStoredUser();
  sessionExpiry.reset();
  dispatch(loggedOut());
}

/**
 * Thunk-shaped action creator (migration guide §3's actions/ folder) — the
 * one place logout logic lives, so every future authenticated page/menu
 * item dispatches this instead of each clearing storage + dispatching
 * loggedOut() separately.
 *
 * Ports AuthService.logOut() (intelehealth-doctor-webapp) — the stored token
 * and user (the Angular `currentUser`/`user`/`provider`/`doctorName`/
 * credential entries), the Redux auth state (its `currentUserSubject`) and,
 * which the Angular app has no equivalent of, the query cache and the
 * gateway refresh token. Its `DELETE /session` on OpenMRS still happens, just
 * after the sign-out rather than before it: unlike the Angular source, which
 * stays logged in if that call fails, a user must be able to log out even
 * while OpenMRS is slow or unreachable.
 */
export const logout = () => async (dispatch: AppDispatch) => {
  const tokens = readGatewaySessionTokens();

  signOutLocally(dispatch);
  /* A deliberate logout discards any expiry snapshot (saved drafts and return page). */
  clearSessionSnapshot();

  void Promise.allSettled([
    revokeGatewaySession(tokens),
    profileService.endSession(),
  ]);
};

/**
 * The hard-expiry modal's "Log in" action: the same sign-out as logout(), but
 * the snapshot saved when the session expired is kept so the next login can
 * restore the page and the unsaved forms, and the gateway is not called (its
 * refresh token is what just failed).
 *
 * If another tab has logged in again in the meantime, that tab's tokens are
 * now what is in storage — clearing them would wreck the new session. In that
 * case this tab just adopts it instead of signing anyone out.
 */
export const logoutAfterExpiry =
  () => async (dispatch: AppDispatch, getState: () => RootState) => {
    const storedToken = storage.getAuthToken();
    if (storedToken && storedToken !== getState().auth.token) {
      syncSessionFromStorage();
      return;
    }

    signOutLocally(dispatch);
    void profileService.endSession();
  };
