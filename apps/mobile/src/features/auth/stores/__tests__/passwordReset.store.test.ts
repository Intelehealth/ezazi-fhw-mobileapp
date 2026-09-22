import { passwordApi } from '@/features/auth/data/password.api';

jest.mock('@/features/auth/data/password.api', () => ({
  passwordApi: {
    requestOtp: jest.fn(),
    verifyOtp: jest.fn(),
    resetPassword: jest.fn(),
  },
}));

import { usePasswordResetStore } from '../passwordReset.store';

describe('usePasswordResetStore', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestOtp', () => {
    it('forwards params to passwordApi and returns a successful result as-is', async () => {
      const response = { ok: true, data: { message: 'If the account exists, an OTP has been sent.' } };
      (passwordApi.requestOtp as jest.Mock).mockResolvedValue(response);

      const result = await usePasswordResetStore.getState().requestOtp({
        phoneNumber: '9999999999',
        countryCode: '977',
      });

      expect(passwordApi.requestOtp).toHaveBeenCalledWith({ phoneNumber: '9999999999', countryCode: '977' });
      expect(result).toEqual(response);
    });

    it('returns the failed result unchanged (console-only logging, never surfaced)', async () => {
      const apiError = { kind: 'network', status: 0, code: undefined, message: 'Network Error' };
      (passwordApi.requestOtp as jest.Mock).mockResolvedValue({ ok: false, error: apiError });

      const result = await usePasswordResetStore.getState().requestOtp({
        phoneNumber: '9999999999',
        countryCode: '977',
      });

      expect(result).toEqual({ ok: false, error: apiError });
    });
  });

  describe('verifyOtp', () => {
    it('forwards params to passwordApi and returns a successful result as-is', async () => {
      const response = {
        ok: true,
        data: { verified: true, userUuid: 'u-1', resetToken: 'reset-jwt', expiresIn: 600 },
      };
      (passwordApi.verifyOtp as jest.Mock).mockResolvedValue(response);

      const result = await usePasswordResetStore.getState().verifyOtp({
        phoneNumber: '9999999999',
        countryCode: '977',
        otp: '123456',
      });

      expect(passwordApi.verifyOtp).toHaveBeenCalledWith({
        phoneNumber: '9999999999',
        countryCode: '977',
        otp: '123456',
      });
      expect(result).toEqual(response);
    });

    it('returns the failed result unchanged for a wrong/expired code', async () => {
      const apiError = { kind: 'unauthorized', status: 401, code: 'INVALID_OTP', message: 'Invalid or expired code' };
      (passwordApi.verifyOtp as jest.Mock).mockResolvedValue({ ok: false, error: apiError });

      const result = await usePasswordResetStore.getState().verifyOtp({
        phoneNumber: '9999999999',
        countryCode: '977',
        otp: '000000',
      });

      expect(result).toEqual({ ok: false, error: apiError });
    });
  });

  describe('resetPassword', () => {
    it('forwards params to passwordApi and returns a successful result as-is', async () => {
      const response = { ok: true, data: { userUuid: 'u-1', providerUuid: 'p-1', role: 'nurse' } };
      (passwordApi.resetPassword as jest.Mock).mockResolvedValue(response);

      const result = await usePasswordResetStore.getState().resetPassword({
        userUuid: 'u-1',
        newPassword: 'Nurse@1245',
        resetToken: 'reset-jwt',
      });

      expect(passwordApi.resetPassword).toHaveBeenCalledWith({
        userUuid: 'u-1',
        newPassword: 'Nurse@1245',
        resetToken: 'reset-jwt',
      });
      expect(result).toEqual(response);
    });

    it('returns the failed result unchanged', async () => {
      const apiError = { kind: 'server', status: 500, code: undefined, message: 'boom' };
      (passwordApi.resetPassword as jest.Mock).mockResolvedValue({ ok: false, error: apiError });

      const result = await usePasswordResetStore.getState().resetPassword({
        userUuid: 'u-1',
        newPassword: 'Nurse@1245',
        resetToken: 'reset-jwt',
      });

      expect(result).toEqual({ ok: false, error: apiError });
    });
  });

});
