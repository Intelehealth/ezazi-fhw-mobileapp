import { configStorage } from '@/services/storage/config-storage';
import { fetchPublishedConfig } from '@/services/api/config.api';
import { defaultConfigResponse, defaultFeatureFlags } from '@/types/config.types';
import type { ConfigResponse } from '@/types/config.types';

jest.mock('@/services/storage/config-storage', () => ({
  configStorage: { load: jest.fn(), loadVersion: jest.fn(), save: jest.fn() },
}));
jest.mock('@/services/api/config.api', () => ({
  fetchPublishedConfig: jest.fn(),
}));
jest.mock('@/utils/logger', () => ({ logger: { debug: jest.fn() } }));

import { useFeatureConfigStore } from '../featureConfig.store';

const REMOTE_CONFIG: ConfigResponse = {
  configVersion: 5,
  featureFlags: { ...defaultFeatureFlags, chatSection: false },
  motherRegFields: { personal: [], address: [], other: [] },
  homeScreen: [],
  supportedLanguages: ['en', 'ne'],
};

function withoutFlag<K extends keyof ConfigResponse['featureFlags']>(
  flags: ConfigResponse['featureFlags'],
  key: K,
): ConfigResponse['featureFlags'] {
  return Object.fromEntries(
    Object.entries(flags).filter(([k]) => k !== key),
  ) as ConfigResponse['featureFlags'];
}

describe('useFeatureConfigStore', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    useFeatureConfigStore.setState({
      flags: defaultFeatureFlags,
      config: defaultConfigResponse,
      status: 'idle',
    });
  });

  // ── loadFromStorage ──────────────────────────────────────────────────────

  describe('loadFromStorage', () => {
    it('leaves defaults in place when nothing is cached', async () => {
      (configStorage.load as jest.Mock).mockResolvedValue(null);

      await useFeatureConfigStore.getState().loadFromStorage();

      expect(useFeatureConfigStore.getState().status).toBe('idle');
    });

    it('hydrates flags/config/status from a cached response', async () => {
      (configStorage.load as jest.Mock).mockResolvedValue(REMOTE_CONFIG);

      await useFeatureConfigStore.getState().loadFromStorage();

      const state = useFeatureConfigStore.getState();
      expect(state.status).toBe('ready');
      expect(state.config).toEqual(REMOTE_CONFIG);
      expect(state.flags.chatSection).toBe(false);
    });

    it('fail-opens a flag key missing from an older cached response', async () => {
      const cachedWithoutChat = { ...REMOTE_CONFIG, featureFlags: withoutFlag(REMOTE_CONFIG.featureFlags, 'chatSection') };
      (configStorage.load as jest.Mock).mockResolvedValue(cachedWithoutChat);

      await useFeatureConfigStore.getState().loadFromStorage();

      expect(useFeatureConfigStore.getState().isEnabled('chatSection')).toBe(true);
    });
  });

  // ── syncConfig ───────────────────────────────────────────────────────────

  describe('syncConfig', () => {
    it('adopts the remote config when its version is newer than the cached one', async () => {
      (configStorage.load as jest.Mock).mockResolvedValue(null);
      (configStorage.loadVersion as jest.Mock).mockResolvedValue(0);
      (fetchPublishedConfig as jest.Mock).mockResolvedValue({ ok: true, data: REMOTE_CONFIG });

      await useFeatureConfigStore.getState().syncConfig();

      expect(configStorage.save).toHaveBeenCalledWith(REMOTE_CONFIG);
      const state = useFeatureConfigStore.getState();
      expect(state.status).toBe('ready');
      expect(state.config).toEqual(REMOTE_CONFIG);
    });

    it('keeps the cached config when the remote version is not newer', async () => {
      (configStorage.load as jest.Mock).mockResolvedValue(REMOTE_CONFIG);
      (configStorage.loadVersion as jest.Mock).mockResolvedValue(5);
      (fetchPublishedConfig as jest.Mock).mockResolvedValue({ ok: true, data: REMOTE_CONFIG });

      await useFeatureConfigStore.getState().syncConfig();

      expect(configStorage.save).not.toHaveBeenCalled();
      const state = useFeatureConfigStore.getState();
      expect(state.status).toBe('ready');
      expect(state.config).toEqual(REMOTE_CONFIG);
    });

    it('stays ready on a fetch failure when a cached config already loaded', async () => {
      (configStorage.load as jest.Mock).mockResolvedValue(REMOTE_CONFIG);
      (fetchPublishedConfig as jest.Mock).mockResolvedValue({ ok: false, error: new Error('network down') });

      await useFeatureConfigStore.getState().syncConfig();

      expect(useFeatureConfigStore.getState().status).toBe('ready');
    });

    it('sets status to error on a fetch failure with no usable cached config', async () => {
      (configStorage.load as jest.Mock).mockResolvedValue(null);
      (fetchPublishedConfig as jest.Mock).mockResolvedValue({ ok: false, error: new Error('network down') });

      await useFeatureConfigStore.getState().syncConfig();

      expect(useFeatureConfigStore.getState().status).toBe('error');
    });
  });

  // ── isEnabled ────────────────────────────────────────────────────────────

  describe('isEnabled', () => {
    it('returns the stored flag value', () => {
      useFeatureConfigStore.setState({ flags: { ...defaultFeatureFlags, videoCallSection: false } });
      expect(useFeatureConfigStore.getState().isEnabled('videoCallSection')).toBe(false);
    });

    it('fail-opens (returns true) for a flag key absent from the current state', () => {
      const partialFlags = withoutFlag(defaultFeatureFlags, 'hmisReportingSection');
      useFeatureConfigStore.setState({ flags: partialFlags });
      expect(useFeatureConfigStore.getState().isEnabled('hmisReportingSection')).toBe(true);
    });
  });

});
