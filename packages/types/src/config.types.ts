/**
 * Backend "app config" response shape — used by both apps' bootstrap fetch
 * (mobile: src/services/api/config.api.ts, web: services/config.service.ts).
 * Keep this the single source of truth instead of two hand-maintained copies.
 */
export interface AppConfig {
  featureFlags: Record<string, boolean>;
  captcha: {
    enabled: boolean;
    siteKey?: string;
  };
  // Extend as the real backend contract is confirmed — this is a starting
  // point, not a finished mirror of the API.
}
