import { DEFAULT_CLIENT_CONFIG } from './default';
import { CLIENT_REGISTRY } from './registry';

export type { ClientConfig, AppEnvironment, ServerUrls } from './types';

/**
 * Build-time client selector — the RN equivalent of an Android product
 * flavor. EXPO_PUBLIC_CLIENT_ID is inlined into the JS bundle at build time
 * (see eas.json build profiles), so the resolved config below is available
 * synchronously from first render with no network call and no risk of a
 * missing/blank theme when the device is offline.
 */
const requestedId = process.env.EXPO_PUBLIC_CLIENT_ID ?? DEFAULT_CLIENT_CONFIG.id;

export const clientConfig = CLIENT_REGISTRY[requestedId] ?? DEFAULT_CLIENT_CONFIG;
export const CLIENT_ID = clientConfig.id;
