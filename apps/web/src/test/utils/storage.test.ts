import { describe, expect, it } from 'vitest';
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
});
