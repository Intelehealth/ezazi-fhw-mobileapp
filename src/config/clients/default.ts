import type { ClientConfig } from './types';

/**
 * Fallback used when EXPO_PUBLIC_CLIENT_ID is unset or doesn't match a known
 * client — the app must never render with no theme. Brand values are the
 * original eZAZI revamp placeholder (teal), kept for any future/unbranded build.
 */
export const DEFAULT_CLIENT_CONFIG: ClientConfig = {
  id: 'default',
  displayName: 'eZAZI',
  countryCode: 'IN',
  calendar: 'AD',
  locale: 'en',
  phone: {
    dialCode: '+91',
    flag: '🇮🇳',
    numberLength: 10,
  },
  theme: {
    primary: '#2E1E91',
    primaryDark: '#241871',
    secondary: '#FD8C3E',
  },
  assets: {
    logo: require('../../../assets/clients/default/logo.png'),
    // Square E-emblem (432×432) used for both splash and login — avoids the text
    // logo appearing scattered at large sizes
    splashLogo: require('../../../assets/clients/default/icon_foreground.png'),
    loginIcon:  require('../../../assets/clients/default/login_icon.png'),
    logoSize: {
      splash: { phone: { width: 150, height: 150 }, tablet: { width: 280, height: 280 } },
      login:  { phone: { width: 56, height: 78, marginTop: 60, gapBelowIcon: 32 }, tablet: { width: 100, height: 140, marginTop: 80, gapBelowIcon: 40 } },
    },
  },
  servers: {
    development: {
      authGatewayUrl: 'http://localhost:3001',
      portalUrl: 'http://localhost:3002',
      webrtcUrl: 'http://localhost:3003',
      configUrl: 'http://localhost:3004',
    },
    // Placeholder hosts — replace with this client's real staging endpoints.
    preview: {
      authGatewayUrl: 'https://staging-auth.ezazi.example.org',
      portalUrl: 'https://staging-portal.ezazi.example.org',
      webrtcUrl: 'https://staging-webrtc.ezazi.example.org',
      configUrl: 'https://staging-config.ezazi.example.org',
    },
    // Placeholder hosts — replace with this client's real production endpoints.
    production: {
      authGatewayUrl: 'https://auth.ezazi.example.org',
      portalUrl: 'https://portal.ezazi.example.org',
      webrtcUrl: 'https://webrtc.ezazi.example.org',
      configUrl: 'https://config.ezazi.example.org',
    },
  },
  branding: {
    showPoweredByLogo: true,
  },
};
