/**
 * Platform-agnostic half of apps/mobile/src/config/clients/types.ts.
 * The mobile ClientConfig also carries `assets: { logo: ImageSourcePropType, ... }`,
 * which has no equivalent on web — so `assets` is generic here (`TAsset`) and
 * each app supplies its own concrete asset type:
 *   - apps/mobile: `ClientBrandConfig<ImageSourcePropType>`
 *   - apps/web:    `ClientBrandConfig<string>` (an image URL/import path)
 */
export type AppEnvironment = 'development' | 'preview' | 'production';

export interface ServerUrls {
  authGatewayUrl: string;
  portalUrl: string;
  webrtcUrl: string;
  configUrl: string;
}

export interface ClientBrandConfig<TAsset> {
  /** Matches EXPO_PUBLIC_CLIENT_ID / VITE_CLIENT_ID and the registry key. */
  id: string;
  /** For logs/debug screens only — never shown to end users. */
  displayName: string;
  /** ISO 3166-1 alpha-2, e.g. 'NP' — deployment/locale identity. */
  countryCode: string;
  /** Default calendar system for date entry and display. */
  calendar: 'BS' | 'AD';
  /** Default i18n language, used before device/browser-locale detection. */
  locale: string;
  phone: {
    dialCode: string;
    flag: string;
    numberLength: number;
  };
  theme: {
    primary: string;
    primaryDark: string;
    secondary: string;
  };
  assets: {
    logo: TAsset;
    splashLogo?: TAsset;
    loginIcon?: TAsset;
  };
  /** This client's backend URLs, one set per environment tier. */
  servers: Record<AppEnvironment, ServerUrls>;
  branding: {
    showPoweredByLogo: boolean;
  };
}

/** Build a lookup registry from a list of configs, keyed by `id`. */
export function buildClientRegistry<TAsset>(
  configs: Array<ClientBrandConfig<TAsset>>,
): Record<string, ClientBrandConfig<TAsset>> {
  return Object.fromEntries(configs.map((c) => [c.id, c]));
}
