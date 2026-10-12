/**
 * Global mocks for native modules that have no implementation under Node.
 *
 * Wired through `setupFilesAfterEnv` (jest.config.js). Jest CONCATENATES the
 * preset's setup entries with the project's rather than replacing them
 * (jest-config/normalize.js), so the jest-expo preset's own setup still runs
 * either way — `setupFilesAfterEnv` is chosen because it runs after the test
 * framework is installed, which keeps `expect`/`beforeEach` usable here.
 */

/**
 * Under Jest `expo-crypto.randomUUID()` does not return a usable id, so every
 * uuid-minting write dies on the TEXT PRIMARY KEY. Repositories reach it only
 * through `core/db/uuid.ts`, so mocking the module covers all of them.
 * Sequential ids keep repository assertions readable; a suite that cares about
 * the seam itself re-mocks this locally.
 */
let uuidSequence = 0;

jest.mock('expo-crypto', () => ({
  randomUUID: () => `00000000-0000-4000-8000-${String((uuidSequence += 1)).padStart(12, '0')}`,
}));

// @react-native-async-storage/async-storage isn't an Expo package, so
// jest-expo's preset doesn't auto-mock it the way it does expo-* modules —
// any test whose import graph reaches it (backboneTrigger.ts, batteryGuard.ts)
// fails at require() time with "NativeModule: AsyncStorage is null" otherwise.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
