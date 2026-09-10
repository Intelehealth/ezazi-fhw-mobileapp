import type { AppConfig } from '@ezazi/types';
import { describe, expect, it, vi } from 'vitest';
import { configService } from '../../services/config.service';
import { publicHttpClient } from '../../services/http';

vi.mock('../../services/http', () => ({
  publicHttpClient: { get: vi.fn() },
}));

const CONFIG = { captchaSiteKey: 'site-key' } as unknown as AppConfig;

describe('configService.getPublishedConfig', () => {
  it('GETs the published config and returns a success result on 2xx', async () => {
    vi.mocked(publicHttpClient.get).mockResolvedValue({ data: CONFIG });

    const result = await configService.getPublishedConfig();

    expect(publicHttpClient.get).toHaveBeenCalledWith(
      '/api/config/getPublishedConfig'
    );
    expect(result).toEqual({ ok: true, data: CONFIG });
  });

  it('maps a rejected request into a failure result instead of throwing', async () => {
    vi.mocked(publicHttpClient.get).mockRejectedValue(new Error('boom'));

    const result = await configService.getPublishedConfig();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe('boom');
    }
  });
});
