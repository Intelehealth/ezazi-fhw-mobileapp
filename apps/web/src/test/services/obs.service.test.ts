import { AxiosError, AxiosHeaders } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { obsService } from '../../services/obs.service';
import { openMrsHttpClient } from '../../services/http';

vi.mock('../../services/http', () => ({
  openMrsHttpClient: { post: vi.fn(), delete: vi.fn() },
}));

/* A real AxiosError, so mapAxiosError classifies it the way it would in the app. */
function httpError(status: number): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data: {},
  });
}

const SAVED = {
  uuid: 'obs-1',
  value: 'Rest',
  obsDatetime: '2026-11-02T00:00:00.000Z',
};

beforeEach(() => {
  vi.mocked(openMrsHttpClient.post).mockReset();
  vi.mocked(openMrsHttpClient.delete).mockReset();
});

describe('obsService', () => {
  it('creates an obs with POST /obs', async () => {
    vi.mocked(openMrsHttpClient.post).mockResolvedValue({ data: SAVED });
    const payload = {
      concept: 'concept-1',
      person: 'patient-1',
      obsDatetime: '2026-11-02T00:00:00.000Z',
      value: 'Rest',
      encounter: 'enc-1',
    };

    const result = await obsService.createObs(payload);

    expect(openMrsHttpClient.post).toHaveBeenCalledWith('/obs', payload);
    expect(result).toEqual({ ok: true, data: SAVED });
  });

  it('updates an obs with POST /obs/{uuid}', async () => {
    vi.mocked(openMrsHttpClient.post).mockResolvedValue({ data: SAVED });

    const result = await obsService.updateObs('obs-1', { value: 'Rest' });

    expect(openMrsHttpClient.post).toHaveBeenCalledWith('/obs/obs-1', {
      value: 'Rest',
    });
    expect(result).toEqual({ ok: true, data: SAVED });
  });

  it('voids an obs with DELETE /obs/{uuid}', async () => {
    vi.mocked(openMrsHttpClient.delete).mockResolvedValue({ data: '' });

    const result = await obsService.deleteObs('obs-1');

    expect(openMrsHttpClient.delete).toHaveBeenCalledWith('/obs/obs-1');
    expect(result).toEqual({ ok: true, data: null });
  });

  it.each([
    ['createObs', () => obsService.createObs({} as never), 'post'],
    ['updateObs', () => obsService.updateObs('obs-1', { value: '' }), 'post'],
    ['deleteObs', () => obsService.deleteObs('obs-1'), 'delete'],
  ] as const)('%s reports a failed request', async (_, call, method) => {
    vi.mocked(openMrsHttpClient[method]).mockRejectedValue(httpError(500));

    const result = await call();

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.kind).toBe('server');
  });
});
