import type { AppEnvironment } from '@ezazi/config';

function resolveAppEnv(): AppEnvironment {
  const raw = import.meta.env.VITE_APP_ENV;
  return raw === 'production' || raw === 'preview' ? raw : 'development';
}

const appEnv = resolveAppEnv();

/**
 * Typed `import.meta.env` wrapper (migration guide §3). Every server URL is
 * read straight from its VITE_* var (see .env.example) with NO placeholder
 * fallback — @ezazi/config's `DEFAULT_SERVERS` (packages/config/src/servers.ts)
 * used to backstop these with fake `dev.example.org`/`preview.example.org`
 * hosts so `npm run dev` booted without a .env.local, but a fake host that
 * silently resolves to nothing is worse than an empty string that fails
 * loudly the moment a call is made: it was a permanent standing invitation
 * to mistake "unset" for "configured but broken". AUTH_GATEWAY_URL and
 * OPENMRS_URL already have real confirmed values checked into .env; PORTAL_URL,
 * CONFIG_URL and MINDMAP_URL don't yet (their real hosts aren't confirmed —
 * see PORTAL_URL's own note in services/http.ts) and now surface that
 * honestly instead of masking it.
 */
export const env = {
  APP_ENV: appEnv,
  AUTH_GATEWAY_URL: import.meta.env.VITE_AUTH_GATEWAY_URL || '',
  PORTAL_URL: import.meta.env.VITE_PORTAL_URL || '',
  CONFIG_URL: import.meta.env.VITE_CONFIG_URL || '',
  // The OpenMRS REST API itself (`{host}/openmrs/ws/rest/v1`) — NOT
  // PORTAL_URL, which is EMR-Middleware's own `/portal-api` -> `/api`
  // (see vite.config.ts's dev proxy). services/profile.service.ts's
  // provider/person/attribute calls are direct OpenMRS calls, confirmed
  // against the real erevamp.intelehealth.org host (see .env).
  OPENMRS_URL: import.meta.env.VITE_OPENMRS_URL || '',
  // profile.component.ts's own environment.mindmapURL (a separate Node
  // service, `{base}:3004/api`) backs only the doctor-profile email/phone
  // "already exists" check (services/profile.service.ts's
  // validateProviderAttribute) — host not confirmed yet.
  MINDMAP_URL: import.meta.env.VITE_MINDMAP_URL || '',
  // No real per-client site key is checked into this repo (Angular's
  // envConfig.ezaziCaptchaSiteKey/nepalCaptchaSiteKey are generated at build
  // time from a secret, not source-controlled). Falls back to Google's
  // published "always passes" test key so the widget renders in dev — a
  // real, working value, unlike the removed URL fallbacks above.
  RECAPTCHA_SITE_KEY:
    import.meta.env.VITE_RECAPTCHA_SITE_KEY ||
    '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI',
  // Sub-path this app is served under when deployed behind a reverse proxy
  // (e.g. '/doctor-portal') — routes/app.routes.tsx's router `basename` and
  // vite.config.ts's own `base` both key off this. Empty string (the
  // default) means "served from the domain root", not "unconfigured" —
  // unlike the URL fields above, there's no meaningful "broken" state for
  // an unset base path.
  BASE_PATH: import.meta.env.VITE_BASE_PATH || '',
} as const;
