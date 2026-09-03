import { create } from 'zustand';
import { fetchPublishedConfig } from '@/services/api/config.api';
import { configStorage } from '@/services/storage/config-storage';
import {
  type ConfigResponse,
  type FeatureFlags,
  defaultFeatureFlags,
  defaultConfigResponse,
} from '@/types/config.types';
import { logger } from '@/utils/logger';

export type ConfigSyncStatus = 'idle' | 'ready' | 'error';

interface FeatureConfigState {
  flags: FeatureFlags;
  config: ConfigResponse;
  status: ConfigSyncStatus;

  /**
   * Load persisted config from AsyncStorage immediately.
   * Called first in syncConfig — unblocks the UI before any network request.
   */
  loadFromStorage: () => Promise<void>;

  /**
   * Full sync: serve cache immediately, then re-validate against the API in the
   * background. Follows the stale-while-revalidate pattern — UI is never blocked
   * waiting for a network call.
   */
  syncConfig: () => Promise<void>;

  /** Returns true when the flag is enabled, and true when config is not yet loaded (fail-open). */
  isEnabled: (key: keyof FeatureFlags) => boolean;
}

export const useFeatureConfigStore = create<FeatureConfigState>((set, get) => ({
  flags: defaultFeatureFlags,
  config: defaultConfigResponse,
  status: 'idle',

  loadFromStorage: async () => {
    const cached = await configStorage.load();
    if (cached) {
      set({
        // Spread defaultFeatureFlags first so any flags added after the cached
        // version was stored still resolve to true (fail-open for new flags)
        flags: { ...defaultFeatureFlags, ...cached.featureFlags },
        config: cached,
        status: 'ready',
      });
    }
  },

  syncConfig: async () => {
    // Step 1 — serve cache instantly (no network wait)
    await get().loadFromStorage();

    // Step 2 — fetch from API; update only if server has a newer version
    const result = await fetchPublishedConfig();
    if (!result.ok) {
      logger.debug('[FeatureConfig] Sync failed — using cached/default flags', result.error);
      // Only set error status if we have no usable config at all
      set(s => (s.status !== 'ready' ? { ...s, status: 'error' } : s));
      return;
    }

    const remote = result.data;
    const cachedVersion = await configStorage.loadVersion();

    if (remote.configVersion > cachedVersion) {
      await configStorage.save(remote);
      set({
        flags: { ...defaultFeatureFlags, ...remote.featureFlags },
        config: remote,
        status: 'ready',
      });
    } else {
      // Remote version same or older — cached copy is current; ensure status is ready
      set(s => ({ ...s, status: 'ready' }));
    }
  },

  isEnabled: (key) => {
    // ?? true ensures any flag key added to the interface but absent in an
    // older cached response still defaults to enabled (fail-open)
    return get().flags[key] ?? true;
  },
}));
