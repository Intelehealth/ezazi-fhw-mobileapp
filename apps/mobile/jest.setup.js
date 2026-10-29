// @react-native-async-storage/async-storage isn't an Expo package, so
// jest-expo's preset doesn't auto-mock it the way it does expo-* modules —
// any test whose import graph reaches it (backboneTrigger.ts, batteryGuard.ts)
// fails at require() time with "NativeModule: AsyncStorage is null" otherwise.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
