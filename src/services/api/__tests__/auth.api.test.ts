import { createRequestMethods } from '../responseHandler';

jest.mock('../client', () => ({ apiClient: {} }));
jest.mock('../responseHandler', () => ({
  createRequestMethods: jest.fn(() => ({ get: jest.fn(), post: jest.fn() })),
}));

import { authApi } from '../auth.api';

describe('authApi', () => {

  const http = (createRequestMethods as jest.Mock).mock.results[0].value;

  beforeEach(() => {
    (http.get as jest.Mock).mockClear();
    (http.post as jest.Mock).mockClear();
  });

  it('check() GETs /auth/check', () => {
    authApi.check();
    expect(http.get).toHaveBeenCalledWith('/auth/check');
  });

  it('login() POSTs credentials to /auth/login with rememberme hardcoded true', () => {
    authApi.login({ username: 'nurse1', password: 'secret' });
    expect(http.post).toHaveBeenCalledWith(
      '/auth/login',
      { username: 'nurse1', password: 'secret', rememberme: true },
      expect.anything(),
    );
  });

  it('login() sends a Basic-auth Authorization header encoding username:password', () => {
    authApi.login({ username: 'nurse1', password: 'secret' });
    expect(http.post).toHaveBeenCalledWith(
      '/auth/login',
      expect.anything(),
      { headers: { Authorization: 'Basic bnVyc2UxOnNlY3JldA==' } },
    );
  });

  it('requestOtp() POSTs to /auth/requestOtp', () => {
    const body = { phone: '9999999999', countryCode: '+977' };
    authApi.requestOtp(body);
    expect(http.post).toHaveBeenCalledWith('/auth/requestOtp', body);
  });

  it('verifyOtp() POSTs to /auth/verifyOtp', () => {
    const body = { phone: '9999999999', code: '123456' };
    authApi.verifyOtp(body);
    expect(http.post).toHaveBeenCalledWith('/auth/verifyOtp', body);
  });

  it('resetPassword() POSTs to /auth/resetPassword/:userUuid with the full body', () => {
    const body = { userUuid: 'u-1', newPassword: 'new-pass', otpToken: 'otp-1' };
    authApi.resetPassword(body);
    expect(http.post).toHaveBeenCalledWith('/auth/resetPassword/u-1', body);
  });

  it('refresh() POSTs the refresh token to /auth/refresh', () => {
    authApi.refresh('refresh-token-1');
    expect(http.post).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'refresh-token-1' });
  });

  it('logout() POSTs to /auth/logout with no body', () => {
    authApi.logout();
    expect(http.post).toHaveBeenCalledWith('/auth/logout');
  });

});
