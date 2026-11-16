import * as Crypto from 'expo-crypto';

import { secureStorage } from '@/core/services/storage/secure-storage';

/**
 * Password hashing for `tbl_user_credentials`.
 *
 * The legacy stores a hash in that table's `password` column, never the
 * password itself: `SetupActivity.java:585-588` computes
 * `SHA256(salt + PASSWORD)` and `:596` writes the result. We do the same.
 *
 * The salt differs on purpose. The legacy reads it from `assets/salt.env`, a
 * file shipped inside the APK — its local variable is called `random_salt`,
 * but the line that would have made it random is commented out directly
 * above. Ours is generated once per device and kept in the Keystore, so no
 * secret rides in the bundle. The hash is only ever compared on-device
 * (`OfflineLogin` is its only reader in the legacy), so it does not have to
 * match the legacy's value — only stay stable across our own builds. Reset
 * app clears the salt along with the row it protects.
 */

const SALT_BYTES = 16;

/** Collapses concurrent callers so two logins cannot mint two salts, which
 *  would leave the second hash unverifiable against the first. Cleared on
 *  settle, so a Reset app in between is read fresh rather than served stale. */
let pending: Promise<string> | null = null;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function readOrMintSalt(): Promise<string> {
  const existing = await secureStorage.get('credentialSalt');
  if (existing) return existing;

  const salt = toHex(await Crypto.getRandomBytesAsync(SALT_BYTES));
  await secureStorage.set('credentialSalt', salt);
  return salt;
}

function getSalt(): Promise<string> {
  pending ??= readOrMintSalt().finally(() => {
    pending = null;
  });
  return pending;
}

/** Lowercase hex, which is `digestStringAsync`'s default encoding. */
export async function hashPassword(password: string): Promise<string> {
  const salt = await getSalt();
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, salt + password);
}
