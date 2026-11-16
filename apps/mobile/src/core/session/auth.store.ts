import { create } from 'zustand';
import type { ApiResult } from '@ezazi/api-client';
import { secureStorage } from '@/core/services/storage/secure-storage';
import { sessionApi, basicAuthHeader, type LoginResponse } from '@/core/session/session.api';
import { hashPassword } from '@/core/session/credentials';
import type { UserCredentialsRow } from '@/core/db/repositories';
import { logApiError } from '@/core/api/errors/logApiError';
import { useFeatureConfigStore } from '@/core/config/featureConfig.store';
import { useDbBootstrapStore } from '@/core/session/dbBootstrap.store';
import { setSessionEndHandler, type SessionEndReason } from '@/core/session/sessionEnd';
import { isJwtExpired } from '@/core/utils/jwt';
import { logger } from '@/core/utils/logger';

export type AuthStatus = 'unknown' | 'needsSetup' | 'needsLogin' | 'authenticated';

/**
 * The location Setup captured. Declared here rather than imported, because
 * `features/auth`'s `LoginLocation` is a feature type and core may not import
 * a feature — it satisfies this structurally.
 *
 * The NAME is stored beside the uuid on Arpan's call: the legacy keeps both
 * (`SetupActivity.java:555-557`), and a uuid alone cannot be shown to anyone.
 */
export interface SetupLocation {
  uuid: string;
  display: string;
}

export const SPLASH_MIN_MS = 3_000;

interface AuthState {
  status: AuthStatus;
  userUuid: string | null;
  role: string | null;
  bootstrap: () => Promise<void>;
  /** Presentation (Setup/Login screens) calls this instead of sessionApi
   *  directly — see the boundaries/dependencies eslint rule + CLAUDE.md:
   *  screens go through a store, never the data layer, for auth/session calls.
   *
   *  `location` comes from Setup only. Login has no location field and needs
   *  none: logout leaves the device set up, so the stored one still stands. */
  login: (
    username: string,
    password: string,
    location?: SetupLocation,
  ) => Promise<ApiResult<LoginResponse>>;
  setAuthenticated: (userUuid: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'unknown',
  userUuid: null,
  role: null,

  /** Called from SplashScreen — decides where to route based on token state.
   *  Holds for at least SPLASH_MIN_MS so the splash is visible long enough.
   *
   *  No network call happens here (e.g. no silent refresh) — an expired
   *  access token routes straight to Login. That keeps this bounded and
   *  deterministic on poor connectivity; EZ-942's 401 interceptor in
   *  core/api/client.ts still transparently refreshes tokens once the user
   *  is back inside the app. */
  bootstrap: async () => {
    // Fire config sync in parallel — auth routing does not depend on its result.
    // Errors inside syncConfig are swallowed by the store; we never let them surface here.
    void useFeatureConfigStore.getState().syncConfig();
    try {
      const [accessToken, userUuid, locationUuid, basicCredential] = await Promise.all([
        secureStorage.get('accessToken'),
        secureStorage.get('userUuid'),
        secureStorage.get('locationUuid'),
        secureStorage.get('basicCredential'),
        new Promise<void>((resolve) => setTimeout(resolve, SPLASH_MIN_MS)),
      ]);

      const isValid = !!accessToken && !!userUuid && !isJwtExpired(accessToken);
      if (isValid) {
        set({ status: 'authenticated', userUuid });
        return;
      }

      // The SETUP keys answer "has this device been set up", because they are
      // the ones logout leaves alone. Asking the session keys — as this did —
      // meant asking about values endSession had just deleted, so an in-session
      // logout went to Login while a cold start after it went to Setup.
      const isSetUp = !!locationUuid && !!basicCredential;
      set({ status: isSetUp ? 'needsLogin' : 'needsSetup' });
    } catch {
      // SecureStore can throw on certain Android keystores (e.g. first-boot,
      // locked device, or manufacturer keystore errors). Nothing was read, so
      // there's no way to tell a prior session apart from a fresh device —
      // fall back to the safest option that always unblocks navigation.
      set({ status: 'needsSetup' });
    }
  },

  /** Username/password login — EZ-1097. Persists tokens and marks the store
   *  authenticated on success; the caller maps a failed ApiResult to whatever
   *  it wants to show (field errors, an error banner, …). */
  login: async (username: string, password: string, location?: SetupLocation) => {
    const result = await sessionApi.login({ username, password });

    if (result.ok) {
      const { accessToken, refreshToken, sessionId, user, provider } = result.data;
      await secureStorage.set('accessToken', accessToken);
      await secureStorage.set('refreshToken', refreshToken);

      // This is the only moment the password exists, so everything derived
      // from it is minted here or not at all. The credential is what every
      // sync call authenticates with.
      await secureStorage.set('basicCredential', basicAuthHeader(username, password));

      // The rest is a handoff. tbl_user_credentials cannot be written here —
      // the database does not exist until Home runs ensureSchema() — so the
      // whole row waits in the keystore and Home moves it in. The legacy had
      // no such problem: its database always exists.
      const pending: UserCredentialsRow = {
        username: user.username,
        password: await hashPassword(password),
        creator_uuid_cred: user.uuid,
        chwname: user.display,
        provider_uuid_cred: provider.uuid,
      };
      await secureStorage.set('pendingCredentials', JSON.stringify(pending));

      // Setup only. Written BEFORE setAuthenticated, so that by the time the
      // status flips and Home mounts, buildPushBody has a locationUuid to use
      // and bootstrap can see that this device is set up.
      if (location) {
        await secureStorage.set('locationUuid', location.uuid);
        await secureStorage.set('locationName', location.display);
      }

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
    await endSession();
  },
}));

/**
 * The ONE teardown, whatever ended the session. A token expiring used to run
 * none of it: `client.ts` returned before its own catch, so the secrets and
 * the background work both outlived the session on that path.
 *
 * It does NOT delete the database. Logout follows the legacy
 * (`HomeActivity.java:1635-1646`), which clears nothing and walks to Login —
 * only Reset app destroys the local store. The practical reason is the first
 * sync: the archive is the whole location's data, and the pull cursor lives in
 * that database, so deleting it here would re-download everything on the next
 * login. See ARCHITECTURE_RULES §6 "DB lifecycle".
 */
async function endSession(): Promise<void> {
  await secureStorage.clearSession();
  // Not teardown — only readiness. The schema survives, so the next login's
  // Home mount re-runs ensureSchema() (idempotent, two no-op migrations) and,
  // more to the point, re-checks whether the first sync still has to happen.
  useDbBootstrapStore.getState().reset();
  // Moving OFF 'authenticated' is what stops the monitor service and the
  // backbone alarm: App.tsx gates useMonitorService on this very value, and
  // its cleanup calls stopAll(). Both reasons land on Login, because the
  // device is still set up — the setup keys were not touched.
  useAuthStore.setState({ status: 'needsLogin', userUuid: null, role: null });
}

// `client.ts` cannot import this store without closing a cycle through
// session.api.ts, so the transport raises an event and this answers it.
setSessionEndHandler(async (reason: SessionEndReason) => {
  logger.info('[session] ending', reason);
  await endSession();
});
