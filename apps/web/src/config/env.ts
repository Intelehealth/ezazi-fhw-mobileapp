import { DEFAULT_SERVERS, type AppEnvironment } from '@ezazi/config';

function resolveAppEnv(): AppEnvironment {
  const raw = import.meta.env.VITE_APP_ENV;
  return raw === 'production' || raw === 'preview' ? raw : 'development';
}

const appEnv = resolveAppEnv();
const servers = DEFAULT_SERVERS[appEnv];

/**
 * Typed `import.meta.env` wrapper (migration guide §3). Server URLs fall
 * back to @ezazi/config's `DEFAULT_SERVERS[appEnv]` — currently placeholder
 * example.org hosts, see packages/config/src/servers.ts — so the app boots
 * without a .env.local. Override via the VITE_* vars (see .env.example)
 * once the real eZAZI doctor-portal hosts are confirmed.
 */
export const env = {
  APP_ENV: appEnv,
  // Reverse-proxy path prefix this build is served under (e.g. erevamp's
  // `/intelehealth/`, whose proxy_pass strips the prefix before it reaches
  // this container — but the browser URL bar keeps it, so react-router's
  // basename must match it). Empty string = served at domain root.
  BASE_PATH: import.meta.env.VITE_BASE_PATH || '',
  AUTH_GATEWAY_URL:
    import.meta.env.VITE_AUTH_GATEWAY_URL || servers.authGatewayUrl,
  PORTAL_URL: import.meta.env.VITE_PORTAL_URL || servers.portalUrl,
  CONFIG_URL: import.meta.env.VITE_CONFIG_URL || servers.configUrl,
  // No real per-client site key is checked into this repo (Angular's
  // envConfig.ezaziCaptchaSiteKey/nepalCaptchaSiteKey are generated at build
  // time from a secret, not source-controlled). Falls back to Google's
  // published "always passes" test key so the widget renders in dev.
  RECAPTCHA_SITE_KEY:
    import.meta.env.VITE_RECAPTCHA_SITE_KEY ||
    '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI',
} as const;
