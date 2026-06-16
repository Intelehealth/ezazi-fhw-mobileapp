import { create } from 'zustand';
import { secureStorage } from '@/services/storage/secure-storage';
import { authApi } from '@/services/api/auth.api';

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

  /** Called from SplashScreen — decides where to route based on token presence. */
  bootstrap: async () => {
    const token = await secureStorage.get('accessToken');
    const userUuid = await secureStorage.get('userUuid');
    if (token && userUuid) {
      set({ status: 'authenticated', userUuid });
    } else {
      set({ status: 'unauthenticated' });
    }
  },

  setAuthenticated: async (userUuid: string, role: string) => {
    await secureStorage.set('userUuid', userUuid);
    set({ status: 'authenticated', userUuid, role });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      /* server may be offline — we still clear local state */
    }
    await secureStorage.clear();
    set({ status: 'unauthenticated', userUuid: null, role: null });
  },
}));
