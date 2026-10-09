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
 */
export const logout = () => (dispatch: AppDispatch) => {
  /*
   * Also ends the OpenMRS session and empties the query cache: the
   * JSESSIONID cookie otherwise outlives logout (the next person on a shared
   * machine would ride the previous user's OpenMRS identity), and cached
   * profile/patient data would still be readable. Fire-and-forget — logging
   * out must not wait on, or fail because of, OpenMRS being slow or down.
   */
  void profileService.endSession();
  queryClient.clear();
  storage.clearAuthToken();
  storage.clearStoredUser();
  dispatch(loggedOut());
};
