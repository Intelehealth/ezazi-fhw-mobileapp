import { describe, expect, it, vi } from 'vitest';
import {
  configReducer,
  setConfig,
  setConfigError,
} from '../../reducers/config.reducer';
import type { AppConfig } from '@ezazi/types';

const CONFIG = { captchaSiteKey: 'site-key' } as unknown as AppConfig;

describe('configReducer', () => {
  it('starts with no data, error, or fetch timestamp', () => {
    expect(configReducer(undefined, { type: '@@INIT' })).toEqual({
      data: null,
      error: null,
      lastFetched: null,
    });
  });

  it('stores the config and clears any prior error on setConfig', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const state = configReducer(
      { data: null, error: 'stale error', lastFetched: null },
      setConfig(CONFIG)
    );

    expect(state).toEqual({
      data: CONFIG,
      error: null,
      lastFetched: new Date('2026-01-01T00:00:00.000Z').getTime(),
    });

    vi.useRealTimers();
  });

  it('records the error message on setConfigError without touching existing data', () => {
    const state = configReducer(
      { data: CONFIG, error: null, lastFetched: 123 },
      setConfigError('network down')
    );

    expect(state).toEqual({
      data: CONFIG,
      error: 'network down',
      lastFetched: 123,
    });
  });
});
