/**
 * Dynamic Expo config — required (over app.json) so app name/icon/splash can
 * vary per client at build time via EXPO_PUBLIC_CLIENT_ID, the same variable
 * that selects src/config/clients/* at runtime.
 *
 * Native-facing fields only. Kept deliberately separate from
 * src/config/clients (which is bundled by Metro into the JS runtime) since
 * this file is evaluated by plain Node during `expo prebuild`/`eas build`,
 * not by Metro — it cannot use the '@/' path alias or import TS modules.
 *
 * Nepal and eZAZI (default) are the SAME app (one package/bundle identifier),
 * just reskinned per build — not separate store listings.
 */
const CLIENT_ID = process.env.EXPO_PUBLIC_CLIENT_ID ?? 'nepal';

const CLIENT_NATIVE = {
  nepal: {
    name: 'eLCG नेपाल',
    icon: './assets/clients/nepal/icon_rounded.png',
    splashImage: './assets/clients/nepal/splash.png',
    adaptiveIcon: './assets/clients/nepal/icon_adaptive_fg.png',
    themeColor: '#1F6F78',
  },
  default: {
    name: 'eZAZI',
    icon: './assets/clients/default/icon_white_bg.png',
    splashImage: './assets/clients/default/splash.png',
    adaptiveIcon: './assets/clients/default/icon_foreground.png',
    themeColor: '#FFFFFF',
  },
};

const client = CLIENT_NATIVE[CLIENT_ID] ?? CLIENT_NATIVE.default;

module.exports = {
  expo: {
    name: client.name,
    slug: 'ezazi-fhw-mobileapp',
    version: '0.1.0',
    scheme: 'ezazi-fhw',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    // Keep OLD architecture until the WatermelonDB→Drizzle swap (Phase 4).
    // New Arch becomes default-ON at SDK 53; WMDB 0.28 can't run on it, so pin it off.
    newArchEnabled: false,
    icon: client.icon,
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'org.intelehealth.ezazi',
      buildNumber: '1',
      infoPlist: {
        NSCameraUsageDescription: 'We need camera access to capture patient photos for ward verification.',
        NSFaceIDUsageDescription: 'Authenticate with Face ID to unlock the app.',
        NSLocationWhenInUseUsageDescription: 'Location helps us tag the facility you are working from.',
      },
    },
    android: {
      package: 'org.intelehealth.ezazi',
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: client.adaptiveIcon,
        backgroundColor: client.themeColor,
      },
      permissions: [
        'CAMERA',
        'READ_CONTACTS',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'READ_MEDIA_IMAGES',
        'POST_NOTIFICATIONS',
        'USE_BIOMETRIC',
        'USE_FINGERPRINT',
        'READ_SMS',
        'RECEIVE_SMS',
      ],
    },
    plugins: [
      [
        'expo-splash-screen',
        {
          image: client.splashImage,
          resizeMode: 'contain',
          backgroundColor: '#FFFFFF',
        },
      ],
      'expo-asset',
      'expo-sqlite',
      'expo-localization',
      'expo-secure-store',
      'expo-local-authentication',
    ],
    extra: {},
  },
};
