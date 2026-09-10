import { NEPAL_SERVERS, type ClientBrandConfig } from '@ezazi/config';
import jhpiegoLogo from '../../assets/nepal/jhpiego-removebg-preview.png';

/**
 * Nepal client — matches apps/mobile/src/config/clients/nepal.ts's brand
 * values (theme colors, phone defaults); servers come from @ezazi/config's
 * NEPAL_SERVERS rather than being re-declared locally, per this task's brief.
 */
export const NEPAL_CLIENT_CONFIG: ClientBrandConfig<string> = {
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
    logo: jhpiegoLogo,
  },
  servers: NEPAL_SERVERS,
  branding: {
    showPoweredByLogo: false,
  },
};
