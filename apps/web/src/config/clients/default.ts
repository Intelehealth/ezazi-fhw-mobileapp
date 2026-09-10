import { DEFAULT_SERVERS, type ClientBrandConfig } from '@ezazi/config';
import ezaziLogo from '../../assets/ezazi/ezazi-logo-new.png';

/**
 * Fallback client — eZAZI's own branding. Used whenever VITE_CLIENT_ID is
 * unset or doesn't match a known client (see registry.ts) — matches
 * apps/mobile's own default.ts fallback convention (apps/mobile/src/config/
 * clients/default.ts), though that file predates @ezazi/config's
 * ClientBrandConfig and still uses its own local ClientConfig type; this
 * one uses the shared package's type directly, per this task's brief.
 */
export const DEFAULT_CLIENT_CONFIG: ClientBrandConfig<string> = {
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
    logo: ezaziLogo,
  },
  servers: DEFAULT_SERVERS,
  branding: {
    showPoweredByLogo: true,
  },
};
