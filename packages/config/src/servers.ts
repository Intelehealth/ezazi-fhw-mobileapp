import type { AppEnvironment, ServerUrls } from './client-config.types';

/**
 * The URL/theme/phone/locale data is identical on mobile and web — only the
 * image assets differ. Keep that data here, once, and have each app's own
 * client-config file (apps/mobile/src/config/clients/*, apps/web/src/config/clients/*)
 * import it and attach its own `assets`.
 *
 * Fill in the real dev/preview/production URLs per client below.
 */
export const NEPAL_SERVERS: Record<AppEnvironment, ServerUrls> = {
  development: {
    authGatewayUrl: 'https://dev.example.org/auth',
    portalUrl: 'https://dev.example.org/portal-api',
    webrtcUrl: 'https://dev.example.org/webrtc',
    configUrl: 'https://dev.example.org/config',
  },
  preview: {
    authGatewayUrl: 'https://preview.example.org/auth',
    portalUrl: 'https://preview.example.org/portal-api',
    webrtcUrl: 'https://preview.example.org/webrtc',
    configUrl: 'https://preview.example.org/config',
  },
  production: {
    authGatewayUrl: 'https://api.example.org/auth',
    portalUrl: 'https://api.example.org/portal-api',
    webrtcUrl: 'https://api.example.org/webrtc',
    configUrl: 'https://api.example.org/config',
  },
};

export const DEFAULT_SERVERS: Record<AppEnvironment, ServerUrls> = NEPAL_SERVERS;
