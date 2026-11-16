import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackHandler, Platform } from 'react-native';

import { deleteArchive } from '@/core/api/archive.api';
import { teardownDb } from '@/core/db/teardown';
import { secureStorage } from '@/core/services/storage/secure-storage';
import { useAuthStore } from '@/core/session/auth.store';

jest.mock('@react-native-async-storage/async-storage', () => ({ clear: jest.fn() }));
jest.mock('@/core/db/teardown', () => ({ teardownDb: jest.fn() }));
jest.mock('@/core/api/archive.api', () => ({ deleteArchive: jest.fn() }));
jest.mock('@/core/services/storage/secure-storage', () => ({
  secureStorage: { get: jest.fn(), set: jest.fn(), remove: jest.fn(), clearSession: jest.fn(), clearAll: jest.fn() },
}));
jest.mock('@/core/session/dbBootstrap.store', () => ({
  useDbBootstrapStore: { getState: () => ({ reset: jest.fn() }) },
}));
jest.mock('@/core/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { resetApp } from '../resetApp';

/**
 * The property that matters: no single failure may leave the device half
 * wiped. A keystore still holding a working server credential after a reset
 * the user asked for is worse than either clean outcome.
 */

describe('resetApp', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (secureStorage.clearAll as jest.Mock).mockResolvedValue(undefined);
    (teardownDb as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.clear as jest.Mock).mockResolvedValue(undefined);
    jest.spyOn(BackHandler, 'exitApp').mockImplementation(() => undefined);
    // The preset does not default to android, and this is an Android app.
    Platform.OS = 'android';
    useAuthStore.setState({ status: 'authenticated', userUuid: 'user-1', role: 'fhw' });
  });

  it('clears all three stores and the archive', async () => {
    await resetApp();

    expect(secureStorage.clearAll).toHaveBeenCalledTimes(1);
    expect(teardownDb).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.clear).toHaveBeenCalledTimes(1);
    expect(deleteArchive).toHaveBeenCalledTimes(1);
  });

  it('takes the keystore even when async storage refuses to clear', async () => {
    (AsyncStorage.clear as jest.Mock).mockRejectedValue(new Error('disk full'));

    await resetApp();

    expect(secureStorage.clearAll).toHaveBeenCalledTimes(1);
    expect(teardownDb).toHaveBeenCalledTimes(1);
  });

  it('clears the rest even when the database will not go', async () => {
    (teardownDb as jest.Mock).mockRejectedValue(new Error('locked'));

    await resetApp();

    expect(secureStorage.clearAll).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.clear).toHaveBeenCalledTimes(1);
  });

  it('does not reject when a store fails', async () => {
    (secureStorage.clearAll as jest.Mock).mockRejectedValue(new Error('keystore locked'));

    await expect(resetApp()).resolves.toBeUndefined();
  });

  it('still wipes when the archive refuses to delete', async () => {
    (deleteArchive as jest.Mock).mockImplementation(() => {
      throw new Error('in use');
    });

    await expect(resetApp()).resolves.toBeUndefined();
    expect(secureStorage.clearAll).toHaveBeenCalledTimes(1);
  });

  it('leaves the app needing setup, not login', async () => {
    // The setup keys are gone, so the device is no longer set up. Only
    // observable if exitApp does not fire.
    await resetApp();

    expect(useAuthStore.getState()).toMatchObject({
      status: 'needsSetup',
      userUuid: null,
      role: null,
    });
  });

  it('quits on Android', async () => {
    await resetApp();

    expect(BackHandler.exitApp).toHaveBeenCalledTimes(1);
  });

  it('wipes without quitting on iOS, which has no API for it', async () => {
    Platform.OS = 'ios';

    await resetApp();

    expect(secureStorage.clearAll).toHaveBeenCalledTimes(1);
    expect(BackHandler.exitApp).not.toHaveBeenCalled();

    Platform.OS = 'android';
  });
});
