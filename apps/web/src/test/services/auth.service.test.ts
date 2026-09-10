import { describe, expect, it, vi } from 'vitest';
import { authService } from '../../services/auth.service';
import { httpClient } from '../../services/http';
import type { AuthGatewayLoginResponse } from '../../types/auth.types';

vi.mock('../../services/http', () => ({
  httpClient: { post: vi.fn() },
}));

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
