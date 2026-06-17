import Constants from 'expo-constants';

/**
 * Public, build-time env vars. Anything secret must NEVER live here —
 * use server-side env in the backend services instead.
 *
 * EXPO_PUBLIC_* vars are inlined into the JS bundle at build time.
 */
export const env = {
  AUTH_GATEWAY_URL:
    process.env.EXPO_PUBLIC_AUTH_GATEWAY_URL ?? 'http://localhost:3001',
  PORTAL_URL: process.env.EXPO_PUBLIC_PORTAL_URL ?? 'http://localhost:3002',
  WEBRTC_URL: process.env.EXPO_PUBLIC_WEBRTC_URL ?? 'http://localhost:3003',
  CONFIG_URL: process.env.EXPO_PUBLIC_CONFIG_URL ?? 'http://localhost:3004',

  APP_ENV: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
  DEFAULT_COUNTRY: process.env.EXPO_PUBLIC_DEFAULT_COUNTRY ?? 'NP',
  DEFAULT_LOCALE: process.env.EXPO_PUBLIC_DEFAULT_LOCALE ?? 'en',
  DEFAULT_CALENDAR: process.env.EXPO_PUBLIC_DEFAULT_CALENDAR ?? 'BS',

  FEATURE_FLAG_STAGE3:
    (process.env.EXPO_PUBLIC_FEATURE_FLAG_STAGE3 ?? 'true') === 'true',
  FEATURE_FLAG_POSTPARTUM_MONITORING:
    (process.env.EXPO_PUBLIC_FEATURE_FLAG_POSTPARTUM_MONITORING ?? 'true') === 'true',

  SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',

  APP_VERSION: Constants.expoConfig?.version ?? '0.0.0',
} as const;

export type Env = typeof env;
