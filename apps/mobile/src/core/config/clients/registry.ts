import type { ClientConfig } from './types';
import { DEFAULT_CLIENT_CONFIG } from './default';
import { NEPAL_CLIENT_CONFIG } from './nepal';

/** Add one line here for every new client — nothing else needs to change. */
export const CLIENT_REGISTRY: Record<string, ClientConfig> = {
  [DEFAULT_CLIENT_CONFIG.id]: DEFAULT_CLIENT_CONFIG,
  [NEPAL_CLIENT_CONFIG.id]: NEPAL_CLIENT_CONFIG,
};
