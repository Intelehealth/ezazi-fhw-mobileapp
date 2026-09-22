import { createRequestMethods } from '@/core/api/responseHandler';

jest.mock('@/core/api/client', () => ({ apiClient: {} }));
jest.mock('@/core/api/responseHandler', () => ({
  createRequestMethods: jest.fn(() => ({ get: jest.fn(), post: jest.fn() })),
}));

import { sessionApi } from '../session.api';

describe('sessionApi', () => {

  const http = (createRequestMethods as jest.Mock).mock.results[0].value;

  beforeEach(() => {
    (http.get as jest.Mock).mockClear();
    (http.post as jest.Mock).mockClear();
  });

  it('check() GETs /auth/check', () => {
    sessionApi.check();
    expect(http.get).toHaveBeenCalledWith('/auth/check');
  });

  it('login() POSTs credentials to /auth/login with rememberme hardcoded true', () => {
    sessionApi.login({ username: 'nurse1', password: 'secret' });
    expect(http.post).toHaveBeenCalledWith(
      '/auth/login',
      { username: 'nurse1', password: 'secret', rememberme: true },
      expect.anything(),
    );
  });

  it('login() sends a Basic-auth Authorization header encoding username:password', () => {
    sessionApi.login({ username: 'nurse1', password: 'secret' });
    expect(http.post).toHaveBeenCalledWith(
      '/auth/login',
      expect.anything(),
      { headers: { Authorization: 'Basic bnVyc2UxOnNlY3JldA==' } },
    );
  });

  it('refresh() POSTs the refresh token to /auth/refresh', () => {
    sessionApi.refresh('refresh-token-1');
    expect(http.post).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'refresh-token-1' });
  });

  it('logout() POSTs to /auth/logout with no body', () => {
    sessionApi.logout();
    expect(http.post).toHaveBeenCalledWith('/auth/logout');
  });

});
