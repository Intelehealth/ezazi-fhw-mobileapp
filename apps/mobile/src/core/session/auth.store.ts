import { create } from 'zustand';
import type { ApiResult } from '@ezazi/api-client';
import { secureStorage } from '@/core/services/storage/secure-storage';
import { sessionApi, type LoginResponse } from '@/core/session/session.api';
import { logApiError } from '@/core/api/errors/logApiError';
import { useFeatureConfigStore } from '@/core/config/featureConfig.store';
import { isJwtExpired } from '@/core/utils/jwt';
import { logger } from '@/core/utils/logger';

export type AuthStatus = 'unknown' | 'unauthenticated' | 'authenticated';

export const SPLASH_MIN_MS = 3_000;

interface AuthState {
  status: AuthStatus;
  userUuid: string | null;
  role: string | null;
  bootstrap: () => Promise<void>;
  /** Presentation (Setup/Login screens) calls this instead of sessionApi
   *  directly — see the boundaries/dependencies eslint rule + CLAUDE.md:
   *  screens go through a store, never the data layer, for auth/session calls. */
  login: (username: string, password: string) => Promise<ApiResult<LoginResponse>>;
  setAuthenticated: (userUuid: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'unknown',
  userUuid: null,
  role: null,

  /** Called from SplashScreen — decides where to route based on token presence.
   *  Holds for at least SPLASH_MIN_MS so the splash is visible long enough. */
  bootstrap: async () => {
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
        // JWT expiry isn't enforced yet — no real access token is persisted
        // today (see EZ-1156), so treating one as expired would strand every
        // session. Logged only, so routing can start gating on it later.
        if (isJwtExpired(token)) {
          logger.debug('bootstrap: stored token looks expired, not enforcing yet');
        }
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

  /** Username/password login — EZ-1097. Persists tokens and marks the store
   *  authenticated on success; the caller maps a failed ApiResult to whatever
   *  it wants to show (field errors, an error banner, …). */
  login: async (username: string, password: string) => {
    const result = await sessionApi.login({ username, password });

    if (result.ok) {
      const { accessToken, refreshToken, sessionId, user, provider } = result.data;
      await secureStorage.set('accessToken', accessToken);
      await secureStorage.set('refreshToken', refreshToken);
      // provider.uuid (not the auth-gateway's own user.uuid) — matches Android's ProviderDAO
      // identity and the offline DB schema's creatoruuid/provideruuid record-attribution fields.
      // No role is stored: Android doesn't persist one from login either.
      await get().setAuthenticated(provider.uuid, '');

      // Console-only — never shown on screen. Tokens intentionally omitted.
      logger.debug('[Auth] Login succeeded', {
        sessionId,
        userUuid: user.uuid,
        username: user.username,
        roles: user.roles,
        providerUuid: provider.uuid,
      });
    } else {
      // Console-only — never shown on screen, in dev or production builds.
      // The caller maps result.error to a friendly, translated message.
      logApiError('Login', result.error);
    }

    return result;
  },

  setAuthenticated: async (userUuid: string, role: string) => {
    await secureStorage.set('userUuid', userUuid);
    set({ status: 'authenticated', userUuid, role });
  },

  logout: async () => {
    // Result intentionally unused — server may be offline, we still clear local state.
    await sessionApi.logout();
    await secureStorage.clear();
    set({ status: 'unauthenticated', userUuid: null, role: null });
  },
}));
