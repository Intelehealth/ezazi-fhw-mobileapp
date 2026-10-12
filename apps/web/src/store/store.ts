import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from '../reducers';
import type { AuthState } from '../types/auth.types';
import { storage } from '../utils/storage';

/**
 * Rehydrates the auth slice from storage.ts's localStorage-backed token +
 * user on store creation — protected.route.tsx already falls back to
 * `storage.getAuthToken()` alone so a hard refresh on a protected route
 * doesn't bounce to /auth/login (its own comment used to note persistence
 * "isn't wired up yet"), but without this, Redux's `auth.user` stayed null
 * regardless, showing "unknown user" in the navbar and leaving
 * useProviderProfile's `enabled: Boolean(userUuid)` query permanently
 * disabled. Synchronous (not a post-mount effect) so there's no flash of
 * the unauthenticated state on load.
 */
function loadPreloadedAuthState(): { auth: AuthState } | undefined {
  const token = storage.getAuthToken();
  const storedUser = storage.getStoredUser();
  if (!token || !storedUser) return undefined;

  try {
    return {
      auth: { token, user: JSON.parse(storedUser), isAuthenticated: true },
    };
  } catch {
    return undefined;
  }
}

export const store = configureStore({
  reducer: rootReducer,
  preloadedState: loadPreloadedAuthState(),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
