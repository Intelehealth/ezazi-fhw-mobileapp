import { DEFAULT_CLIENT_CONFIG } from './default';
import { CLIENT_REGISTRY } from './registry';

export type { ClientBrandConfig } from '@ezazi/config';

/**
 * Build-time client selector — mirrors apps/mobile's own
 * EXPO_PUBLIC_CLIENT_ID pattern (apps/mobile/src/config/clients/index.ts).
 * Angular's session.component.ts instead sniffs the deployed hostname
 * (`environment.client === 'nepal'`) at runtime; this app follows the
 * sibling mobile app's build-time-per-deployment convention instead, since
 * that's already the established pattern in this monorepo.
 */
const requestedId = import.meta.env.VITE_CLIENT_ID ?? DEFAULT_CLIENT_CONFIG.id;

export const clientConfig =
  CLIENT_REGISTRY[requestedId] ?? DEFAULT_CLIENT_CONFIG;
export const CLIENT_ID = clientConfig.id;
