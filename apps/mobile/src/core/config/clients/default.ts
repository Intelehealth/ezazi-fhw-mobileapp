import type { ClientConfig } from './types';

/**
 * Fallback used when EXPO_PUBLIC_CLIENT_ID is unset or doesn't match a known
 * client — the app must never render with no theme. Brand values are the
 * original eZAZI revamp placeholder (teal), kept for any future/unbranded build.
 */
export const DEFAULT_CLIENT_CONFIG: ClientConfig = {
  id: 'default',
  // Casing matches the Splash "Loading Ezazi..." copy (Figma splash design) —
  // this is displayName's only consumer today (SplashScreen.tsx).
  displayName: 'Ezazi',
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
    logo: require('../../../../assets/clients/default/logo.png'),
    // Wordmark recolored for the dark splash background: #2E1E91 ink -> white,
    // #ED1A56 accent curl kept pink. Pixel-remapped from logo.png (two flat
    // colors, no gradients) — regenerate the same way if logo.png changes.
    splashLogo: require('../../../../assets/clients/default/logo_on_dark.png'),
    loginIcon:  require('../../../../assets/clients/default/login_icon.png'),
    setupLogo:  require('../../../../assets/clients/default/setup_logo.png'),
    // Figma export: Ezazi Developer File / Group.png (shield + padlock badge)
    forgotPasswordShield: require('../../../../assets/clients/default/forgot_password_shield.png'),
    logoSize: {
      splash: { phone: { width: 150, height: 150 }, tablet: { width: 280, height: 280 } },
      login:  { phone: { width: 56, height: 78, marginTop: 60, gapBelowIcon: 32 }, tablet: { width: 100, height: 140, marginTop: 80, gapBelowIcon: 40 } },
    },
  },
  servers: {
    development: {
      authGatewayUrl: 'https://erevamp.intelehealth.org:3030',
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
