import { create } from 'zustand';
import { secureStorage } from '@/core/services/storage/secure-storage';
import { authApi } from '@/core/api/auth.api';
import { useFeatureConfigStore } from '@/core/config/featureConfig.store';

export type AuthStatus = 'unknown' | 'unauthenticated' | 'authenticated';

interface AuthState {
  status: AuthStatus;
  userUuid: string | null;
  role: string | null;
  bootstrap: () => Promise<void>;
  setAuthenticated: (userUuid: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'unknown',
  userUuid: null,
  role: null,

  /** Called from SplashScreen — decides where to route based on token presence.
   *  Holds for at least SPLASH_MIN_MS so the splash is visible long enough. */
  bootstrap: async () => {
    const SPLASH_MIN_MS = 3_000;
    // Fire config sync in parallel — auth routing does not depend on its result.
    // Errors inside syncConfig are swallowed by the store; we never let them surface here.
    void useFeatureConfigStore.getState().syncConfig();
    try {
      const [token, userUuid] = await Promise.all([
        secureStorage.get('accessToken'),
        secureStorage.get('userUuid'),
        new Promise<void>((resolve) => setTimeout(resolve, SPLASH_MIN_MS)),
      ]);
      if (token && userUuid) {
        set({ status: 'authenticated', userUuid });
      } else {
        set({ status: 'unauthenticated' });
      }
    } catch {
      // SecureStore can throw on certain Android keystores (e.g. first-boot,
      // locked device, or manufacturer keystore errors). Always unblock navigation.
      set({ status: 'unauthenticated' });
    }
  },

  setAuthenticated: async (userUuid: string, role: string) => {
    await secureStorage.set('userUuid', userUuid);
    set({ status: 'authenticated', userUuid, role });
  },

  logout: async () => {
    // Result intentionally unused — server may be offline, we still clear local state.
    await authApi.logout();
    await secureStorage.clear();
    set({ status: 'unauthenticated', userUuid: null, role: null });
  },
}));
