import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { store } from '../../store/store';

describe('store', () => {
  it('wires auth and config slices under the root reducer', () => {
    const state = store.getState();

    expect(state.auth).toEqual({
      user: null,
      token: null,
      isAuthenticated: false,
    });
    expect(state.config).toEqual({
      data: null,
      error: null,
      lastFetched: null,
    });
  });
});

/**
 * store.ts is a singleton created at import time, so rehydration can only be
 * observed via a fresh module instance — same pattern as config/env.test.ts.
 */
describe('store rehydration from storage', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('restores auth.user from a stored token + user on store creation', async () => {
    const user = {
      uuid: 'u-1',
      username: 'doctor1',
      displayName: 'Demo Male Doctor',
      roles: ['ORGANIZATIONAL: DOCTOR'],
      providerUuid: 'p-1',
      personUuid: 'per-1',
    };
    localStorage.setItem('ezazi_web_auth_token', 'tok-123');
    localStorage.setItem('ezazi_web_auth_user', JSON.stringify(user));

    const { store: freshStore } = await import('../../store/store');

    expect(freshStore.getState().auth).toEqual({
      token: 'tok-123',
      user,
      isAuthenticated: true,
    });
  });

  it('falls back to the unauthenticated default when only a token is stored (no user)', async () => {
    localStorage.setItem('ezazi_web_auth_token', 'tok-123');

    const { store: freshStore } = await import('../../store/store');

    expect(freshStore.getState().auth).toEqual({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  });

  it('falls back to the unauthenticated default when the stored user is malformed JSON', async () => {
    localStorage.setItem('ezazi_web_auth_token', 'tok-123');
    localStorage.setItem('ezazi_web_auth_user', 'not-json');

    const { store: freshStore } = await import('../../store/store');

    expect(freshStore.getState().auth).toEqual({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  });
});
