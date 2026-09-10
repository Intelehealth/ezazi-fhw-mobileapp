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

  it('requestOtp() POSTs to /auth/requestOtp', () => {
    const body = { phone: '9999999999', countryCode: '+977' };
    passwordApi.requestOtp(body);
    expect(http.post).toHaveBeenCalledWith('/auth/requestOtp', body);
  });

  it('verifyOtp() POSTs to /auth/verifyOtp', () => {
    const body = { phone: '9999999999', code: '123456' };
    passwordApi.verifyOtp(body);
    expect(http.post).toHaveBeenCalledWith('/auth/verifyOtp', body);
  });

  it('resetPassword() POSTs to /auth/resetPassword/:userUuid with the full body', () => {
    const body = { userUuid: 'u-1', newPassword: 'new-pass', otpToken: 'otp-1' };
    passwordApi.resetPassword(body);
    expect(http.post).toHaveBeenCalledWith('/auth/resetPassword/u-1', body);
  });

});
