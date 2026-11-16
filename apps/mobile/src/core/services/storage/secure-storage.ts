import * as SecureStore from 'expo-secure-store';

/**
 * Encrypted key/value store (iOS Keychain / Android Keystore).
 *
 * Keys come in two groups and the split is the whole point. Logout follows the
 * legacy (`HomeActivity.java:1635-1646`): it deletes nothing and leaves the
 * device set up, so it may only take the session group. Reset app is the one
 * action allowed to take everything. See ARCHITECTURE_RULES §6 "DB lifecycle".
 *
 * There is deliberately no generic `clear()`. A caller that cannot see which
 * group it is wiping is how a logout ends up sending a set-up device back to
 * Setup.
 */

/** Dies at logout. */
const SESSION_KEYS = {
  accessToken: 'auth.access_token',
  refreshToken: 'auth.refresh_token',
  userUuid: 'auth.user_uuid',
} as const;

/**
 * Outlives logout. Captured once at Setup and reused by every later login, so
 * a returning user never re-picks a location.
 *
 * `pendingCredentials` is the odd one: a handoff, not a setting. The database
 * does not exist until Home runs `ensureSchema()`, so login cannot write
 * `tbl_user_credentials` itself — it leaves the whole row here and Home moves
 * it into the table, then removes this key. It sits in this group because a
 * logout before reaching Home must not strand the row forever. It carries a
 * salted hash, never a password.
 */
const SETUP_KEYS = {
  locationUuid: 'setup.location_uuid',
  locationName: 'setup.location_name',
  basicCredential: 'setup.basic_credential',
  credentialSalt: 'setup.credential_salt',
  pendingCredentials: 'setup.pending_credentials',
} as const;

const KEYS = { ...SESSION_KEYS, ...SETUP_KEYS } as const;

export type SecureKey = keyof typeof KEYS;

const names = (group: Record<string, string>): string[] => Object.values(group);

export const secureStorage = {
  async set(key: SecureKey, value: string): Promise<void> {
    await SecureStore.setItemAsync(KEYS[key], value);
  },

  async get(key: SecureKey): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS[key]);
  },

  async remove(key: SecureKey): Promise<void> {
    await SecureStore.deleteItemAsync(KEYS[key]);
  },

  /** Logout, and a failed token refresh. Leaves the device set up. */
  async clearSession(): Promise<void> {
    await Promise.all(names(SESSION_KEYS).map((name) => SecureStore.deleteItemAsync(name)));
  },

  /** Reset app only. Nothing else may call this. */
  async clearAll(): Promise<void> {
    await Promise.all(names(KEYS).map((name) => SecureStore.deleteItemAsync(name)));
  },
};
