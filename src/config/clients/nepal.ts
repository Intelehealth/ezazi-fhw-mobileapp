import type { ClientConfig } from './types';

export const NEPAL_CLIENT_CONFIG: ClientConfig = {
  id: 'nepal',
  displayName: 'eLCG Nepal',
  countryCode: 'NP',
  calendar: 'BS',
  locale: 'en',
  phone: {
    dialCode: '+977',
    flag: '🇳🇵',
    numberLength: 10,
  },
  theme: {
    primary: '#1F6F78',
    primaryDark: '#15565D',
    secondary: '#FD8C3E',
  },
  assets: {
    logo: require('../../../assets/clients/nepal/logo.png'),
    logoSize: {
      splash: { phone: { width: 240, height: 200 }, tablet: { width: 280, height: 250 } },
      login:  { phone: { width: 300, height: 280 }, tablet: { width: 340, height: 340 } },
    },
  },
  servers: {
    development: {
      authGatewayUrl: 'http://localhost:3001',
      portalUrl: 'http://localhost:3002',
      webrtcUrl: 'http://localhost:3003',
      configUrl: 'http://localhost:3004',
    },
    // Placeholder hosts — replace with the real Nepal staging endpoints.
    preview: {
      authGatewayUrl: 'https://staging-auth.nepal.example.org',
      portalUrl: 'https://staging-portal.nepal.example.org',
      webrtcUrl: 'https://staging-webrtc.nepal.example.org',
      configUrl: 'https://staging-config.nepal.example.org',
    },
    // Placeholder hosts — replace with the real Nepal production endpoints.
    production: {
      authGatewayUrl: 'https://auth.nepal.example.org',
      portalUrl: 'https://portal.nepal.example.org',
      webrtcUrl: 'https://webrtc.nepal.example.org',
      configUrl: 'https://config.nepal.example.org',
    },
  },
  branding: {
    showPoweredByLogo: false,
  },
};
