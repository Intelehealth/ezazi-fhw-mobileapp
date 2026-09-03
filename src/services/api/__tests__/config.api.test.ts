import { createApiClient } from '../client/createApiClient';
import { createRequestMethods } from '../responseHandler';
import { ApiError } from '../errors/ApiError';
import type { ConfigResponse } from '@/types/config.types';

jest.mock('@/config/env', () => ({ env: { CONFIG_URL: 'https://config.example.test' } }));
jest.mock('../client/createApiClient', () => ({ createApiClient: jest.fn(() => ({})) }));
jest.mock('../responseHandler', () => ({
  createRequestMethods: jest.fn(() => ({ get: jest.fn() })),
}));

import { fetchPublishedConfig } from '../config.api';

const VALID_CONFIG: ConfigResponse = {
  configVersion: 3,
  featureFlags: { partographSection: true } as ConfigResponse['featureFlags'],
  motherRegFields: { personal: [], address: [], other: [] },
  homeScreen: [],
  supportedLanguages: ['en'],
};

describe('config.api', () => {

  const http = (createRequestMethods as jest.Mock).mock.results[0].value;

  beforeEach(() => {
    (http.get as jest.Mock).mockReset();
  });

  it('creates an unauthenticated client for the config service with a 30s timeout', () => {
    const options = (createApiClient as jest.Mock).mock.calls[0][0];
    expect(options).toMatchObject({ baseURL: 'https://config.example.test', timeout: 30_000 });
    expect(options.getAuthToken).toBeUndefined();
  });

  it('returns the parsed config on a well-shaped response', async () => {
    (http.get as jest.Mock).mockResolvedValue({ ok: true, data: VALID_CONFIG });

    const result = await fetchPublishedConfig();

    expect(http.get).toHaveBeenCalledWith('/api/config/getPublishedConfig');
    expect(result).toEqual({ ok: true, data: VALID_CONFIG });
  });

  it('passes a transport failure straight through unchanged', async () => {
    const transportFailure = { ok: false as const, error: new ApiError('network', 'down') };
    (http.get as jest.Mock).mockResolvedValue(transportFailure);

    const result = await fetchPublishedConfig();

    expect(result).toBe(transportFailure);
  });

  it('fails with an ApiError when the response is missing required fields', async () => {
    (http.get as jest.Mock).mockResolvedValue({ ok: true, data: { unexpected: true } });

    const result = await fetchPublishedConfig();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ApiError);
      expect(result.error.message).toBe('Config response missing required fields');
    }
  });

  it('fails when featureFlags is missing even if configVersion is valid', async () => {
    (http.get as jest.Mock).mockResolvedValue({ ok: true, data: { configVersion: 1 } });

    const result = await fetchPublishedConfig();

    expect(result.ok).toBe(false);
  });

});
