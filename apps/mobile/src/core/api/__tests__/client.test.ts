import axios from 'axios';
import { secureStorage } from '@/core/services/storage/secure-storage';
import { logger } from '@/core/utils/logger';
import { createApiClient } from '@ezazi/api-client';
import { requestSessionEnd } from '@/core/session/sessionEnd';

jest.mock('@/core/config/env', () => ({ env: { AUTH_GATEWAY_URL: 'https://auth.example.test' } }));
jest.mock('@/core/services/storage/secure-storage', () => ({
  secureStorage: { get: jest.fn(), set: jest.fn(), clear: jest.fn() },
}));
jest.mock('@/core/utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn() } }));
jest.mock('@/core/session/sessionEnd', () => ({ requestSessionEnd: jest.fn() }));
jest.mock('@ezazi/api-client', () => ({
  ...jest.requireActual('@ezazi/api-client'),
  createApiClient: jest.fn(() => ({
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  })),
}));

import '../client';

describe('apiClient (auth-gateway client)', () => {

  const options = (createApiClient as jest.Mock).mock.calls[0][0];
  let postSpy: jest.SpyInstance;

  beforeEach(() => {
    (secureStorage.get as jest.Mock).mockReset();
    (secureStorage.set as jest.Mock).mockReset();
    (secureStorage.clear as jest.Mock).mockReset();
    (logger.info as jest.Mock).mockReset();
    (logger.warn as jest.Mock).mockReset();
    postSpy = jest.spyOn(axios, 'post').mockReset();
    (requestSessionEnd as jest.Mock).mockReset();
  });

  afterEach(() => {
    postSpy.mockRestore();
  });

  it('is created with the auth-gateway baseURL and a 15s timeout', () => {
    expect(options).toMatchObject({ baseURL: 'https://auth.example.test', timeout: 15000 });
  });

  // ── getAuthToken ─────────────────────────────────────────────────────────

  describe('getAuthToken', () => {
    it('reads the access token from secure storage', async () => {
      (secureStorage.get as jest.Mock).mockResolvedValue('stored-access-token');

      await expect(options.getAuthToken()).resolves.toBe('stored-access-token');
      expect(secureStorage.get).toHaveBeenCalledWith('accessToken');
    });
  });

  // ── onUnauthorized (refresh-on-401) ──────────────────────────────────────

  describe('onUnauthorized', () => {
    it('returns null without a network call when there is no refresh token', async () => {
      (secureStorage.get as jest.Mock).mockResolvedValue(null);

      const result = await options.onUnauthorized();

      expect(result).toBeNull();
      expect(postSpy).not.toHaveBeenCalled();
    });

    it('ends the session when there is no refresh token', async () => {
      // This path returns before the catch below, so it used to clear nothing
      // and leave the database and the background work on a logged-out device.
      (secureStorage.get as jest.Mock).mockResolvedValue(null);

      await options.onUnauthorized();

      expect(requestSessionEnd).toHaveBeenCalledWith('tokenExpired');
    });

    it('posts the refresh token, persists the new tokens, and returns the new access token', async () => {
      (secureStorage.get as jest.Mock).mockResolvedValue('stored-refresh-token');
      postSpy.mockResolvedValue({ data: { accessToken: 'new-access', refreshToken: 'new-refresh' } });

      const result = await options.onUnauthorized();

      expect(postSpy).toHaveBeenCalledWith('https://auth.example.test/auth/refresh', {
        refreshToken: 'stored-refresh-token',
      });
      expect(secureStorage.set).toHaveBeenCalledWith('accessToken', 'new-access');
      expect(secureStorage.set).toHaveBeenCalledWith('refreshToken', 'new-refresh');
      expect(result).toBe('new-access');
    });

    it('clears storage and returns null when the refresh call fails', async () => {
      (secureStorage.get as jest.Mock).mockResolvedValue('stored-refresh-token');
      postSpy.mockRejectedValue(new Error('refresh failed'));

      const result = await options.onUnauthorized();

      // logger.info, not .warn — must never trigger React Native's LogBox on screen.
      expect(logger.info).toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
      expect(secureStorage.clear).toHaveBeenCalledTimes(1);
      expect(requestSessionEnd).toHaveBeenCalledWith('tokenExpired');
      expect(result).toBeNull();
    });

    it('dedupes concurrent refresh calls into a single network request', async () => {
      (secureStorage.get as jest.Mock).mockResolvedValue('stored-refresh-token');
      postSpy.mockResolvedValue({ data: { accessToken: 'new-access', refreshToken: 'new-refresh' } });

      const [first, second] = await Promise.all([options.onUnauthorized(), options.onUnauthorized()]);

      expect(postSpy).toHaveBeenCalledTimes(1);
      expect(first).toBe('new-access');
      expect(second).toBe('new-access');
    });

    it('releases the in-flight lock after a no-refresh-token exit, so a later call retries', async () => {
      (secureStorage.get as jest.Mock).mockResolvedValue(null);
      await options.onUnauthorized();

      (secureStorage.get as jest.Mock).mockResolvedValue('stored-refresh-token');
      postSpy.mockResolvedValue({ data: { accessToken: 'new-access', refreshToken: 'new-refresh' } });
      const result = await options.onUnauthorized();

      expect(postSpy).toHaveBeenCalledTimes(1);
      expect(result).toBe('new-access');
    });

    it('releases the in-flight lock after a failed refresh, so a later call retries', async () => {
      (secureStorage.get as jest.Mock).mockResolvedValue('stored-refresh-token');
      postSpy.mockRejectedValue(new Error('refresh failed'));
      await options.onUnauthorized();

      postSpy.mockResolvedValue({ data: { accessToken: 'new-access', refreshToken: 'new-refresh' } });
      const result = await options.onUnauthorized();

      expect(postSpy).toHaveBeenCalledTimes(2);
      expect(result).toBe('new-access');
    });
  });

});
