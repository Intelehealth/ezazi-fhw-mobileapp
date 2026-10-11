/**
 * Runs before every suite. Uses `setupFilesAfterEnv` because the jest-expo
 * preset already owns `setupFiles`, and replacing that breaks the RN runtime.
 */

/**
 * expo-crypto is a native module and cannot load in Node, so `randomUUID()`
 * returns undefined and every uuid-minting write dies on NOT NULL. Sequential
 * ids keep repository assertions readable; a suite that cares about the seam
 * itself re-mocks this locally.
 */
let uuidSequence = 0;

jest.mock('expo-crypto', () => ({
  randomUUID: () => `00000000-0000-4000-8000-${String((uuidSequence += 1)).padStart(12, '0')}`,
}));
