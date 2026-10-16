import { queryClient } from '../config/query-client';
import { loggedOut } from '../reducers/auth.reducer';
import { profileService } from '../services/profile.service';
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
  await profileService.endSession();
  queryClient.clear();
  storage.clearAuthToken();
  storage.clearStoredUser();
  dispatch(loggedOut());
};
