import * as Crypto from 'expo-crypto';

/**
 * RFC 4122 v4 UUID, matching Java's `UUID.randomUUID().toString()`.
 * Every `uuid` PK is client-generated — the device mints ids offline and the
 * server accepts them on push. Repositories import this, never expo-crypto.
 */
export function newUuid(): string {
  return Crypto.randomUUID();
}
