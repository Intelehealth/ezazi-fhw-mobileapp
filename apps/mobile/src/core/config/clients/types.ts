import type { ImageSourcePropType } from 'react-native';

/** Backend tier — crossed with client to pick a concrete server set. */
export type AppEnvironment = 'development' | 'preview' | 'production';

export interface ServerUrls {
  authGatewayUrl: string;
  portalUrl: string;
  webrtcUrl: string;
  configUrl: string;
}

/**
 * Contract every client/country config must satisfy. Adding a new client
 * means adding one file that implements this interface — the compiler
 * enforces nothing is missed.
 */
export interface ClientConfig {
  /** Matches EXPO_PUBLIC_CLIENT_ID and the registry key. */
  id: string;
  /** For logs/debug screens only — never shown to end users. */
  displayName: string;
  /** ISO 3166-1 alpha-2, e.g. 'NP' — deployment/locale identity. */
  countryCode: string;
  /** Default calendar system for date entry and display. */
  calendar: 'BS' | 'AD';
  /** Default i18n language, used before device-locale detection. */
  locale: string;
  /** Phone-number input defaults (Forgot Password, patient registration, ...). */
  phone: {
    /** Dialing code with leading '+', e.g. '+977'. */
    dialCode: string;
    /** Flag emoji shown next to the dial code. */
    flag: string;
    /** Expected national number length (digits only). */
    numberLength: number;
  };
  /** Brand colors — everything else in theme.ts (status/risk colors) stays fixed. */
  theme: {
    primary: string;
    primaryDark: string;
    secondary: string;
  };
  assets: {
    /** In-app brand text/emblem logo (home screen header, etc.). */
    logo: ImageSourcePropType;
    /** Launch/splash screen icon — falls back to logo if absent. */
    splashLogo?: ImageSourcePropType;
    /** Login screen icon — falls back to logo if absent. */
    loginIcon?: ImageSourcePropType;
    /** Per-client logo container dimensions (dp). Screens fall back to Nepal values if absent. */
    logoSize?: {
      splash: { phone: { width: number; height: number }; tablet: { width: number; height: number } };
      login:  { phone: { width: number; height: number; marginTop?: number; gapBelowIcon?: number }; tablet: { width: number; height: number; marginTop?: number; gapBelowIcon?: number } };
    };
  };
  /** This client's backend URLs, one set per environment tier. */
  servers: Record<AppEnvironment, ServerUrls>;
  branding: {
    /** Whether the "from [intelehealth]" mark shows on the splash screen. */
    showPoweredByLogo: boolean;
  };
}
