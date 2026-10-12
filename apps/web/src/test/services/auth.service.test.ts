import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from '../../services/auth.service';
import { authGatewayPublicClient, httpClient } from '../../services/http';
import type { AuthGatewayLoginResponse } from '../../types/auth.types';

vi.mock('../../services/http', () => ({
  httpClient: { post: vi.fn() },
  authGatewayPublicClient: { post: vi.fn() },
}));

beforeEach(() => {
  vi.mocked(httpClient.post).mockClear();
  vi.mocked(authGatewayPublicClient.post).mockClear();
});

const CREDENTIALS = { username: 'doctor1', password: 'secret' };

const RESPONSE: AuthGatewayLoginResponse = {
  accessToken: 'tok-123',
  tokenType: 'Bearer',
  expiresIn: 900,
  refreshToken: 'refresh-123',
  authenticated: true,
  user: {
    uuid: 'u-1',
    username: 'doctor1',
    display: 'Demo Male Doctor',
    roles: ['Organizational: Doctor'],
  },
  provider: {
    uuid: 'p-1',
    display: 'Demo Male Doctor',
    person: { uuid: 'per-1', display: 'Demo Male Doctor' },
  },
};

describe('authService.login', () => {
  it('POSTs the credentials and returns a success result on 2xx', async () => {
    vi.mocked(httpClient.post).mockResolvedValue({ data: RESPONSE });

    const result = await authService.login(CREDENTIALS);

    expect(httpClient.post).toHaveBeenCalledWith('/auth/login', CREDENTIALS);
    expect(result).toEqual({ ok: true, data: RESPONSE });
  });

  it('maps a rejected request into a failure result instead of throwing', async () => {
    vi.mocked(httpClient.post).mockRejectedValue(new Error('network down'));

    const result = await authService.login(CREDENTIALS);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('network down');
    }
  });
});

describe('authService.requestOtp', () => {
  it('POSTs to authGatewayPublicClient (not httpClient) and returns a success result on 2xx', async () => {
    vi.mocked(authGatewayPublicClient.post).mockResolvedValue({
      data: { message: 'If the account exists, an OTP has been sent.' },
    });

    const payload = { otpFor: 'password' as const, phoneNumber: '9876543210', countryCode: '91' };
    const result = await authService.requestOtp(payload);

    expect(authGatewayPublicClient.post).toHaveBeenCalledWith('/auth/requestOtp', payload);
    expect(httpClient.post).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: true,
      data: { message: 'If the account exists, an OTP has been sent.' },
    });
  });

  it('maps a rejected request into a failure result instead of throwing', async () => {
    vi.mocked(authGatewayPublicClient.post).mockRejectedValue(new Error('network down'));

    const result = await authService.requestOtp({ otpFor: 'password', phoneNumber: '9876543210' });

    expect(result.ok).toBe(false);
  });
});

describe('authService.verifyOtp', () => {
  it('POSTs to authGatewayPublicClient and returns userUuid + resetToken on 2xx', async () => {
    const data = { verified: true as const, userUuid: 'u-1', resetToken: 'reset-tok', expiresIn: 300 };
    vi.mocked(authGatewayPublicClient.post).mockResolvedValue({ data });

    const payload = { verifyFor: 'password' as const, phoneNumber: '9876543210', otp: '123456' };
    const result = await authService.verifyOtp(payload);

    expect(authGatewayPublicClient.post).toHaveBeenCalledWith('/auth/verifyOtp', payload);
    expect(result).toEqual({ ok: true, data });
  });

  it('maps a rejected request (e.g. a 401 invalid/expired code) into a failure result', async () => {
    vi.mocked(authGatewayPublicClient.post).mockRejectedValue(new Error('Invalid or expired code'));

    const result = await authService.verifyOtp({
      verifyFor: 'password',
      phoneNumber: '9876543210',
      otp: '000000',
    });

    expect(result.ok).toBe(false);
  });
});

describe('authService.resetPassword', () => {
  it('POSTs to /auth/resetPassword/:userUuid on authGatewayPublicClient', async () => {
    vi.mocked(authGatewayPublicClient.post).mockResolvedValue({
      data: { message: 'Password reset successful.' },
    });

    const payload = { newPassword: 'Abcdef1$', resetToken: 'reset-tok' };
    const result = await authService.resetPassword('u-1', payload);

    expect(authGatewayPublicClient.post).toHaveBeenCalledWith(
      '/auth/resetPassword/u-1',
      payload
    );
    expect(result).toEqual({ ok: true, data: { message: 'Password reset successful.' } });
  });

  it('maps a rejected request (e.g. a stale resetToken) into a failure result', async () => {
    vi.mocked(authGatewayPublicClient.post).mockRejectedValue(
      new Error('Reset token does not match this account')
    );

    const result = await authService.resetPassword('u-1', {
      newPassword: 'Abcdef1$',
      resetToken: 'stale-tok',
    });

    expect(result.ok).toBe(false);
  });
});
