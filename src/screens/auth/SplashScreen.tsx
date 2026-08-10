import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { PermissionDeniedDialog } from '@/components/PermissionDeniedDialog';
import { wavePaths } from '@/components/ui/icons';
import { clientConfig } from '@/config/clients';
import { colors } from '@/config/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { useAuthStore } from '@/stores/auth.store';
import {
  checkAppPermissions,
  onAppForeground,
  openAppSettings,
  requestAppPermissions,
} from '@/utils/permissions';

// Powered-by logo — shared across all clients, not part of client branding.
const IH_LOGO = require('../../../assets/intelehealth_logo.png');

// ─── Permission state ─────────────────────────────────────────────────────────

type PermState =
  | 'idle'            // not yet requested
  | 'requesting'      // system dialog open
  | 'granted'         // all permissions OK → bootstrap started
  | 'denied'          // at least one denied, can retry
  | 'never_ask_again' // at least one permanently denied → must go to Settings

// ─── Component ───────────────────────────────────────────────────────────────
export const SplashScreen: React.FC = () => {
  const { t } = useTranslation();
  const bootstrap = useAuthStore((s) => s.bootstrap);

  const [permState, setPermState] = useState<PermState>('idle');
  // Guard so bootstrap() is called exactly once even if requestPermissions is retried
  const bootstrapCalled = useRef(false);

  // ── Permission request ────────────────────────────────────────────────────
  const startBootstrap = useCallback(() => {
    if (!bootstrapCalled.current) {
      bootstrapCalled.current = true;
      // bootstrap() always calls set() — either success or catch branch.
      // Use void intentionally: status update is handled inside the store.
      void bootstrap();
    }
  }, [bootstrap]);

  const requestPermissions = useCallback(async () => {
    setPermState('requesting');
    try {
      const result = await requestAppPermissions();

      if (result === 'granted') {
        setPermState('granted');
        startBootstrap();
      } else if (result === 'never_ask_again') {
        setPermState('never_ask_again');
      } else {
        setPermState('denied');
      }
    } catch {
      // PermissionsAndroid.requestMultiple can throw in rare cases
      // (e.g. called from background, device-specific API errors).
      // Treat as granted so the app is never permanently stuck.
      setPermState('granted');
      startBootstrap();
    }
  }, [startBootstrap]);

  // ── Check permissions when returning from the Settings app ───────────────
  const checkAfterSettings = useCallback(async () => {
    if (permState !== 'never_ask_again') return;
    try {
      const result = await checkAppPermissions();
      if (result === 'granted') {
        setPermState('granted');
        startBootstrap();
      }
      // still denied → dialog stays visible
    } catch {
      // treat check error as granted (unblock the app)
      setPermState('granted');
      startBootstrap();
    }
  }, [permState, startBootstrap]);

  // ── Kick off permission request on mount ─────────────────────────────────
  useEffect(() => {
    void requestPermissions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Subscribe to app-foreground event (user returns from Settings) ────────
  useEffect(() => {
    if (permState !== 'never_ask_again') return;
    const unsubscribe = onAppForeground(() => void checkAfterSettings());
    return unsubscribe;
  }, [permState, checkAfterSettings]);

  // ── Hardware back-button: exit app when dialog is showing ─────────────────
  useEffect(() => {
    if (permState !== 'denied' && permState !== 'never_ask_again') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      BackHandler.exitApp();
      return true;
    });
    return () => sub.remove();
  }, [permState]);

  // ─────────────────────────────────────────────────────────────────────────

  const { width, height, isTablet } = useResponsive();

  // ── Logo dimensions — per-client (dimens.xml); falls back to Nepal values ──
  // SplashActivity.java: logo.setScaleX(1.3f); logo.setScaleY(1.3f)
  const _splashSize = clientConfig.assets.logoSize?.splash;
  const LOGO_W     = _splashSize ? (isTablet ? _splashSize.tablet.width  : _splashSize.phone.width)  : (isTablet ? 280 : 240);
  const LOGO_H     = _splashSize ? (isTablet ? _splashSize.tablet.height : _splashSize.phone.height) : (isTablet ? 250 : 200);
  const LOGO_SCALE = 1.3;

  // ── Intelehealth logo (from dimens.xml → power_by_logo_width/height) ──
  const IH_W       = isTablet ? 240 : 100;
  const IH_H       = isTablet ? 90  : 38;
  // drawablePadding (negative = logo overlaps text) — phone: -8dp, tablet: -20dp
  const IH_OVERLAP = isTablet ? -20 : -8;

  // ── Wave heights proportional to screen width ──
  const WAVE_REGION_H = width * (282 / 800);

  const logoTop = (height - (LOGO_H * LOGO_SCALE)) / 2;

  const dialogVisible = permState === 'denied' || permState === 'never_ask_again';

  return (
    <View style={styles.root}>

      {/* ── Waves — absolutely at bottom, declared first → behind logo & text ── */}
      <View style={[styles.waveContainer, { height: WAVE_REGION_H }]}>

        <Svg
          viewBox={wavePaths.splashLight.viewBox}
          preserveAspectRatio="none"
          width={width}
          height={WAVE_REGION_H}
          style={StyleSheet.absoluteFill}
        >
          <Path d={wavePaths.splashLight.d} fill={colors.wavePink} fillOpacity={0.39} />
        </Svg>

        <Svg
          viewBox={wavePaths.splashDark.viewBox}
          preserveAspectRatio="none"
          width={width}
          height={WAVE_REGION_H}
          style={StyleSheet.absoluteFill}
        >
          <Path d={wavePaths.splashDark.d} fill={colors.wavePinkDark} fillOpacity={0.39} />
        </Svg>

      </View>

      {/* ── Logo ── */}
      <Image
        source={clientConfig.assets.splashLogo ?? clientConfig.assets.logo}
        style={[
          styles.logo,
          {
            top:    logoTop,
            width:  LOGO_W,
            height: LOGO_H,
            transform: [{ scale: LOGO_SCALE }],
          },
        ]}
        resizeMode="contain"
      />

      {/* ── Bottom text — on top of waves ── */}
      <View
        style={[
          styles.bottomSection,
          { paddingBottom: isTablet ? 24 : 8 },
        ]}
      >
        <Text style={styles.tagline}>{t('splash.tagline')}</Text>

        <Text style={[styles.fromText, { marginBottom: IH_OVERLAP }]}>
          {t('splash.from')}
        </Text>

        <Image
          source={IH_LOGO}
          style={{ width: IH_W, height: IH_H }}
          resizeMode="contain"
        />
      </View>

      {/* ── Permission denied dialog — rendered on top of splash ── */}
      <PermissionDeniedDialog
        visible={dialogVisible}
        isPermanentlyDenied={permState === 'never_ask_again'}
        onRetry={requestPermissions}
        onOpenSettings={openAppSettings}
        onClose={() => BackHandler.exitApp()}
      />

    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.splash_bg,
  },

  waveContainer: {
    position: 'absolute',
    bottom: 0,
    left:   0,
    right:  0,
  },

  logo: {
    position:  'absolute',
    alignSelf: 'center',
    top: '50%',
  },

  bottomSection: {
    position:   'absolute',
    bottom:     40,
    left:       0,
    right:      0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  // 14sp, colorPrimary, center, lineSpacingExtra 2dp
  tagline: {
    color:       colors.primary,
    fontSize:    14,
    textAlign:   'center',
    lineHeight:  14 + 2 + 6,
    marginBottom: 16,
  },

  fromText: {
    color:     colors.primary,
    fontSize:  14,
    textAlign: 'center',
  },
});
