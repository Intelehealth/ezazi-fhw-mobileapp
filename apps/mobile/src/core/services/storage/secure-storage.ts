import * as SecureStore from 'expo-secure-store';

/**
 * Encrypted key/value store (iOS Keychain / Android Keystore).
 * Use this for JWT, refresh token, and any sensitive small data.
 */

const KEYS = {
  accessToken: 'auth.access_token',
  refreshToken: 'auth.refresh_token',
  userUuid: 'auth.user_uuid',
} as const;

export type SecureKey = keyof typeof KEYS;

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

  async clear(): Promise<void> {
    await Promise.all(
      (Object.keys(KEYS) as SecureKey[]).map((k) => SecureStore.deleteItemAsync(KEYS[k])),
    );
  },
};
