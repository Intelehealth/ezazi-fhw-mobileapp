import { describe, expect, it } from 'vitest';
import {
  authReducer,
  loggedOut,
  loginSuccess,
} from '../../reducers/auth.reducer';
import type { AuthUser } from '../../types/auth.types';

const USER: AuthUser = {
  uuid: 'u-1',
  username: 'doctor1',
  displayName: 'Demo Male Doctor',
  roles: ['ORGANIZATIONAL: DOCTOR'],
};

describe('authReducer', () => {
  it('starts signed out', () => {
    expect(authReducer(undefined, { type: '@@INIT' })).toEqual({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  });

  it('stores the token and user on loginSuccess', () => {
    const state = authReducer(
      undefined,
      loginSuccess({ token: 'tok-123', user: USER })
    );

    expect(state).toEqual({
      user: USER,
      token: 'tok-123',
      isAuthenticated: true,
    });
  });

  it('resets to the signed-out initial state on loggedOut', () => {
    const signedIn = authReducer(
      undefined,
      loginSuccess({ token: 'tok-123', user: USER })
    );

    const state = authReducer(signedIn, loggedOut());

    expect(state).toEqual({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  });
});
