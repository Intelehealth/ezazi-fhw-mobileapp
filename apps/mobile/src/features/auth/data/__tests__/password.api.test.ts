import { createRequestMethods } from '@/core/api/responseHandler';

jest.mock('@/core/api/client', () => ({ apiClient: {} }));
jest.mock('@/core/api/responseHandler', () => ({
  createRequestMethods: jest.fn(() => ({ get: jest.fn(), post: jest.fn() })),
}));

import { passwordApi } from '../password.api';

describe('passwordApi', () => {

  const http = (createRequestMethods as jest.Mock).mock.results[0].value;

  beforeEach(() => {
    (http.post as jest.Mock).mockClear();
  });

  // Field names/shape verified against the legacy Android app
  // (ui/password/model/*.java) — see password.api.ts's doc comment.

  it('requestOtp() POSTs to /auth/requestOtp with otpFor/source baked in', () => {
    passwordApi.requestOtp({ phoneNumber: '9999999999', countryCode: '977' });
    expect(http.post).toHaveBeenCalledWith('/auth/requestOtp', {
      otpFor: 'password',
      phoneNumber: '9999999999',
      countryCode: '977',
      source: 'mobile',
    });
  });

  it('verifyOtp() POSTs to /auth/verifyOtp with verifyFor baked in', () => {
    passwordApi.verifyOtp({ phoneNumber: '9999999999', countryCode: '977', otp: '123456' });
    expect(http.post).toHaveBeenCalledWith('/auth/verifyOtp', {
      verifyFor: 'password',
      phoneNumber: '9999999999',
      countryCode: '977',
      otp: '123456',
    });
  });

  it('resetPassword() POSTs to /auth/resetPassword/:userUuid with newPassword and resetToken', () => {
    passwordApi.resetPassword({ userUuid: 'u-1', newPassword: 'new-pass', resetToken: 'reset-jwt' });
    expect(http.post).toHaveBeenCalledWith('/auth/resetPassword/u-1', {
      newPassword: 'new-pass',
      resetToken: 'reset-jwt',
    });
  });

});
