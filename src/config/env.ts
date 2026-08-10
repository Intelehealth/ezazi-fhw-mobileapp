import Constants from 'expo-constants';
import { clientConfig, type AppEnvironment } from './clients';

/**
 * Public, build-time env vars. Anything secret must NEVER live here —
 * use server-side env in the backend services instead.
 *
 * EXPO_PUBLIC_* vars are inlined into the JS bundle at build time.
 *
 * Server URLs are resolved as clientConfig × APP_ENV — each client defines
 * its own development/preview/production endpoints (src/config/clients);
 * this file just picks the right one for the current build.
 */
const APP_ENV = (process.env.EXPO_PUBLIC_APP_ENV ?? 'development') as AppEnvironment;
const servers = clientConfig.servers[APP_ENV] ?? clientConfig.servers.development;

export const env = {
  AUTH_GATEWAY_URL: servers.authGatewayUrl,
  PORTAL_URL: servers.portalUrl,
  WEBRTC_URL: servers.webrtcUrl,
  CONFIG_URL: servers.configUrl,

  APP_ENV,

  // FEATURE_FLAG_STAGE3 and FEATURE_FLAG_POSTPARTUM_MONITORING were here.
  // Replaced by remote config — use useFeatureConfigStore().isEnabled('stage3Features')
  // and isEnabled('postpartumMonitoring') instead.

  SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',

  APP_VERSION: Constants.expoConfig?.version ?? '0.0.0',
} as const;

export type Env = typeof env;
