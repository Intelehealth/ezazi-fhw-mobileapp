import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { storage } from '../../utils/storage';

describe('storage', () => {
  it('round-trips the auth token through localStorage under its own key', () => {
    expect(storage.getAuthToken()).toBeNull();

    storage.setAuthToken('tok-123');
    expect(storage.getAuthToken()).toBe('tok-123');
    expect(localStorage.getItem('ezazi_web_auth_token')).toBe('tok-123');

    storage.clearAuthToken();
    expect(storage.getAuthToken()).toBeNull();
  });

  it('round-trips the stored user through localStorage under its own key', () => {
    expect(storage.getStoredUser()).toBeNull();

    storage.setStoredUser('{"uuid":"u-1"}');
    expect(storage.getStoredUser()).toBe('{"uuid":"u-1"}');
    expect(localStorage.getItem('ezazi_web_auth_user')).toBe('{"uuid":"u-1"}');

    storage.clearStoredUser();
    expect(storage.getStoredUser()).toBeNull();
  });

  it('keeps the auth token and stored user independent', () => {
    storage.setAuthToken('tok-123');
    storage.setStoredUser('{"uuid":"u-1"}');

    storage.clearAuthToken();

    expect(storage.getAuthToken()).toBeNull();
    expect(storage.getStoredUser()).toBe('{"uuid":"u-1"}');
  });

  describe('session tokens', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('stores the access token, refresh token and an expiry stamp together', () => {
      storage.setSessionTokens({
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
        expiresIn: 900,
      });

      expect(storage.getAuthToken()).toBe('access-1');
      expect(storage.getRefreshToken()).toBe('refresh-1');
      expect(storage.getAuthTokenExpiresAt()).toBe(Date.now() + 900_000);
      expect(localStorage.getItem('ezazi_web_refresh_token')).toBe('refresh-1');
    });

    it('clearAuthToken removes the refresh token and the expiry stamp too', () => {
      storage.setSessionTokens({
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
        expiresIn: 900,
      });

      storage.clearAuthToken();

      expect(storage.getAuthToken()).toBeNull();
      expect(storage.getRefreshToken()).toBeNull();
      expect(storage.getAuthTokenExpiresAt()).toBeNull();
    });

    it('reports an unknown expiry when none is stored or the stored value is not a number', () => {
      expect(storage.getAuthTokenExpiresAt()).toBeNull();

      localStorage.setItem('ezazi_web_auth_token_expires_at', 'soon');
      expect(storage.getAuthTokenExpiresAt()).toBeNull();
    });
  });

  describe('isSessionKey', () => {
    it('is true for the token and user keys, and for a full clear (null key)', () => {
      expect(storage.isSessionKey('ezazi_web_auth_token')).toBe(true);
      expect(storage.isSessionKey('ezazi_web_auth_user')).toBe(true);
      expect(storage.isSessionKey(null)).toBe(true);
    });

    it('is false for anything else', () => {
      expect(storage.isSessionKey('ezazi_web_refresh_token')).toBe(false);
      expect(storage.isSessionKey('i18nextLng')).toBe(false);
    });
  });
});
