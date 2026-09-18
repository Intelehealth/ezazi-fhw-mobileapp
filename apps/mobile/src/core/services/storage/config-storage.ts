import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ConfigResponse } from '@/core/config/config.types';

const CONFIG_KEY = 'feature_config';
const CONFIG_VERSION_KEY = 'feature_config_version';

/**
 * AsyncStorage persistence for the remote feature config.
 * Intentionally separate from secure-storage.ts (Keychain) —
 * feature flags are not sensitive and benefit from synchronous-ish reads.
 */
export const configStorage = {
  async save(config: ConfigResponse): Promise<void> {
    await Promise.all([
      AsyncStorage.setItem(CONFIG_KEY, JSON.stringify(config)),
      AsyncStorage.setItem(CONFIG_VERSION_KEY, String(config.configVersion)),
    ]);
  },

  /** Returns null if no config stored yet or if stored JSON is corrupted. */
  async load(): Promise<ConfigResponse | null> {
    try {
      const raw = await AsyncStorage.getItem(CONFIG_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as ConfigResponse;
    } catch {
      // Corrupted storage — wipe and let the caller re-fetch
      await configStorage.clear();
      return null;
    }
  },

  async loadVersion(): Promise<number> {
    try {
      const v = await AsyncStorage.getItem(CONFIG_VERSION_KEY);
      return v ? parseInt(v, 10) : 0;
    } catch {
      return 0;
    }
  },

  async clear(): Promise<void> {
    await AsyncStorage.multiRemove([CONFIG_KEY, CONFIG_VERSION_KEY]);
  },
};
