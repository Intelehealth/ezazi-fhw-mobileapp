import axios from 'axios';
import { secureStorage } from '@/services/storage/secure-storage';
import { logger } from '@/utils/logger';
import { createApiClient } from '../client/createApiClient';

jest.mock('@/config/env', () => ({ env: { AUTH_GATEWAY_URL: 'https://auth.example.test' } }));
jest.mock('@/services/storage/secure-storage', () => ({
  secureStorage: { get: jest.fn(), set: jest.fn(), clear: jest.fn() },
}));
jest.mock('@/utils/logger', () => ({ logger: { warn: jest.fn() } }));
jest.mock('../client/createApiClient', () => ({ createApiClient: jest.fn(() => ({})) }));

import '../client';

describe('apiClient (auth-gateway client)', () => {

  const options = (createApiClient as jest.Mock).mock.calls[0][0];
  let postSpy: jest.SpyInstance;

  beforeEach(() => {
    (secureStorage.get as jest.Mock).mockReset();
    (secureStorage.set as jest.Mock).mockReset();
    (secureStorage.clear as jest.Mock).mockReset();
    (logger.warn as jest.Mock).mockReset();
    postSpy = jest.spyOn(axios, 'post').mockReset();
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

      expect(logger.warn).toHaveBeenCalled();
      expect(secureStorage.clear).toHaveBeenCalledTimes(1);
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
