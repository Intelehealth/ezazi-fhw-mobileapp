import { describe, expect, it } from 'vitest';
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
